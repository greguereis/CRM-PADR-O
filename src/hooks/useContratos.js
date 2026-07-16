import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import toast from 'react-hot-toast'

export function useContratos() {
  const { user, membrosEquipe } = useAuth()
  const [contratos, setContratos] = useState([])
  const [loading, setLoading] = useState(false)
  const [filtroVendedor, setFiltroVendedor] = useState(null)
  const [filtroPeriodo, setFiltroPeriodo] = useState({
    dataInicio: null,
    dataFim: null
  })

  const carregarContratos = useCallback(async () => {
    if (!user?.equipeId) {
      setContratos([])
      return
    }

    setLoading(true)
    try {
      let query = supabase
        .from('contratos')
        .select('*, cliente:cliente_id(*), vendedor:vendedor_id(*)')
        .eq('equipe_id', user.equipeId)
        .order('data_fechamento', { ascending: false })

      if (filtroVendedor) {
        query = query.eq('vendedor_id', filtroVendedor)
      }
      if (filtroPeriodo.dataInicio) {
        query = query.gte('data_fechamento', filtroPeriodo.dataInicio)
      }
      if (filtroPeriodo.dataFim) {
        query = query.lte('data_fechamento', filtroPeriodo.dataFim)
      }

      const { data, error } = await query

      if (error) throw error

      const contratosFormatados = (data || []).map(c => ({
        ...c,
        cliente_nome: c.cliente?.nome || 'Cliente removido',
        vendedor_nome: c.vendedor?.nome || 'Vendedor removido'
      }))

      setContratos(contratosFormatados)
      return contratosFormatados
    } catch (error) {
      console.error('Erro ao carregar contratos:', error)
      toast.error('Erro ao carregar contratos')
      setContratos([])
      return []
    } finally {
      setLoading(false)
    }
  }, [user, filtroVendedor, filtroPeriodo])

  const criarContrato = async (dados) => {
    if (!user?.equipeId) {
      toast.error('Equipe não encontrada')
      return null
    }

    try {
      const { data, error } = await supabase
        .from('contratos')
        .insert({
          ...dados,
          equipe_id: user.equipeId,
          criado_por: user.id,
          criado_em: new Date().toISOString()
        })
        .select()
        .single()

      if (error) throw error

      // Atualizar status do lead para "contrato_fechado"
      await supabase
        .from('contatos')
        .update({ 
          status: 'contrato_fechado',
          ultima_interacao: new Date().toISOString()
        })
        .eq('id', dados.cliente_id)

      setContratos(prev => [data, ...prev])
      toast.success('Contrato registrado com sucesso! 🎉')
      return data
    } catch (error) {
      console.error('Erro ao criar contrato:', error)
      toast.error('Erro ao criar contrato')
      return null
    }
  }

  const excluirContrato = async (contratoId) => {
    if (!confirm('Tem certeza que deseja excluir este contrato?')) return false

    try {
      const { error } = await supabase
        .from('contratos')
        .delete()
        .eq('id', contratoId)

      if (error) throw error

      setContratos(prev => prev.filter(c => c.id !== contratoId))
      toast.success('Contrato excluído!')
      return true
    } catch (error) {
      console.error('Erro ao excluir contrato:', error)
      toast.error('Erro ao excluir contrato')
      return false
    }
  }

  const getMetricasContratos = useCallback(() => {
    const total = contratos.length
    const valorTotal = contratos.reduce((acc, c) => acc + (c.valor_venda || 0), 0)
    const comissaoTotal = contratos.reduce((acc, c) => acc + (c.comissao || 0), 0)
    const ticketMedio = total > 0 ? valorTotal / total : 0

    // Métricas por vendedor
    const porVendedor = {}
    contratos.forEach(c => {
      if (c.vendedor_id) {
        if (!porVendedor[c.vendedor_id]) {
          porVendedor[c.vendedor_id] = {
            vendedor_nome: c.vendedor_nome || 'Vendedor',
            total: 0,
            valorTotal: 0,
            comissaoTotal: 0
          }
        }
        porVendedor[c.vendedor_id].total++
        porVendedor[c.vendedor_id].valorTotal += c.valor_venda || 0
        porVendedor[c.vendedor_id].comissaoTotal += c.comissao || 0
      }
    })

    return { total, valorTotal, comissaoTotal, ticketMedio, porVendedor }
  }, [contratos])

  // Carregar contratos iniciais
  useEffect(() => {
    if (user?.equipeId) {
      carregarContratos()
    }
  }, [user?.equipeId, filtroVendedor, filtroPeriodo])

  return {
    contratos,
    loading,
    carregarContratos,
    criarContrato,
    excluirContrato,
    getMetricasContratos,
    filtroVendedor,
    setFiltroVendedor,
    filtroPeriodo,
    setFiltroPeriodo
  }
}