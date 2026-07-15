import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import toast from 'react-hot-toast'

export function useEventos() {
  const { user, membrosEquipe } = useAuth()
  const [eventos, setEventos] = useState([])
  const [loading, setLoading] = useState(false)
  const [filtroPeriodo, setFiltroPeriodo] = useState({
    dataInicio: null,
    dataFim: null
  })

  const carregarEventos = useCallback(async (dataInicio = null, dataFim = null) => {
    if (!user?.equipeId) {
      setEventos([])
      return
    }

    setLoading(true)
    try {
      let query = supabase
        .from('eventos')
        .select('*, cliente:cliente_id(*), funcionario:funcionario_id(*)')
        .eq('equipe_id', user.equipeId)
        .order('data_hora', { ascending: true })

      if (dataInicio) {
        query = query.gte('data_hora', dataInicio)
      }
      if (dataFim) {
        query = query.lte('data_hora', dataFim)
      }

      const { data, error } = await query

      if (error) throw error

      // Mapeia os dados para incluir nomes
      const eventosFormatados = (data || []).map(evento => ({
        ...evento,
        cliente_nome: evento.cliente?.nome || 'Cliente não encontrado',
        funcionario_nome: evento.funcionario?.nome || 'Não definido',
        funcionario_cor: evento.funcionario?.cor || '#6B7280'
      }))

      setEventos(eventosFormatados)
      return eventosFormatados
    } catch (error) {
      console.error('Erro ao carregar eventos:', error)
      toast.error('Erro ao carregar eventos')
      setEventos([])
      return []
    } finally {
      setLoading(false)
    }
  }, [user])

  const criarEvento = async (dados) => {
    if (!user?.equipeId) {
      toast.error('Equipe não encontrada')
      return null
    }

    try {
      const { data, error } = await supabase
        .from('eventos')
        .insert({
          ...dados,
          equipe_id: user.equipeId,
          criado_por: user.uid,
          criado_em: new Date().toISOString()
        })
        .select()
        .single()

      if (error) throw error

      setEventos(prev => [...prev, data])
      toast.success('Evento criado com sucesso!')
      return data
    } catch (error) {
      console.error('Erro ao criar evento:', error)
      toast.error('Erro ao criar evento')
      return null
    }
  }

  const atualizarEvento = async (eventoId, dados) => {
    try {
      const { data, error } = await supabase
        .from('eventos')
        .update(dados)
        .eq('id', eventoId)
        .select()
        .single()

      if (error) throw error

      setEventos(prev => prev.map(e => e.id === eventoId ? { ...e, ...data } : e))
      toast.success('Evento atualizado!')
      return data
    } catch (error) {
      console.error('Erro ao atualizar evento:', error)
      toast.error('Erro ao atualizar evento')
      return null
    }
  }

  const excluirEvento = async (eventoId) => {
    if (!confirm('Tem certeza que deseja excluir este evento?')) return false

    try {
      const { error } = await supabase
        .from('eventos')
        .delete()
        .eq('id', eventoId)

      if (error) throw error

      setEventos(prev => prev.filter(e => e.id !== eventoId))
      toast.success('Evento excluído!')
      return true
    } catch (error) {
      console.error('Erro ao excluir evento:', error)
      toast.error('Erro ao excluir evento')
      return false
    }
  }

  const buscarEventosPorFuncionario = useCallback((funcionarioId) => {
    return eventos.filter(e => e.funcionario_id === funcionarioId)
  }, [eventos])

  const buscarEventosPorCliente = useCallback((clienteId) => {
    return eventos.filter(e => e.cliente_id === clienteId)
  }, [eventos])

  const buscarEventosPorTipo = useCallback((tipo) => {
    return eventos.filter(e => e.tipo === tipo)
  }, [eventos])

  // Carregar eventos iniciais
  useEffect(() => {
    if (user?.equipeId) {
      carregarEventos()
    }
  }, [user?.equipeId])

  return {
    eventos,
    loading,
    carregarEventos,
    criarEvento,
    atualizarEvento,
    excluirEvento,
    buscarEventosPorFuncionario,
    buscarEventosPorCliente,
    buscarEventosPorTipo,
    filtroPeriodo,
    setFiltroPeriodo
  }
}