import { useState, useEffect, useCallback, useRef } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'
import toast from 'react-hot-toast'

export default function LeadsContainer({ children }) {
  const { user, membrosEquipe } = useAuth()

  // ===== ESTADOS =====
  const [leads, setLeads] = useState([])
  const [loading, setLoading] = useState(true)
  const [totalLeads, setTotalLeads] = useState(0)
  const [selectedLead, setSelectedLead] = useState(null)
  const [showPainel, setShowPainel] = useState(false)
  
  // Filtros
  const [busca, setBusca] = useState('')
  const [statusFilter, setStatusFilter] = useState('todos')
  const [origemFilter, setOrigemFilter] = useState('todos')
  const [vendedorFilter, setVendedorFilter] = useState('')
  const [tipoFinanciamentoFilter, setTipoFinanciamentoFilter] = useState('')
  const [ordenacao, setOrdenacao] = useState('data')
  const [listaSelecionada, setListaSelecionada] = useState(null)
  
  // Paginação
  const [pagina, setPagina] = useState(1)
  const [itensPorPagina, setItensPorPagina] = useState(25)

  // ===== REF =====
  const carregadoRef = useRef(false)

  // ===== CARREGAR LEADS =====
  const carregarLeads = useCallback(async () => {
    if (!user?.equipeId) {
      setLeads([])
      setTotalLeads(0)
      setLoading(false)
      return
    }

    setLoading(true)
    try {
      const start = (pagina - 1) * itensPorPagina
      
      let query = supabase
        .from('contatos')
        .select('*', { count: 'exact' })
        .eq('equipe_id', user.equipeId)
        .is('deletado_em', null)

      // Filtros
      if (listaSelecionada) {
        query = query.eq('lista_id', listaSelecionada)
      }
      
      if (statusFilter !== 'todos') {
        query = query.eq('status', statusFilter)
      }
      
      if (origemFilter !== 'todos') {
        query = query.eq('origem', origemFilter)
      }
      
      if (vendedorFilter) {
        query = query.eq('criado_por', vendedorFilter)
      }
      
      if (tipoFinanciamentoFilter) {
        query = query.eq('tipo_financiamento', tipoFinanciamentoFilter)
      }

      // Ordenação
      switch (ordenacao) {
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
        default:
          query = query.order('data_criacao', { ascending: false })
      }

      query = query.range(start, start + itensPorPagina - 1)

      const { data, error, count } = await query
      if (error) throw error

      // Enriquecer com nomes dos vendedores
      const leadsEnriquecidos = await Promise.all(
        (data || []).map(async (lead) => {
          let vendedorNome = ''
          if (lead.criado_por) {
            const { data: vendedor } = await supabase
              .from('usuarios')
              .select('nome')
              .eq('id', lead.criado_por)
              .single()
            if (vendedor) vendedorNome = vendedor.nome
          }
          return { ...lead, vendedor_nome: vendedorNome }
        })
      )

      setLeads(leadsEnriquecidos)
      setTotalLeads(count || 0)
    } catch (error) {
      console.error('Erro ao carregar leads:', error)
      toast.error('Erro ao carregar leads')
    } finally {
      setLoading(false)
    }
  }, [user?.equipeId, pagina, itensPorPagina, listaSelecionada, statusFilter, origemFilter, vendedorFilter, tipoFinanciamentoFilter, ordenacao])

  // ===== FUNÇÕES DE CRUD =====
  const handleExcluirLead = async (id) => {
    if (!confirm('Tem certeza que deseja excluir este lead?')) return
    
    try {
      const { error } = await supabase
        .from('contatos')
        .update({ deletado_em: new Date().toISOString() })
        .eq('id', id)
      
      if (error) throw error
      toast.success('Lead movido para lixeira!')
      await carregarLeads()
      if (selectedLead?.id === id) {
        setShowPainel(false)
        setSelectedLead(null)
      }
    } catch (error) {
      console.error('Erro ao excluir lead:', error)
      toast.error('Erro ao excluir lead')
    }
  }

  const handleAtualizarStatus = async (leadId, novoStatus) => {
    try {
      const { error } = await supabase
        .from('contatos')
        .update({
          status: novoStatus,
          ultima_interacao: new Date().toISOString()
        })
        .eq('id', leadId)
      
      if (error) throw error

      await supabase
        .from('historico_interacoes')
        .insert({
          contato_id: leadId,
          usuario_id: user.uid,
          usuario_nome: user.nome || user.email,
          tipo: 'status',
          descricao: `Status alterado para: ${novoStatus}`,
          data: new Date().toISOString()
        })

      toast.success(`Status atualizado para ${novoStatus}`)
      await carregarLeads()
      if (selectedLead?.id === leadId) {
        setSelectedLead(prev => ({ ...prev, status: novoStatus }))
      }
    } catch (error) {
      console.error('Erro ao atualizar status:', error)
      toast.error('Erro ao atualizar status')
    }
  }

  // ===== LIMPAR FILTROS =====
  const limparFiltros = () => {
    setBusca('')
    setStatusFilter('todos')
    setOrigemFilter('todos')
    setVendedorFilter('')
    setTipoFinanciamentoFilter('')
    setOrdenacao('data')
    setListaSelecionada(null)
    setPagina(1)
  }

  // ===== CARREGAR INICIAL =====
  useEffect(() => {
    if (user?.equipeId && !carregadoRef.current) {
      carregadoRef.current = true
      carregarLeads()
    }
  }, [user?.equipeId])

  // ===== RECARREGAR QUANDO FILTROS MUDAREM =====
  useEffect(() => {
    if (carregadoRef.current) {
      carregarLeads()
    }
  }, [pagina, itensPorPagina, listaSelecionada, ordenacao, statusFilter, origemFilter, vendedorFilter, tipoFinanciamentoFilter])

  return children({
    leads,
    loading,
    totalLeads,
    selectedLead,
    setSelectedLead,
    showPainel,
    setShowPainel,
    busca,
    setBusca,
    statusFilter,
    setStatusFilter,
    origemFilter,
    setOrigemFilter,
    vendedorFilter,
    setVendedorFilter,
    tipoFinanciamentoFilter,
    setTipoFinanciamentoFilter,
    ordenacao,
    setOrdenacao,
    listaSelecionada,
    setListaSelecionada,
    pagina,
    setPagina,
    itensPorPagina,
    setItensPorPagina,
    carregarLeads,
    handleExcluirLead,
    handleAtualizarStatus,
    limparFiltros,
    membrosEquipe
  })
}