import { useState, useEffect, useRef, useMemo } from 'react'
import { 
  Search, Plus, UserPlus, FileText, Download, 
  MessageCircle, Phone, Calendar, ChevronLeft, ChevronRight,
  X, Edit2, Trash2, Eye, Check, Clock, Filter,
  Users, Car, DollarSign, Tag, Building2, Instagram,
  Linkedin, Mail, History, Pencil, Save, RefreshCw,
  AlertTriangle, CheckCircle, TrendingUp, TrendingDown,
  ArrowUpDown, List, Grid, LayoutGrid
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import toast from 'react-hot-toast'
import RelatorioModal from '../components/common/RelatorioModal'
import ListaSelector from '../components/leads/ListaSelector'
import { formatCurrency, formatDate, formatDateTime, formatPhone } from '../utils/formatadores'

// ===== CONSTANTES =====
const STATUS_OPTS = [
  { value: 'todos', label: 'Todos os status' },
  { value: 'lead_entrou', label: 'Lead Entrou' },
  { value: 'contato_inicial', label: 'Contato Inicial' },
  { value: 'agendou_visita', label: 'Agendou Visita' },
  { value: 'atendido', label: 'Atendido' },
  { value: 'proposta_enviada', label: 'Proposta Enviada' },
  { value: 'negociacao', label: 'Negociação' },
  { value: 'contrato_fechado', label: '✅ Contrato Fechado' },
  { value: 'perdeu', label: 'Perdeu' },
]

const ORIGEM_OPTS = [
  { value: 'todos', label: 'Todas as origens' },
  { value: 'trafego_pago', label: 'Tráfego Pago' },
  { value: 'loja_fisica', label: 'Loja Física' },
  { value: 'indicacao', label: 'Indicação' },
]

const TIPO_FINANCIAMENTO_OPTS = [
  { value: '', label: 'Todos' },
  { value: 'consorcio', label: 'Consórcio' },
  { value: 'financiamento', label: 'Financiamento' },
  { value: 'a_vista', label: 'À Vista' },
]

const SORT_OPTS = [
  { value: 'data', label: 'Mais recentes' },
  { value: 'data_antiga', label: 'Mais antigos' },
  { value: 'nome', label: 'Nome A-Z' },
  { value: 'nome_desc', label: 'Nome Z-A' },
  { value: 'valor_veiculo', label: 'Maior valor' },
  { value: 'status', label: 'Por status' },
]

export default function Leads() {
  const { user, membrosEquipe } = useAuth()
  
  // ===== ESTADOS =====
  const [leads, setLeads] = useState([])
  const [loading, setLoading] = useState(true)
  const [totalLeads, setTotalLeads] = useState(0)
  const [selectedLead, setSelectedLead] = useState(null)
  const [showPainel, setShowPainel] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [editando, setEditando] = useState(null)
  const [showRelatorio, setShowRelatorio] = useState(false)
  
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
  
  // Formulário
  const [formData, setFormData] = useState({
    nome: '',
    telefone: '',
    email: '',
    origem: 'trafego_pago',
    veiculo_interesse: '',
    valor_veiculo: '',
    valor_entrada: '',
    tipo_financiamento: '',
    status: 'lead_entrou',
    observacoes: ''
  })
  const [salvando, setSalvando] = useState(false)
  
  // Atividades
  const [atividades, setAtividades] = useState([])
  const [carregandoAtividades, setCarregandoAtividades] = useState(false)
  const [novaAnotacao, setNovaAnotacao] = useState('')
  const [salvandoAnotacao, setSalvandoAnotacao] = useState(false)
  
  // Controle de recarregamento
  const carregadoRef = useRef(false)

  // ===== CARREGAR DADOS =====
  useEffect(() => {
    if (user?.equipeId && !carregadoRef.current) {
      carregadoRef.current = true
      carregarLeads()
    }
  }, [user?.equipeId])

  useEffect(() => {
    if (carregadoRef.current) {
      carregarLeads()
    }
  }, [pagina, itensPorPagina, listaSelecionada, ordenacao])

  const carregarLeads = async () => {
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
  }

  // ===== CARREGAR ATIVIDADES =====
  const carregarAtividades = async (leadId) => {
    setCarregandoAtividades(true)
    try {
      const { data, error } = await supabase
        .from('historico_interacoes')
        .select('*')
        .eq('contato_id', leadId)
        .order('data', { ascending: false })
      
      if (error) throw error
      setAtividades(data || [])
    } catch (error) {
      console.error('Erro ao carregar atividades:', error)
    } finally {
      setCarregandoAtividades(false)
    }
  }

  // ===== FUNÇÕES DE CRUD =====
  const handleSalvarLead = async () => {
    if (!formData.nome.trim()) {
      toast.error('Nome é obrigatório')
      return
    }

    setSalvando(true)
    try {
      const dados = {
        nome: formData.nome.trim(),
        telefone: formData.telefone?.replace(/\D/g, '') || null,
        email: formData.email || null,
        origem: formData.origem || 'trafego_pago',
        veiculo_interesse: formData.veiculo_interesse || null,
        valor_veiculo: formData.valor_veiculo ? parseFloat(formData.valor_veiculo) : null,
        valor_entrada: formData.valor_entrada ? parseFloat(formData.valor_entrada) : null,
        tipo_financiamento: formData.tipo_financiamento || null,
        status: formData.status || 'lead_entrou',
        equipe_id: user.equipeId,
        criado_por: user.uid,
        status_por_usuario: {},
        data_criacao: new Date().toISOString()
      }

      if (listaSelecionada) {
        dados.lista_id = listaSelecionada
      }

      if (editando) {
        const { error } = await supabase
          .from('contatos')
          .update(dados)
          .eq('id', editando.id)
        
        if (error) throw error
        toast.success('Lead atualizado!')
      } else {
        const { error } = await supabase
          .from('contatos')
          .insert([dados])
        
        if (error) throw error
        toast.success('Lead adicionado!')
      }

      setShowModal(false)
      setEditando(null)
      resetForm()
      await carregarLeads()
    } catch (error) {
      console.error('Erro ao salvar lead:', error)
      toast.error('Erro ao salvar lead')
    } finally {
      setSalvando(false)
    }
  }

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

  const resetForm = () => {
    setFormData({
      nome: '',
      telefone: '',
      email: '',
      origem: 'trafego_pago',
      veiculo_interesse: '',
      valor_veiculo: '',
      valor_entrada: '',
      tipo_financiamento: '',
      status: 'lead_entrou',
      observacoes: ''
    })
  }

  // ===== FUNÇÕES DE INTERAÇÃO =====
  const atualizarStatus = async (leadId, novoStatus) => {
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
        carregarAtividades(leadId)
      }
    } catch (error) {
      console.error('Erro ao atualizar status:', error)
      toast.error('Erro ao atualizar status')
    }
  }

  const adicionarAnotacao = async (leadId) => {
    if (!novaAnotacao.trim()) {
      toast.error('Digite uma anotação')
      return
    }

    setSalvandoAnotacao(true)
    try {
      await supabase
        .from('historico_interacoes')
        .insert({
          contato_id: leadId,
          usuario_id: user.uid,
          usuario_nome: user.nome || user.email,
          tipo: 'anotacao',
          descricao: novaAnotacao.trim(),
          data: new Date().toISOString()
        })

      await supabase
        .from('contatos')
        .update({ ultima_interacao: new Date().toISOString() })
        .eq('id', leadId)

      toast.success('Anotação adicionada!')
      setNovaAnotacao('')
      carregarAtividades(leadId)
      await carregarLeads()
    } catch (error) {
      console.error('Erro ao adicionar anotação:', error)
      toast.error('Erro ao adicionar anotação')
    } finally {
      setSalvandoAnotacao(false)
    }
  }

  // ===== FILTROS =====
  const leadsFiltrados = useMemo(() => {
    let filtrados = [...leads]
    
    // Busca
    if (busca) {
      const termo = busca.toLowerCase()
      filtrados = filtrados.filter(l => 
        l.nome?.toLowerCase().includes(termo) ||
        l.telefone?.includes(termo) ||
        l.email?.toLowerCase().includes(termo) ||
        l.veiculo_interesse?.toLowerCase().includes(termo)
      )
    }
    
    return filtrados
  }, [leads, busca])

  // ===== RELATÓRIO =====
  const colunasRelatorio = [
    { key: 'nome', label: 'Nome' },
    { key: 'telefone', label: 'Telefone', formatter: formatPhone },
    { key: 'email', label: 'Email' },
    { key: 'origem', label: 'Origem' },
    { key: 'veiculo_interesse', label: 'Veículo' },
    { key: 'valor_veiculo', label: 'Valor', formatter: formatCurrency },
    { key: 'status', label: 'Status' },
    { key: 'vendedor_nome', label: 'Vendedor' },
    { key: 'data_criacao', label: 'Data Criação', formatter: formatDate }
  ]

  const dadosRelatorio = leadsFiltrados.map(l => ({
    ...l,
    origem: l.origem === 'trafego_pago' ? 'Tráfego Pago' : 
            l.origem === 'loja_fisica' ? 'Loja Física' : 'Indicação'
  }))

  // ===== RENDER =====
  const getStatusBadge = (status) => {
    const cores = {
      lead_entrou: 'bg-gray-500/10 text-gray-500',
      contato_inicial: 'bg-blue-500/10 text-blue-500',
      agendou_visita: 'bg-amber-500/10 text-amber-500',
      atendido: 'bg-purple-500/10 text-purple-500',
      proposta_enviada: 'bg-indigo-500/10 text-indigo-500',
      negociacao: 'bg-orange-500/10 text-orange-500',
      contrato_fechado: 'bg-green-500/10 text-green-500',
      perdeu: 'bg-red-500/10 text-red-500'
    }
    return cores[status] || 'bg-gray-500/10 text-gray-500'
  }

  const getStatusLabel = (status) => {
    const map = {
      lead_entrou: 'Lead Entrou',
      contato_inicial: 'Contato Inicial',
      agendou_visita: 'Agendou Visita',
      atendido: 'Atendido',
      proposta_enviada: 'Proposta Enviada',
      negociacao: 'Negociação',
      contrato_fechado: '✅ Contrato Fechado',
      perdeu: 'Perdeu'
    }
    return map[status] || status
  }

  const getOrigemLabel = (origem) => {
    const map = {
      trafego_pago: '🚀 Tráfego Pago',
      loja_fisica: '🏢 Loja Física',
      indicacao: '🤝 Indicação'
    }
    return map[origem] || origem
  }

  // Paginação
  const totalPaginas = Math.ceil(totalLeads / itensPorPagina)

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-[#D2B68A] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-[var(--text-secondary)]">Carregando leads...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-lg sm:text-2xl font-bold text-[var(--text-primary)] flex items-center gap-2">
            <Users size={24} className="text-[#D2B68A]" />
            Leads
          </h1>
          <p className="text-xs sm:text-sm text-[var(--text-secondary)]">
            Gerencie todos os clientes da sua agência
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setShowRelatorio(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-green-500/10 text-green-500 hover:bg-green-500/20 transition-all text-sm"
          >
            <Download size={16} />
            Relatório
          </button>
          <button
            onClick={() => { setEditando(null); resetForm(); setShowModal(true) }}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#D2B68A] text-[#222D52] hover:bg-[#C4A67A] transition-all text-sm font-medium"
          >
            <Plus size={16} />
            Novo Lead
          </button>
        </div>
      </div>

      {/* Filtros */}
      <div className="card p-3">
        <div className="flex flex-wrap gap-2 items-center">
          <div className="flex-1 min-w-[150px] relative">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
            <input
              type="text"
              placeholder="Buscar por nome, telefone, veículo..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-[var(--bg-tertiary)] rounded-lg text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] border border-transparent focus:border-[#D2B68A] outline-none"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 bg-[var(--bg-tertiary)] rounded-lg text-sm text-[var(--text-primary)] border border-transparent focus:border-[#D2B68A] outline-none"
          >
            {STATUS_OPTS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>

          <select
            value={origemFilter}
            onChange={(e) => setOrigemFilter(e.target.value)}
            className="px-3 py-1.5 bg-[var(--bg-tertiary)] rounded-lg text-sm text-[var(--text-primary)] border border-transparent focus:border-[#D2B68A] outline-none"
          >
            {ORIGEM_OPTS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>

          <select
            value={vendedorFilter}
            onChange={(e) => setVendedorFilter(e.target.value)}
            className="px-3 py-1.5 bg-[var(--bg-tertiary)] rounded-lg text-sm text-[var(--text-primary)] border border-transparent focus:border-[#D2B68A] outline-none"
          >
            <option value="">Todos os vendedores</option>
            {membrosEquipe.map(m => (
              <option key={m.id} value={m.id}>{m.nome}</option>
            ))}
          </select>

          <select
            value={ordenacao}
            onChange={(e) => setOrdenacao(e.target.value)}
            className="px-3 py-1.5 bg-[var(--bg-tertiary)] rounded-lg text-sm text-[var(--text-primary)] border border-transparent focus:border-[#D2B68A] outline-none"
          >
            {SORT_OPTS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>

          <button
            onClick={() => {
              setBusca('')
              setStatusFilter('todos')
              setOrigemFilter('todos')
              setVendedorFilter('')
              setOrdenacao('data')
            }}
            className="px-3 py-1.5 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-all text-sm"
          >
            <X size={14} className="inline" /> Limpar
          </button>
        </div>

        {/* Lista Selector */}
        <div className="mt-2 pt-2 border-t border-[var(--border-color)]">
          <ListaSelector
            listaSelecionada={listaSelecionada}
            onSelectLista={(id) => { setListaSelecionada(id); setPagina(1) }}
          />
        </div>
      </div>

      {/* Tabela */}
      <div className="card overflow-hidden">
        {leadsFiltrados.length === 0 ? (
          <div className="p-12 text-center">
            <Users size={32} className="mx-auto text-[var(--text-muted)] opacity-30" />
            <p className="text-sm text-[var(--text-muted)] mt-2">Nenhum lead encontrado</p>
            <button
              onClick={() => { setEditando(null); resetForm(); setShowModal(true) }}
              className="mt-2 text-sm text-[#D2B68A] hover:underline"
            >
              Adicionar primeiro lead
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[var(--border-color)] bg-[var(--bg-tertiary)]/50">
                  <th className="text-left p-2 text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">Cliente</th>
                  <th className="text-left p-2 text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">Origem</th>
                  <th className="text-left p-2 text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">Veículo</th>
                  <th className="text-left p-2 text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">Valor</th>
                  <th className="text-left p-2 text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">Status</th>
                  <th className="text-left p-2 text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">Vendedor</th>
                  <th className="text-right p-2 text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">Ações</th>
                </tr>
              </thead>
              <tbody>
                {leadsFiltrados.map((lead) => (
                  <tr 
                    key={lead.id} 
                    className="border-b border-[var(--border-color)] hover:bg-[var(--bg-tertiary)]/30 transition-all cursor-pointer"
                    onClick={() => {
                      setSelectedLead(lead)
                      setShowPainel(true)
                      carregarAtividades(lead.id)
                    }}
                  >
                    <td className="p-2">
                      <div>
                        <p className="text-sm font-medium text-[var(--text-primary)]">{lead.nome}</p>
                        {lead.telefone && (
                          <p className="text-xs text-[var(--text-muted)] font-mono">{formatPhone(lead.telefone)}</p>
                        )}
                      </div>
                    </td>
                    <td className="p-2">
                      <span className="text-xs text-[var(--text-secondary)]">{getOrigemLabel(lead.origem)}</span>
                    </td>
                    <td className="p-2">
                      <span className="text-sm text-[var(--text-secondary)]">{lead.veiculo_interesse || '-'}</span>
                    </td>
                    <td className="p-2">
                      <span className="text-sm font-medium text-[#10B981]">
                        {lead.valor_veiculo ? formatCurrency(lead.valor_veiculo) : '-'}
                      </span>
                    </td>
                    <td className="p-2">
                      <span className={`text-[10px] px-2 py-1 rounded-full ${getStatusBadge(lead.status)}`}>
                        {getStatusLabel(lead.status)}
                      </span>
                    </td>
                    <td className="p-2">
                      <span className="text-xs text-[var(--text-muted)]">{lead.vendedor_nome || '-'}</span>
                    </td>
                    <td className="p-2 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => {
                            setEditando(lead)
                            setFormData({
                              nome: lead.nome || '',
                              telefone: lead.telefone || '',
                              email: lead.email || '',
                              origem: lead.origem || 'trafego_pago',
                              veiculo_interesse: lead.veiculo_interesse || '',
                              valor_veiculo: lead.valor_veiculo || '',
                              valor_entrada: lead.valor_entrada || '',
                              tipo_financiamento: lead.tipo_financiamento || '',
                              status: lead.status || 'lead_entrou',
                              observacoes: ''
                            })
                            setShowModal(true)
                          }}
                          className="p-1.5 rounded hover:bg-[#D2B68A]/10 text-[var(--text-secondary)] hover:text-[#D2B68A] transition-colors"
                          title="Editar"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          onClick={() => handleExcluirLead(lead.id)}
                          className="p-1.5 rounded hover:bg-red-500/10 text-[var(--text-secondary)] hover:text-red-500 transition-colors"
                          title="Excluir"
                        >
                          <Trash2 size={14} />
                        </button>
                        {lead.telefone && (
                          <a
                            href={`https://wa.me/55${lead.telefone.replace(/\D/g, '')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 rounded hover:bg-[#25D366]/10 text-[#25D366] transition-colors"
                            title="WhatsApp"
                          >
                            <MessageCircle size={14} />
                          </a>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Paginação */}
        {totalLeads > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-2 p-3 border-t border-[var(--border-color)]">
            <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
              <span>
                Mostrando {((pagina - 1) * itensPorPagina) + 1} - {Math.min(pagina * itensPorPagina, totalLeads)} de {totalLeads}
              </span>
              <select
                value={itensPorPagina}
                onChange={(e) => { setItensPorPagina(Number(e.target.value)); setPagina(1) }}
                className="px-2 py-1 bg-[var(--bg-tertiary)] rounded-lg text-xs border border-[var(--border-color)] focus:border-[#D2B68A] outline-none"
              >
                {[10, 25, 50, 100].map(n => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => setPagina(Math.max(1, pagina - 1))}
                disabled={pagina === 1}
                className="p-2 rounded-lg hover:bg-[var(--bg-tertiary)] text-[var(--text-secondary)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft size={16} />
              </button>
              
              <span className="text-xs text-[var(--text-secondary)] px-2">
                {pagina} / {totalPaginas}
              </span>

              <button
                onClick={() => setPagina(Math.min(totalPaginas, pagina + 1))}
                disabled={pagina === totalPaginas}
                className="p-2 rounded-lg hover:bg-[var(--bg-tertiary)] text-[var(--text-secondary)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ===== MODAL DE LEAD ===== */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => { setShowModal(false); setEditando(null); resetForm() }} />
          <div className="relative bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl p-6 w-full max-w-md shadow-2xl z-10 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-[var(--text-primary)] flex items-center gap-2">
                <UserPlus size={20} className="text-[#D2B68A]" />
                {editando ? 'Editar Lead' : 'Novo Lead'}
              </h2>
              <button onClick={() => { setShowModal(false); setEditando(null); resetForm() }} className="p-2 rounded-lg hover:bg-[var(--bg-tertiary)] text-[var(--text-secondary)]">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={(e) => { e.preventDefault(); handleSalvarLead() }} className="space-y-3">
              <div>
                <label className="text-sm font-medium text-[var(--text-secondary)] block mb-1">Nome *</label>
                <input
                  type="text"
                  value={formData.nome}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                  placeholder="Nome completo"
                  className="w-full px-3 py-2 bg-[var(--bg-tertiary)] rounded-lg text-sm text-[var(--text-primary)] border border-[var(--border-color)] focus:border-[#D2B68A] outline-none"
                  required
                />
              </div>

              <div>
                <label className="text-sm font-medium text-[var(--text-secondary)] block mb-1">Telefone</label>
                <input
                  type="text"
                  value={formData.telefone}
                  onChange={(e) => setFormData({ ...formData, telefone: e.target.value.replace(/\D/g, '') })}
                  placeholder="(00) 00000-0000"
                  className="w-full px-3 py-2 bg-[var(--bg-tertiary)] rounded-lg text-sm text-[var(--text-primary)] border border-[var(--border-color)] focus:border-[#D2B68A] outline-none font-mono"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-[var(--text-secondary)] block mb-1">Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="email@exemplo.com"
                  className="w-full px-3 py-2 bg-[var(--bg-tertiary)] rounded-lg text-sm text-[var(--text-primary)] border border-[var(--border-color)] focus:border-[#D2B68A] outline-none"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-[var(--text-secondary)] block mb-1">Origem</label>
                <select
                  value={formData.origem}
                  onChange={(e) => setFormData({ ...formData, origem: e.target.value })}
                  className="w-full px-3 py-2 bg-[var(--bg-tertiary)] rounded-lg text-sm text-[var(--text-primary)] border border-[var(--border-color)] focus:border-[#D2B68A] outline-none"
                >
                  {ORIGEM_OPTS.filter(o => o.value !== 'todos').map(o => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-sm font-medium text-[var(--text-secondary)] block mb-1 flex items-center gap-2">
                  <Car size={14} className="text-[#D2B68A]" />
                  Veículo de Interesse
                </label>
                <input
                  type="text"
                  value={formData.veiculo_interesse}
                  onChange={(e) => setFormData({ ...formData, veiculo_interesse: e.target.value })}
                  placeholder="Ex: Honda Civic 2022"
                  className="w-full px-3 py-2 bg-[var(--bg-tertiary)] rounded-lg text-sm text-[var(--text-primary)] border border-[var(--border-color)] focus:border-[#D2B68A] outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-sm font-medium text-[var(--text-secondary)] block mb-1">Valor do Veículo</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.valor_veiculo}
                    onChange={(e) => setFormData({ ...formData, valor_veiculo: e.target.value })}
                    placeholder="0,00"
                    className="w-full px-3 py-2 bg-[var(--bg-tertiary)] rounded-lg text-sm text-[var(--text-primary)] border border-[var(--border-color)] focus:border-[#D2B68A] outline-none"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-[var(--text-secondary)] block mb-1">Valor da Entrada</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.valor_entrada}
                    onChange={(e) => setFormData({ ...formData, valor_entrada: e.target.value })}
                    placeholder="0,00"
                    className="w-full px-3 py-2 bg-[var(--bg-tertiary)] rounded-lg text-sm text-[var(--text-primary)] border border-[var(--border-color)] focus:border-[#D2B68A] outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-[var(--text-secondary)] block mb-1">Tipo de Financiamento</label>
                <select
                  value={formData.tipo_financiamento}
                  onChange={(e) => setFormData({ ...formData, tipo_financiamento: e.target.value })}
                  className="w-full px-3 py-2 bg-[var(--bg-tertiary)] rounded-lg text-sm text-[var(--text-primary)] border border-[var(--border-color)] focus:border-[#D2B68A] outline-none"
                >
                  <option value="">Selecione</option>
                  <option value="consorcio">Consórcio</option>
                  <option value="financiamento">Financiamento</option>
                  <option value="a_vista">À Vista</option>
                </select>
              </div>

              <div>
                <label className="text-sm font-medium text-[var(--text-secondary)] block mb-1">Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="w-full px-3 py-2 bg-[var(--bg-tertiary)] rounded-lg text-sm text-[var(--text-primary)] border border-[var(--border-color)] focus:border-[#D2B68A] outline-none"
                >
                  {STATUS_OPTS.filter(o => o.value !== 'todos').map(o => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => { setShowModal(false); setEditando(null); resetForm() }}
                  className="flex-1 py-2.5 text-sm rounded-lg border border-[var(--border-color)] text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={salvando}
                  className="flex-1 py-2.5 text-sm rounded-lg bg-[#D2B68A] text-[#222D52] hover:bg-[#C4A67A] disabled:opacity-50 font-medium flex items-center justify-center gap-2"
                >
                  {salvando ? (
                    <>
                      <div className="w-4 h-4 border-2 border-[#222D52] border-t-transparent rounded-full animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    <>
                      <Save size={16} />
                      {editando ? 'Atualizar' : 'Criar'}
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===== PAINEL LATERAL ===== */}
      {showPainel && selectedLead && (
        <div className="fixed inset-0 z-40 flex justify-end">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => { setShowPainel(false); setSelectedLead(null) }} />
          <div className="relative bg-[var(--bg-secondary)] border-l border-[var(--border-color)] w-full max-w-md shadow-2xl z-10 h-full overflow-y-auto">
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h2 className="text-lg font-semibold text-[var(--text-primary)]">{selectedLead.nome}</h2>
                  <p className="text-sm text-[var(--text-muted)]">{selectedLead.veiculo_interesse || 'Sem veículo definido'}</p>
                </div>
                <button onClick={() => { setShowPainel(false); setSelectedLead(null) }} className="p-2 rounded-lg hover:bg-[var(--bg-tertiary)]">
                  <X size={20} />
                </button>
              </div>

              {/* Informações */}
              <div className="space-y-2 mb-4">
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-[var(--bg-tertiary)] p-2 rounded-lg">
                    <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider">Status</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${getStatusBadge(selectedLead.status)}`}>
                      {getStatusLabel(selectedLead.status)}
                    </span>
                  </div>
                  <div className="bg-[var(--bg-tertiary)] p-2 rounded-lg">
                    <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider">Origem</p>
                    <p className="text-sm text-[var(--text-primary)]">{getOrigemLabel(selectedLead.origem)}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-[var(--bg-tertiary)] p-2 rounded-lg">
                    <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider">Valor Veículo</p>
                    <p className="text-sm font-medium text-[#10B981]">{formatCurrency(selectedLead.valor_veiculo)}</p>
                  </div>
                  <div className="bg-[var(--bg-tertiary)] p-2 rounded-lg">
                    <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider">Financiamento</p>
                    <p className="text-sm text-[var(--text-primary)]">{selectedLead.tipo_financiamento || '-'}</p>
                  </div>
                </div>

                {selectedLead.telefone && (
                  <div className="bg-[var(--bg-tertiary)] p-2 rounded-lg flex items-center justify-between">
                    <div>
                      <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider">Telefone</p>
                      <p className="text-sm text-[var(--text-primary)] font-mono">{formatPhone(selectedLead.telefone)}</p>
                    </div>
                    <a
                      href={`https://wa.me/55${selectedLead.telefone.replace(/\D/g, '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 rounded-lg bg-[#25D366] text-white hover:bg-[#1ea952] transition-colors"
                    >
                      <MessageCircle size={16} />
                    </a>
                  </div>
                )}

                {selectedLead.email && (
                  <div className="bg-[var(--bg-tertiary)] p-2 rounded-lg">
                    <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider">Email</p>
                    <p className="text-sm text-[var(--text-primary)]">{selectedLead.email}</p>
                  </div>
                )}

                <div className="bg-[var(--bg-tertiary)] p-2 rounded-lg">
                  <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider">Vendedor</p>
                  <p className="text-sm text-[var(--text-primary)]">{selectedLead.vendedor_nome || '-'}</p>
                </div>
              </div>

              {/* Mudar Status */}
              <div className="mb-4">
                <label className="text-xs font-medium text-[var(--text-secondary)] block mb-1">Mudar Status</label>
                <select
                  value={selectedLead.status}
                  onChange={(e) => atualizarStatus(selectedLead.id, e.target.value)}
                  className="w-full px-3 py-2 bg-[var(--bg-tertiary)] rounded-lg text-sm text-[var(--text-primary)] border border-[var(--border-color)] focus:border-[#D2B68A] outline-none"
                >
                  {STATUS_OPTS.filter(o => o.value !== 'todos').map(o => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>

              {/* Adicionar Anotação */}
              <div className="mb-4">
                <label className="text-xs font-medium text-[var(--text-secondary)] block mb-1">Nova Anotação</label>
                <div className="flex gap-2">
                  <textarea
                    value={novaAnotacao}
                    onChange={(e) => setNovaAnotacao(e.target.value)}
                    rows="2"
                    placeholder="Digite sua anotação..."
                    className="flex-1 px-3 py-2 bg-[var(--bg-tertiary)] rounded-lg text-sm text-[var(--text-primary)] border border-[var(--border-color)] focus:border-[#D2B68A] outline-none resize-none"
                  />
                  <button
                    onClick={() => adicionarAnotacao(selectedLead.id)}
                    disabled={salvandoAnotacao || !novaAnotacao.trim()}
                    className="px-4 py-2 rounded-lg bg-[#D2B68A] text-[#222D52] hover:bg-[#C4A67A] disabled:opacity-50 transition-colors"
                  >
                    <Save size={16} />
                  </button>
                </div>
              </div>

              {/* Histórico */}
              <div>
                <h3 className="text-sm font-semibold text-[var(--text-primary)] flex items-center gap-2 mb-2">
                  <History size={16} className="text-[#D2B68A]" />
                  Histórico
                </h3>
                {carregandoAtividades ? (
                  <div className="text-center py-4">
                    <div className="w-6 h-6 border-2 border-[#D2B68A] border-t-transparent rounded-full animate-spin mx-auto" />
                  </div>
                ) : atividades.length === 0 ? (
                  <p className="text-sm text-[var(--text-muted)] text-center py-4">Nenhuma atividade registrada</p>
                ) : (
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {atividades.map((a) => (
                      <div key={a.id} className="bg-[var(--bg-tertiary)] p-2 rounded-lg">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium text-[var(--text-primary)]">
                            {a.tipo === 'anotacao' ? '📝' : 
                             a.tipo === 'status' ? '🔄' : 
                             a.tipo === 'follow_up' ? '📞' : 
                             a.tipo === 'resposta' ? '✅' : 'ℹ️'} {a.descricao}
                          </span>
                          <span className="text-[10px] text-[var(--text-muted)]">{formatDateTime(a.data)}</span>
                        </div>
                        <div className="text-[10px] text-[var(--text-muted)] mt-0.5">
                          por {a.usuario_nome || 'Sistema'}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===== RELATÓRIO ===== */}
      <RelatorioModal
        isOpen={showRelatorio}
        onClose={() => setShowRelatorio(false)}
        titulo="Relatório de Leads"
        dados={dadosRelatorio}
        colunas={colunasRelatorio}
        nomeArquivo="leads"
      />
    </div>
  )
}