import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import Papa from 'papaparse'
import toast from 'react-hot-toast'

export function useContatos() {
  const { user, membrosEquipe } = useAuth()
  const [contatos, setContatos] = useState([])
  const [loading, setLoading] = useState(false)
  const [totalContatos, setTotalContatos] = useState(0)
  const [listaSelecionada, setListaSelecionada] = useState(null)
  
  const carregadoRef = useRef(false)
  const timeoutRef = useRef(null)
  const isMounted = useRef(true)

  // ===== VERIFICAR SE É ADMIN =====
  const isAdmin = user?.email === 'closermatheus@gmail.com'

  useEffect(() => {
    isMounted.current = true
    return () => {
      isMounted.current = false
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  // ===== ENRIQUECER CONTATO COM INFORMAÇÕES ADICIONAIS =====
  const enriquecerContato = (contato) => {
    const statusPorUsuario = contato.status_por_usuario || {}
    
    const quemAbordou = membrosEquipe.map(membro => {
      const status = statusPorUsuario[membro.id]
      return {
        ...membro,
        abordou: !!status,
        status: status || 'nao_abordado',
        data: contato[`ultima_interacao_${membro.id}`] || null
      }
    })

    const totalAbordagens = quemAbordou.filter(m => m.abordou).length

    return {
      ...contato,
      quemAbordou,
      totalAbordagens
    }
  }

  // ===== CARREGAR CONTATOS =====
  const carregarContatos = useCallback(async (filtros = {}, page = 1, limit = 25) => {
    if (!user?.equipeId) {
      if (isMounted.current) {
        setContatos([])
        setTotalContatos(0)
        setLoading(false)
      }
      return
    }
    
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }
    
    setLoading(true)
    
    timeoutRef.current = setTimeout(async () => {
      try {
        const offset = (page - 1) * limit

        let query = supabase
          .from('contatos')
          .select('*', { count: 'exact' })
          .eq('equipe_id', user.equipeId)
          .is('deletado_em', null)

        // ===== FILTROS =====
        if (filtros.listaId) {
          query = query.eq('lista_id', filtros.listaId)
        }
        
        if (filtros.status && filtros.status !== 'todos') {
          query = query.eq('status', filtros.status)
        }
        
        if (filtros.origem && filtros.origem !== 'todos') {
          query = query.eq('origem', filtros.origem)
        }
        
        if (filtros.vendedorId) {
          query = query.eq('criado_por', filtros.vendedorId)
        }
        
        if (filtros.tipoFinanciamento) {
          query = query.eq('tipo_financiamento', filtros.tipoFinanciamento)
        }
        
        if (filtros.busca) {
          const termo = filtros.busca
          query = query.or(`nome.ilike.%${termo}%,telefone.ilike.%${termo}%,email.ilike.%${termo}%,veiculo_interesse.ilike.%${termo}%`)
        }

        // ===== ORDENAÇÃO =====
        if (filtros.ordenacao) {
          switch (filtros.ordenacao) {
            case 'nome':
              query = query.order('nome', { ascending: true })
              break
            case 'nome_desc':
              query = query.order('nome', { ascending: false })
              break
            case 'valor_veiculo':
              query = query.order('valor_veiculo', { ascending: false })
              break
            case 'status':
              query = query.order('status')
              break
            case 'data_antiga':
              query = query.order('data_criacao', { ascending: true })
              break
            default:
              query = query.order('data_criacao', { ascending: false })
          }
        } else {
          query = query.order('data_criacao', { ascending: false })
        }

        query = query.range(offset, offset + limit - 1)

        const { data, error, count } = await query

        if (error) throw error

        if (isMounted.current) {
          setTotalContatos(count || 0)

          // Enriquecer com nomes dos vendedores
          const contatosEnriquecidos = await Promise.all(
            (data || []).map(async (contato) => {
              let vendedorNome = ''
              if (contato.criado_por) {
                const { data: vendedor } = await supabase
                  .from('usuarios')
                  .select('nome')
                  .eq('id', contato.criado_por)
                  .single()
                if (vendedor) vendedorNome = vendedor.nome
              }
              return {
                ...contato,
                vendedor_nome: vendedorNome
              }
            })
          )

          setContatos(contatosEnriquecidos)
        }
      } catch (error) {
        console.error('Erro ao carregar contatos:', error)
        if (isMounted.current) {
          toast.error('Erro ao carregar contatos')
          setContatos([])
          setTotalContatos(0)
        }
      } finally {
        if (isMounted.current) {
          setLoading(false)
        }
        timeoutRef.current = null
      }
    }, 300)
  }, [user])

  // ===== ATUALIZAR STATUS =====
  const atualizarStatus = async (contatoId, novoStatus) => {
    try {
      const agora = new Date().toISOString()

      const { data: contato, error: fetchError } = await supabase
        .from('contatos')
        .select('status_por_usuario, status')
        .eq('id', contatoId)
        .single()

      if (fetchError) throw fetchError

      const statusAtual = contato?.status_por_usuario || {}
      statusAtual[user.uid] = novoStatus

      const { error: updateError } = await supabase
        .from('contatos')
        .update({
          status_por_usuario: statusAtual,
          ultima_interacao: agora,
          ultimo_contato: agora,
          status: novoStatus
        })
        .eq('id', contatoId)

      if (updateError) throw updateError

      // Registrar no histórico
      await supabase
        .from('historico_interacoes')
        .insert({
          contato_id: contatoId,
          usuario_id: user.uid,
          usuario_nome: user.nome || user.email,
          tipo: 'status',
          descricao: `Mudou status para: ${novoStatus}`,
          data: agora
        })

      toast.success(`Status atualizado para: ${novoStatus}`)
      await carregarContatos()
      return true
    } catch (error) {
      console.error('Erro ao atualizar status:', error)
      toast.error('Erro ao atualizar status')
      return false
    }
  }

  // ===== ATUALIZAR FECHAMENTO =====
  const atualizarFechamento = async (contatoId, valorFechado, comissaoPercentual, dataPagamento) => {
    try {
      const agora = new Date().toISOString()

      const { data: contato, error: fetchError } = await supabase
        .from('contatos')
        .select('status_por_usuario')
        .eq('id', contatoId)
        .single()

      if (fetchError) throw fetchError

      const statusAtual = contato?.status_por_usuario || {}
      statusAtual[user.uid] = 'contrato_fechado'

      const { error } = await supabase
        .from('contatos')
        .update({
          valor_fechado: valorFechado,
          comissao_percentual: comissaoPercentual,
          data_pagamento: dataPagamento,
          status: 'contrato_fechado',
          status_por_usuario: statusAtual,
          ultima_interacao: agora,
          ultimo_contato: agora
        })
        .eq('id', contatoId)

      if (error) throw error

      await supabase
        .from('historico_interacoes')
        .insert({
          contato_id: contatoId,
          usuario_id: user.uid,
          usuario_nome: user.nome || user.email,
          tipo: 'fechamento',
          descricao: `Fechou no valor de R$ ${valorFechado} com ${comissaoPercentual}% de comissão`,
          data: agora
        })

      toast.success('Fechamento registrado!')
      await carregarContatos()
      return true
    } catch (error) {
      console.error('Erro ao registrar fechamento:', error)
      toast.error('Erro ao registrar fechamento')
      return false
    }
  }

  // ===== ADICIONAR ANOTAÇÃO =====
  const adicionarAnotacao = async (contatoId, anotacao) => {
    try {
      const agora = new Date().toISOString()

      const { error } = await supabase
        .from('historico_interacoes')
        .insert({
          contato_id: contatoId,
          usuario_id: user.uid,
          usuario_nome: user.nome || user.email,
          tipo: 'anotacao',
          descricao: anotacao,
          data: agora
        })

      if (error) throw error

      await supabase
        .from('contatos')
        .update({
          ultima_interacao: agora,
          ultimo_contato: agora
        })
        .eq('id', contatoId)

      toast.success('Anotação adicionada!')
      await carregarContatos()
      return true
    } catch (error) {
      console.error('Erro ao adicionar anotação:', error)
      toast.error('Erro ao adicionar anotação')
      return false
    }
  }

  // ===== EXCLUIR CONTATO (SOFT DELETE) =====
  const excluirContato = async (contatoId) => {
    if (!isAdmin) {
      toast.error('Apenas administradores podem excluir contatos')
      return false
    }

    try {
      const { error } = await supabase
        .from('contatos')
        .update({ 
          deletado_em: new Date().toISOString(),
          deletado_por: user.uid
        })
        .eq('id', contatoId)

      if (error) throw error

      toast.success('Contato movido para lixeira!')
      await carregarContatos()
      return true
    } catch (error) {
      console.error('Erro ao excluir:', error)
      toast.error('Erro ao excluir contato')
      return false
    }
  }

  // ===== RESTAURAR CONTATO =====
  const restaurarContato = async (contatoId) => {
    try {
      const { error } = await supabase
        .from('contatos')
        .update({ 
          deletado_em: null,
          deletado_por: null
        })
        .eq('id', contatoId)

      if (error) throw error

      toast.success('Contato restaurado!')
      await carregarContatos()
      return true
    } catch (error) {
      console.error('Erro ao restaurar:', error)
      toast.error('Erro ao restaurar contato')
      return false
    }
  }

  // ===== IMPORTAR CONTATOS =====
  const parseCSV = (file) => {
    return new Promise((resolve, reject) => {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        encoding: 'UTF-8',
        complete: (results) => {
          const contatosParseados = results.data
            .filter(row => {
              const nome = row['Nome'] || row['First Name'] || row['nome'] || ''
              const telefone = row['Telefone'] || row['Phone'] || row['telefone'] || ''
              return nome.trim() || telefone.trim()
            })
            .map(row => {
              const nome = row['Nome'] || row['First Name'] || row['nome'] || ''
              const telefone = row['Telefone'] || row['Phone'] || row['telefone'] || ''
              const email = row['e-mail'] || row['Email'] || row['email'] || ''
              const origem = row['Origem'] || row['origem'] || 'trafego_pago'
              const veiculo = row['Veículo'] || row['Veiculo'] || row['veiculo_interesse'] || ''
              const valor = parseFloat(row['Valor'] || row['valor_veiculo'] || 0)
              const status = row['Status'] || row['status'] || 'lead_entrou'

              return {
                nome: nome.trim(),
                telefone: telefone.toString().replace(/\D/g, '') || '',
                email: email.trim(),
                origem: origem.trim().toLowerCase(),
                veiculo_interesse: veiculo.trim(),
                valor_veiculo: valor,
                status: status.trim().toLowerCase(),
                data_criacao: new Date().toISOString(),
                link_whatsapp: telefone ? `https://wa.me/55${telefone.replace(/\D/g, '')}` : '',
                equipe_id: user.equipeId,
                criado_por: user.uid,
                status_por_usuario: {},
                criado_em: new Date().toISOString()
              }
            })

          resolve(contatosParseados)
        },
        error: (error) => reject(error)
      })
    })
  }

  const importarContatos = async (file, listaId = null) => {
    if (!user?.equipeId) {
      toast.error('Equipe não encontrada')
      return { sucesso: 0, duplicados: 0, erros: 0 }
    }

    try {
      const novosContatos = await parseCSV(file)

      const contatosComLista = novosContatos.map(contato => ({
        ...contato,
        lista_id: listaId
      }))

      const { data: existentes } = await supabase
        .from('contatos')
        .select('telefone')
        .eq('equipe_id', user.equipeId)

      const telefonesExistentes = new Set((existentes || []).map(c => c.telefone))

      const paraImportar = []
      let duplicados = 0

      for (const contato of contatosComLista) {
        if (telefonesExistentes.has(contato.telefone)) {
          duplicados++
        } else {
          paraImportar.push(contato)
          telefonesExistentes.add(contato.telefone)
        }
      }

      const batchSize = 500
      let importados = 0

      for (let i = 0; i < paraImportar.length; i += batchSize) {
        const lote = paraImportar.slice(i, i + batchSize)
        const { error } = await supabase.from('contatos').insert(lote)
        if (error) throw error
        importados += lote.length
      }

      await carregarContatos()
      toast.success(`${importados} contatos importados!${duplicados > 0 ? ` (${duplicados} duplicados ignorados)` : ''}`)
      return { sucesso: importados, duplicados, erros: 0 }
    } catch (error) {
      console.error('Erro na importação:', error)
      toast.error('Erro ao importar contatos')
      return { sucesso: 0, duplicados: 0, erros: 1 }
    }
  }

  // ===== MÉTRICAS DA EQUIPE =====
  const metricasEquipe = useCallback(() => {
    const hoje = new Date().toISOString().split('T')[0]

    return membrosEquipe.map(membro => {
      const leadsDoMembro = contatos.filter(c => c.criado_por === membro.id)

      const total = leadsDoMembro.length
      const abordados = leadsDoMembro.filter(c => c.status !== 'lead_entrou' && c.status !== 'perdeu').length
      const respostas = leadsDoMembro.filter(c => (c.qtde_respostas || 0) > 0).length
      const followups = leadsDoMembro.reduce((acc, c) => acc + (c.qtde_followups || 0), 0)
      const fechados = leadsDoMembro.filter(c => c.status === 'contrato_fechado').length

      const valorTotal = leadsDoMembro.reduce((acc, c) => acc + (c.valor_fechado || 0), 0)

      const abordagensHoje = leadsDoMembro.filter(c => {
        const ultimaInteracao = c.ultima_interacao
        if (!ultimaInteracao) return false
        return new Date(ultimaInteracao).toISOString().split('T')[0] === hoje
      }).length

      return {
        ...membro,
        total,
        abordados,
        respostas,
        followups,
        fechados,
        valorTotal,
        abordagensHoje,
        taxaConversao: total > 0 ? ((fechados / total) * 100).toFixed(1) : 0
      }
    })
  }, [contatos, membrosEquipe])

  // ===== STATS RÁPIDOS =====
  const stats = {
    totalContatos: contatos.length,
    abordadosHoje: contatos.filter(c => {
      if (!c?.ultimo_contato) return false
      const d = new Date(c.ultimo_contato)
      return d.toDateString() === new Date().toDateString() && c.status !== 'lead_entrou' && c.status !== 'perdeu'
    }).length,
    responderam: contatos.filter(c => ['contato_inicial', 'agendou_visita', 'atendido', 'proposta_enviada', 'negociacao', 'contrato_fechado'].includes(c?.status)).length,
    totalFollowups: contatos.reduce((acc, c) => acc + (c.qtde_followups || 0), 0),
    taxaResposta: contatos.length > 0
      ? ((contatos.filter(c => c?.status !== 'lead_entrou' && c?.status !== 'perdeu').length / contatos.length) * 100).toFixed(1)
      : 0,
    fechados: contatos.filter(c => c?.status === 'contrato_fechado').length,
    perdidos: contatos.filter(c => c?.status === 'perdeu').length,
  }

  // ===== CARREGAR INICIALMENTE =====
  useEffect(() => {
    if (user?.equipeId && !carregadoRef.current) {
      carregadoRef.current = true
      carregarContatos({}, 1, 25)
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [user?.equipeId])

  return {
    contatos,
    loading,
    totalContatos,
    stats,
    metricasEquipe,
    listaSelecionada,
    setListaSelecionada,
    importarContatos,
    atualizarStatus,
    excluirContato,
    restaurarContato,
    adicionarAnotacao,
    carregarContatos,
    atualizarFechamento
  }
}