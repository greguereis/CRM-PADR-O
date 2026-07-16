import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import toast from 'react-hot-toast'

export function usePropostas() {
  const { user, membrosEquipe } = useAuth()
  const [propostas, setPropostas] = useState([])
  const [loading, setLoading] = useState(false)
  const [filtroStatus, setFiltroStatus] = useState('todos')
  const [filtroVendedor, setFiltroVendedor] = useState(null)

  const carregarPropostas = useCallback(async () => {
    if (!user?.equipeId) {
      setPropostas([])
      return
    }

    setLoading(true)
    try {
      let query = supabase
        .from('propostas')
        .select('*, cliente:cliente_id(*), vendedor:vendedor_id(*)')
        .eq('equipe_id', user.equipeId)
        .order('data_envio', { ascending: false })

      if (filtroStatus !== 'todos') {
        query = query.eq('status', filtroStatus)
      }
      if (filtroVendedor) {
        query = query.eq('vendedor_id', filtroVendedor)
      }

      const { data, error } = await query

      if (error) throw error

      const propostasFormatadas = (data || []).map(p => ({
        ...p,
        cliente_nome: p.cliente?.nome || 'Cliente removido',
        vendedor_nome: p.vendedor?.nome || 'Vendedor removido'
      }))

      setPropostas(propostasFormatadas)
      return propostasFormatadas
    } catch (error) {
      console.error('Erro ao carregar propostas:', error)
      toast.error('Erro ao carregar propostas')
      setPropostas([])
      return []
    } finally {
      setLoading(false)
    }
  }, [user, filtroStatus, filtroVendedor])

  const criarProposta = async (dados) => {
    if (!user?.equipeId) {
      toast.error('Equipe não encontrada')
      return null
    }

    try {
      const { data, error } = await supabase
        .from('propostas')
        .insert({
          ...dados,
          equipe_id: user.equipeId,
          criado_por: user.id,
          criado_em: new Date().toISOString()
        })
        .select()
        .single()

      if (error) throw error

      // Atualizar status do lead para "proposta_enviada"
      await supabase
        .from('contatos')
        .update({ 
          status: 'proposta_enviada',
          ultima_interacao: new Date().toISOString()
        })
        .eq('id', dados.cliente_id)

      setPropostas(prev => [data, ...prev])
      toast.success('Proposta enviada com sucesso!')
      return data
    } catch (error) {
      console.error('Erro ao criar proposta:', error)
      toast.error('Erro ao criar proposta')
      return null
    }
  }

  const atualizarStatusProposta = async (propostaId, novoStatus) => {
    try {
      const { data, error } = await supabase
        .from('propostas')
        .update({ status: novoStatus })
        .eq('id', propostaId)
        .select()
        .single()

      if (error) throw error

      // Se a proposta foi aceita, atualizar lead para "negociacao"
      if (novoStatus === 'aceita') {
        await supabase
          .from('contatos')
          .update({ 
            status: 'negociacao',
            ultima_interacao: new Date().toISOString()
          })
          .eq('id', data.cliente_id)
      }

      setPropostas(prev => prev.map(p => p.id === propostaId ? { ...p, status: novoStatus } : p))
      toast.success(`Status atualizado para: ${novoStatus}`)
      return data
    } catch (error) {
      console.error('Erro ao atualizar proposta:', error)
      toast.error('Erro ao atualizar proposta')
      return null
    }
  }

  const excluirProposta = async (propostaId) => {
    if (!confirm('Tem certeza que deseja excluir esta proposta?')) return false

    try {
      const { error } = await supabase
        .from('propostas')
        .delete()
        .eq('id', propostaId)

      if (error) throw error

      setPropostas(prev => prev.filter(p => p.id !== propostaId))
      toast.success('Proposta excluída!')
      return true
    } catch (error) {
      console.error('Erro ao excluir proposta:', error)
      toast.error('Erro ao excluir proposta')
      return false
    }
  }

  const getMetricasPropostas = useCallback(() => {
    const total = propostas.length
    const enviadas = propostas.filter(p => p.status === 'enviada').length
    const negociando = propostas.filter(p => p.status === 'negociando').length
    const aceitas = propostas.filter(p => p.status === 'aceita').length
    const recusadas = propostas.filter(p => p.status === 'recusada').length
    const valorTotal = propostas.reduce((acc, p) => acc + (p.valor || 0), 0)
    const valorAprovado = propostas
      .filter(p => p.status === 'aceita')
      .reduce((acc, p) => acc + (p.valor || 0), 0)

    return { total, enviadas, negociando, aceitas, recusadas, valorTotal, valorAprovado }
  }, [propostas])

  // Carregar propostas iniciais
  useEffect(() => {
    if (user?.equipeId) {
      carregarPropostas()
    }
  }, [user?.equipeId, filtroStatus, filtroVendedor])

  return {
    propostas,
    loading,
    carregarPropostas,
    criarProposta,
    atualizarStatusProposta,
    excluirProposta,
    getMetricasPropostas,
    filtroStatus,
    setFiltroStatus,
    filtroVendedor,
    setFiltroVendedor
  }
}