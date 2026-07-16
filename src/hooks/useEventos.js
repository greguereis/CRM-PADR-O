import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import toast from 'react-hot-toast'

export function useEventos() {
  const { user } = useAuth()
  const [eventos, setEventos] = useState([])
  const [loading, setLoading] = useState(false)
  const [testDrives, setTestDrives] = useState([])
  const [loadingTestDrives, setLoadingTestDrives] = useState(false)

  // ===== CARREGAR TODOS OS EVENTOS =====
  const carregarEventos = useCallback(async (filtros = {}) => {
    if (!user?.equipeId) {
      setEventos([])
      return
    }

    setLoading(true)
    try {
      let query = supabase
        .from('eventos')
        .select('*')
        .eq('criado_por', user.id)
        .order('data_hora', { ascending: true })

      // Filtros
      if (filtros.tipo && filtros.tipo !== 'todos') {
        query = query.eq('tipo', filtros.tipo)
      }
      if (filtros.funcionario_id) {
        query = query.eq('funcionario_id', filtros.funcionario_id)
      }
      if (filtros.cliente_id) {
        query = query.eq('cliente_id', filtros.cliente_id)
      }
      if (filtros.data_inicio) {
        query = query.gte('data_hora', filtros.data_inicio)
      }
      if (filtros.data_fim) {
        query = query.lte('data_hora', filtros.data_fim)
      }

      const { data, error } = await query
      if (error) throw error

      // Enriquecer com nomes
      const eventosEnriquecidos = await Promise.all(
        (data || []).map(async (evento) => {
          let clienteNome = 'Cliente removido'
          let clienteTelefone = ''
          if (evento.cliente_id) {
            const { data: cliente } = await supabase
              .from('contatos')
              .select('nome, telefone')
              .eq('id', evento.cliente_id)
              .single()
            if (cliente) {
              clienteNome = cliente.nome
              clienteTelefone = cliente.telefone || ''
            }
          }

          let funcionarioNome = ''
          if (evento.funcionario_id) {
            const { data: funcionario } = await supabase
              .from('usuarios')
              .select('nome')
              .eq('id', evento.funcionario_id)
              .single()
            if (funcionario) funcionarioNome = funcionario.nome
          }

          return {
            ...evento,
            cliente_nome: clienteNome,
            cliente_telefone: clienteTelefone,
            funcionario_nome: funcionarioNome
          }
        })
      )

      setEventos(eventosEnriquecidos)
      return eventosEnriquecidos
    } catch (error) {
      console.error('Erro ao carregar eventos:', error)
      toast.error('Erro ao carregar eventos')
      return []
    } finally {
      setLoading(false)
    }
  }, [user])

  // ===== CARREGAR TEST-DRIVES =====
  const carregarTestDrives = useCallback(async (funcionarioId = null) => {
    if (!user?.equipeId) {
      setTestDrives([])
      return
    }

    setLoadingTestDrives(true)
    try {
      let query = supabase
        .from('eventos')
        .select('*')
        .eq('tipo', 'test_drive')
        .eq('criado_por', user.id)
        .order('data_hora', { ascending: true })

      if (funcionarioId) {
        query = query.eq('funcionario_id', funcionarioId)
      }

      const { data, error } = await query
      if (error) throw error

      // Enriquecer com nomes
      const testDrivesEnriquecidos = await Promise.all(
        (data || []).map(async (td) => {
          let clienteNome = 'Cliente removido'
          let veiculo = ''
          if (td.cliente_id) {
            const { data: cliente } = await supabase
              .from('contatos')
              .select('nome, veiculo_interesse')
              .eq('id', td.cliente_id)
              .single()
            if (cliente) {
              clienteNome = cliente.nome
              veiculo = cliente.veiculo_interesse || td.veiculo || ''
            }
          }

          let funcionarioNome = ''
          if (td.funcionario_id) {
            const { data: funcionario } = await supabase
              .from('usuarios')
              .select('nome')
              .eq('id', td.funcionario_id)
              .single()
            if (funcionario) funcionarioNome = funcionario.nome
          }

          return {
            ...td,
            cliente_nome: clienteNome,
            veiculo: veiculo,
            funcionario_nome: funcionarioNome
          }
        })
      )

      setTestDrives(testDrivesEnriquecidos)
      return testDrivesEnriquecidos
    } catch (error) {
      console.error('Erro ao carregar test-drives:', error)
      toast.error('Erro ao carregar test-drives')
      return []
    } finally {
      setLoadingTestDrives(false)
    }
  }, [user])

  // ===== CRIAR EVENTO =====
  const criarEvento = async (dados) => {
    if (!user?.id) {
      toast.error('Usuário não autenticado')
      return null
    }

    try {
      const eventoData = {
        ...dados,
        criado_por: user.id,
        criado_em: new Date().toISOString()
      }

      const { data, error } = await supabase
        .from('eventos')
        .insert([eventoData])
        .select()
        .single()

      if (error) throw error

      toast.success('Evento criado com sucesso!')
      await carregarEventos()
      return data
    } catch (error) {
      console.error('Erro ao criar evento:', error)
      toast.error('Erro ao criar evento')
      return null
    }
  }

  // ===== ATUALIZAR EVENTO =====
  const atualizarEvento = async (id, dados) => {
    try {
      const { data, error } = await supabase
        .from('eventos')
        .update(dados)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error

      toast.success('Evento atualizado!')
      await carregarEventos()
      return data
    } catch (error) {
      console.error('Erro ao atualizar evento:', error)
      toast.error('Erro ao atualizar evento')
      return null
    }
  }

  // ===== EXCLUIR EVENTO =====
  const excluirEvento = async (id) => {
    if (!confirm('Tem certeza que deseja excluir este evento?')) return false

    try {
      const { error } = await supabase
        .from('eventos')
        .delete()
        .eq('id', id)

      if (error) throw error

      toast.success('Evento excluído!')
      await carregarEventos()
      return true
    } catch (error) {
      console.error('Erro ao excluir evento:', error)
      toast.error('Erro ao excluir evento')
      return false
    }
  }

  // ===== BUSCAR EVENTOS DE UM FUNCIONÁRIO =====
  const buscarEventosPorFuncionario = useCallback(async (funcionarioId) => {
    if (!funcionarioId) return []

    try {
      const { data, error } = await supabase
        .from('eventos')
        .select('*')
        .eq('funcionario_id', funcionarioId)
        .order('data_hora', { ascending: true })

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Erro ao buscar eventos do funcionário:', error)
      return []
    }
  }, [])

  // ===== BUSCAR EVENTOS DE UM CLIENTE =====
  const buscarEventosPorCliente = useCallback(async (clienteId) => {
    if (!clienteId) return []

    try {
      const { data, error } = await supabase
        .from('eventos')
        .select('*')
        .eq('cliente_id', clienteId)
        .order('data_hora', { ascending: true })

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Erro ao buscar eventos do cliente:', error)
      return []
    }
  }, [])

  // ===== CARREGAR EVENTOS INICIALMENTE =====
  useEffect(() => {
    if (user?.equipeId) {
      carregarEventos()
    }
  }, [user?.equipeId])

  return {
    eventos,
    loading,
    testDrives,
    loadingTestDrives,
    carregarEventos,
    carregarTestDrives,
    criarEvento,
    atualizarEvento,
    excluirEvento,
    buscarEventosPorFuncionario,
    buscarEventosPorCliente
  }
}