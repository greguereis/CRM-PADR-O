import { useState, useEffect, useRef } from 'react'
import { 
  Plus, Search, X, Edit2, Trash2,
  Download, FileText, DollarSign, Calendar,
  CheckCircle, XCircle, Send, RefreshCw
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import toast from 'react-hot-toast'
import GerarRelatorioModal from '../components/common/GerarRelatorioModal'
import { formatCurrency, formatDate } from '../utils/formatadores'

export default function Propostas() {
  const { user, membrosEquipe } = useAuth()
  
  // Estados
  const [propostas, setPropostas] = useState([])
  const [clientes, setClientes] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editando, setEditando] = useState(null)
  const [showGerarRelatorio, setShowGerarRelatorio] = useState(false)
  
  // Filtros
  const [busca, setBusca] = useState('')
  const [filtroStatus, setFiltroStatus] = useState('todos')
  const [filtroVendedor, setFiltroVendedor] = useState('')
  const [dataInicio, setDataInicio] = useState('')
  const [dataFim, setDataFim] = useState('')
  
  // Formulário
  const [formData, setFormData] = useState({
    cliente_id: '',
    vendedor_id: '',
    valor: '',
    data_envio: '',
    status: 'enviada',
    observacoes: ''
  })
  const [salvando, setSalvando] = useState(false)
  
  // Métricas
  const [metricas, setMetricas] = useState({
    total: 0,
    enviadas: 0,
    negociando: 0,
    aceitas: 0,
    recusadas: 0,
    valorTotal: 0,
    valorAceitas: 0
  })

  const carregadoRef = useRef(false)

  // Carregar dados
  useEffect(() => {
    if (user?.equipeId && !carregadoRef.current) {
      carregadoRef.current = true
      carregarClientes()
      carregarPropostas()
    }
  }, [user?.equipeId])

  // Atualizar métricas quando propostas mudarem
  useEffect(() => {
    calcularMetricas()
  }, [propostas])

  // ===== FUNÇÕES DE CARREGAMENTO =====
  const carregarClientes = async () => {
    try {
      const { data, error } = await supabase
        .from('contatos')
        .select('id, nome, veiculo_interesse, telefone')
        .eq('equipe_id', user.equipeId)
        .is('deletado_em', null)
        .order('nome')
      
      if (error) throw error
      setClientes(data || [])
    } catch (error) {
      console.error('Erro ao carregar clientes:', error)
    }
  }

  const carregarPropostas = async () => {
    setLoading(true)
    try {
      // Buscar todas as propostas da equipe
      const { data, error } = await supabase
        .from('propostas')
        .select('*')
        .eq('equipe_id', user.equipeId)
        .order('data_envio', { ascending: false })
      
      if (error) throw error
      
      // Buscar todos os clientes e vendedores em uma única consulta
      const clienteIds = [...new Set((data || []).map(p => p.cliente_id).filter(Boolean))]
      const vendedorIds = [...new Set((data || []).map(p => p.vendedor_id).filter(Boolean))]
      
      let clientesMap = {}
      let vendedoresMap = {}
      
      if (clienteIds.length > 0) {
        const { data: clientesData } = await supabase
          .from('contatos')
          .select('id, nome, veiculo_interesse')
          .in('id', clienteIds)
        
        clientesMap = (clientesData || []).reduce((acc, c) => {
          acc[c.id] = c
          return acc
        }, {})
      }
      
      if (vendedorIds.length > 0) {
        const { data: vendedoresData } = await supabase
          .from('usuarios')
          .select('id, nome')
          .in('id', vendedorIds)
        
        vendedoresMap = (vendedoresData || []).reduce((acc, v) => {
          acc[v.id] = v
          return acc
        }, {})
      }
      
      // Enriquecer as propostas
      const propostasEnriquecidas = (data || []).map(proposta => {
        const cliente = clientesMap[proposta.cliente_id]
        const vendedor = vendedoresMap[proposta.vendedor_id]
        
        return {
          ...proposta,
          cliente_nome: cliente?.nome || 'Cliente removido',
          veiculo: cliente?.veiculo_interesse || '',
          vendedor_nome: vendedor?.nome || 'Vendedor removido'
        }
      })
      
      setPropostas(propostasEnriquecidas)
    } catch (error) {
      console.error('Erro ao carregar propostas:', error)
      toast.error('Erro ao carregar propostas')
    } finally {
      setLoading(false)
    }
  }

  // ===== MÉTRICAS =====
  const calcularMetricas = () => {
    const total = propostas.length
    const enviadas = propostas.filter(p => p.status === 'enviada').length
    const negociando = propostas.filter(p => p.status === 'negociando').length
    const aceitas = propostas.filter(p => p.status === 'aceita').length
    const recusadas = propostas.filter(p => p.status === 'recusada').length
    
    const valorTotal = propostas.reduce((acc, p) => acc + (p.valor || 0), 0)
    const valorAceitas = propostas
      .filter(p => p.status === 'aceita')
      .reduce((acc, p) => acc + (p.valor || 0), 0)
    
    setMetricas({
      total,
      enviadas,
      negociando,
      aceitas,
      recusadas,
      valorTotal,
      valorAceitas
    })
  }

  // ===== FUNÇÕES DE CRUD =====
  const handleSalvar = async () => {
    if (!formData.cliente_id) {
      toast.error('Selecione um cliente')
      return
    }
    if (!formData.valor || parseFloat(formData.valor) <= 0) {
      toast.error('Digite um valor válido')
      return
    }
    if (!formData.data_envio) {
      toast.error('Selecione a data de envio')
      return
    }

    setSalvando(true)
    try {
      const dados = {
        cliente_id: formData.cliente_id,
        vendedor_id: formData.vendedor_id || user.id,
        valor: parseFloat(formData.valor),
        data_envio: formData.data_envio,
        status: formData.status || 'enviada',
        observacoes: formData.observacoes || null,
        equipe_id: user.equipeId
      }

      if (editando) {
        // Editar
        const { error } = await supabase
          .from('propostas')
          .update(dados)
          .eq('id', editando.id)
        
        if (error) throw error
        toast.success('Proposta atualizada!')
      } else {
        // Criar
        const { error } = await supabase
          .from('propostas')
          .insert([{ ...dados, criado_por: user.id }])
        
        if (error) throw error
        toast.success('Proposta criada!')
      }

      setShowModal(false)
      setEditando(null)
      resetForm()
      await carregarPropostas()
    } catch (error) {
      console.error('Erro ao salvar proposta:', error)
      toast.error('Erro ao salvar proposta')
    } finally {
      setSalvando(false)
    }
  }

  const handleExcluir = async (id) => {
    if (!confirm('Tem certeza que deseja excluir esta proposta?')) return
    
    try {
      const { error } = await supabase
        .from('propostas')
        .delete()
        .eq('id', id)
      
      if (error) throw error
      toast.success('Proposta excluída!')
      await carregarPropostas()
    } catch (error) {
      console.error('Erro ao excluir proposta:', error)
      toast.error('Erro ao excluir proposta')
    }
  }

  const handleEditar = (proposta) => {
    setEditando(proposta)
    setFormData({
      cliente_id: proposta.cliente_id || '',
      vendedor_id: proposta.vendedor_id || '',
      valor: proposta.valor || '',
      data_envio: proposta.data_envio || '',
      status: proposta.status || 'enviada',
      observacoes: proposta.observacoes || ''
    })
    setShowModal(true)
  }

  const resetForm = () => {
    setFormData({
      cliente_id: '',
      vendedor_id: '',
      valor: '',
      data_envio: '',
      status: 'enviada',
      observacoes: ''
    })
  }

  // ===== FILTROS =====
  const propostasFiltradas = propostas.filter(p => {
    // Busca
    if (busca) {
      const termo = busca.toLowerCase()
      const matchCliente = p.cliente_nome?.toLowerCase().includes(termo)
      const matchVeiculo = p.veiculo?.toLowerCase().includes(termo)
      const matchObservacao = p.observacoes?.toLowerCase().includes(termo)
      if (!matchCliente && !matchVeiculo && !matchObservacao) return false
    }
    
    // Status
    if (filtroStatus !== 'todos' && p.status !== filtroStatus) return false
    
    // Vendedor
    if (filtroVendedor && p.vendedor_id !== filtroVendedor) return false
    
    // Período
    if (dataInicio && p.data_envio < dataInicio) return false
    if (dataFim && p.data_envio > dataFim) return false
    
    return true
  })

  // ===== RELATÓRIO =====
  const colunasRelatorio = [
    { key: 'data_envio', label: 'Data Envio', formatter: formatDate },
    { key: 'cliente_nome', label: 'Cliente' },
    { key: 'veiculo', label: 'Veículo' },
    { key: 'vendedor_nome', label: 'Vendedor' },
    { key: 'valor', label: 'Valor', formatter: formatCurrency },
    { key: 'status', label: 'Status' },
    { key: 'observacoes', label: 'Observações' }
  ]

  const dadosRelatorio = propostasFiltradas.map(p => ({
    ...p,
    status: p.status === 'enviada' ? 'Enviada' : 
            p.status === 'negociando' ? 'Negociando' : 
            p.status === 'aceita' ? '✅ Aceita' : 
            p.status === 'recusada' ? '❌ Recusada' : p.status
  }))

  // ===== RENDER =====
  const getStatusBadge = (status) => {
    const configs = {
      enviada: { label: 'Enviada', cor: 'bg-blue-500/10 text-blue-500', icon: <Send size={12} /> },
      negociando: { label: 'Negociando', cor: 'bg-amber-500/10 text-amber-500', icon: <RefreshCw size={12} /> },
      aceita: { label: '✅ Aceita', cor: 'bg-green-500/10 text-green-500', icon: <CheckCircle size={12} /> },
      recusada: { label: '❌ Recusada', cor: 'bg-red-500/10 text-red-500', icon: <XCircle size={12} /> }
    }
    return configs[status] || configs.enviada
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-[#D2B68A] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-[var(--text-secondary)]">Carregando propostas...</p>
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
            <FileText size={24} className="text-[#D2B68A]" />
            Propostas
          </h1>
          <p className="text-xs sm:text-sm text-[var(--text-secondary)]">
            Gerencie todas as propostas enviadas para seus clientes
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setShowGerarRelatorio(true)}
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
            Nova Proposta
          </button>
        </div>
      </div>

      {/* Métricas */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5 sm:gap-2">
        <div className="card p-2 sm:p-3 text-center">
          <p className="text-lg sm:text-xl font-bold text-[var(--text-primary)]">{metricas.total}</p>
          <p className="text-[7px] sm:text-[10px] text-[var(--text-secondary)] uppercase tracking-wider">Total</p>
        </div>
        <div className="card p-2 sm:p-3 text-center">
          <p className="text-lg sm:text-xl font-bold text-blue-500">{metricas.enviadas}</p>
          <p className="text-[7px] sm:text-[10px] text-[var(--text-secondary)] uppercase tracking-wider">Enviadas</p>
        </div>
        <div className="card p-2 sm:p-3 text-center">
          <p className="text-lg sm:text-xl font-bold text-amber-500">{metricas.negociando}</p>
          <p className="text-[7px] sm:text-[10px] text-[var(--text-secondary)] uppercase tracking-wider">Negociando</p>
        </div>
        <div className="card p-2 sm:p-3 text-center">
          <p className="text-lg sm:text-xl font-bold text-green-500">{metricas.aceitas}</p>
          <p className="text-[7px] sm:text-[10px] text-[var(--text-secondary)] uppercase tracking-wider">Aceitas</p>
        </div>
        <div className="card p-2 sm:p-3 text-center">
          <p className="text-lg sm:text-xl font-bold text-red-500">{metricas.recusadas}</p>
          <p className="text-[7px] sm:text-[10px] text-[var(--text-secondary)] uppercase tracking-wider">Recusadas</p>
        </div>
        <div className="card p-2 sm:p-3 text-center bg-[#D2B68A]/10 border-[#D2B68A]/20">
          <p className="text-lg sm:text-xl font-bold text-[#D2B68A]">{formatCurrency(metricas.valorTotal)}</p>
          <p className="text-[7px] sm:text-[10px] text-[var(--text-secondary)] uppercase tracking-wider">Valor Total</p>
        </div>
      </div>

      {/* Filtros */}
      <div className="card p-3">
        <div className="flex flex-wrap gap-2 items-center">
          <div className="flex-1 min-w-[150px] relative">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
            <input
              type="text"
              placeholder="Buscar por cliente, veículo..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-[var(--bg-tertiary)] rounded-lg text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] border border-transparent focus:border-[#D2B68A] outline-none"
            />
          </div>

          <select
            value={filtroStatus}
            onChange={(e) => setFiltroStatus(e.target.value)}
            className="px-3 py-1.5 bg-[var(--bg-tertiary)] rounded-lg text-sm text-[var(--text-primary)] border border-transparent focus:border-[#D2B68A] outline-none"
          >
            <option value="todos">Todos os status</option>
            <option value="enviada">Enviada</option>
            <option value="negociando">Negociando</option>
            <option value="aceita">Aceita</option>
            <option value="recusada">Recusada</option>
          </select>

          <select
            value={filtroVendedor}
            onChange={(e) => setFiltroVendedor(e.target.value)}
            className="px-3 py-1.5 bg-[var(--bg-tertiary)] rounded-lg text-sm text-[var(--text-primary)] border border-transparent focus:border-[#D2B68A] outline-none"
          >
            <option value="">Todos os vendedores</option>
            {membrosEquipe.map(m => (
              <option key={m.id} value={m.id}>{m.nome}</option>
            ))}
          </select>

          <input
            type="date"
            value={dataInicio}
            onChange={(e) => setDataInicio(e.target.value)}
            className="px-3 py-1.5 bg-[var(--bg-tertiary)] rounded-lg text-sm text-[var(--text-primary)] border border-transparent focus:border-[#D2B68A] outline-none w-32"
            placeholder="Início"
          />

          <input
            type="date"
            value={dataFim}
            onChange={(e) => setDataFim(e.target.value)}
            className="px-3 py-1.5 bg-[var(--bg-tertiary)] rounded-lg text-sm text-[var(--text-primary)] border border-transparent focus:border-[#D2B68A] outline-none w-32"
            placeholder="Fim"
          />

          <button
            onClick={() => {
              setBusca('')
              setFiltroStatus('todos')
              setFiltroVendedor('')
              setDataInicio('')
              setDataFim('')
            }}
            className="px-3 py-1.5 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-all text-sm"
          >
            <X size={14} className="inline" /> Limpar
          </button>
        </div>
      </div>

      {/* Tabela */}
      <div className="card overflow-hidden">
        {propostasFiltradas.length === 0 ? (
          <div className="p-12 text-center">
            <FileText size={32} className="mx-auto text-[var(--text-muted)] opacity-30" />
            <p className="text-sm text-[var(--text-muted)] mt-2">Nenhuma proposta encontrada</p>
            <button
              onClick={() => { setEditando(null); resetForm(); setShowModal(true) }}
              className="mt-2 text-sm text-[#D2B68A] hover:underline"
            >
              Criar primeira proposta
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[var(--border-color)] bg-[var(--bg-tertiary)]/50">
                  <th className="text-left p-3 text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">Cliente</th>
                  <th className="text-left p-3 text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">Veículo</th>
                  <th className="text-left p-3 text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">Vendedor</th>
                  <th className="text-left p-3 text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">Valor</th>
                  <th className="text-left p-3 text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">Envio</th>
                  <th className="text-left p-3 text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">Status</th>
                  <th className="text-right p-3 text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">Ações</th>
                </tr>
              </thead>
              <tbody>
                {propostasFiltradas.map((p) => {
                  const status = getStatusBadge(p.status)
                  return (
                    <tr key={p.id} className="border-b border-[var(--border-color)] hover:bg-[var(--bg-tertiary)]/30 transition-all">
                      <td className="p-3">
                        <div>
                          <p className="text-sm font-medium text-[var(--text-primary)]">{p.cliente_nome}</p>
                        </div>
                      </td>
                      <td className="p-3">
                        <span className="text-sm text-[var(--text-secondary)]">{p.veiculo || '-'}</span>
                      </td>
                      <td className="p-3">
                        <span className="text-sm text-[var(--text-secondary)]">{p.vendedor_nome}</span>
                      </td>
                      <td className="p-3">
                        <span className="text-sm font-bold text-[#10B981]">{formatCurrency(p.valor)}</span>
                      </td>
                      <td className="p-3">
                        <span className="text-sm text-[var(--text-secondary)]">{formatDate(p.data_envio)}</span>
                      </td>
                      <td className="p-3">
                        <span className={`text-[10px] px-2 py-1 rounded-full ${status.cor} flex items-center gap-1 w-fit`}>
                          {status.icon} {status.label}
                        </span>
                      </td>
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => handleEditar(p)}
                            className="p-1.5 rounded hover:bg-[#D2B68A]/10 text-[var(--text-secondary)] hover:text-[#D2B68A] transition-colors"
                            title="Editar"
                          >
                            <Edit2 size={14} />
                          </button>
                          <button
                            onClick={() => handleExcluir(p.id)}
                            className="p-1.5 rounded hover:bg-red-500/10 text-[var(--text-secondary)] hover:text-red-500 transition-colors"
                            title="Excluir"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ===== MODAL DE PROPOSTA ===== */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => { setShowModal(false); setEditando(null); resetForm() }} />
          <div className="relative bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl p-6 w-full max-w-md shadow-2xl z-10 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-[var(--text-primary)] flex items-center gap-2">
                <FileText size={20} className="text-[#D2B68A]" />
                {editando ? 'Editar Proposta' : 'Nova Proposta'}
              </h2>
              <button onClick={() => { setShowModal(false); setEditando(null); resetForm() }} className="p-2 rounded-lg hover:bg-[var(--bg-tertiary)] text-[var(--text-secondary)]">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={(e) => { e.preventDefault(); handleSalvar() }} className="space-y-4">
              <div>
                <label className="text-sm font-medium text-[var(--text-secondary)] block mb-1">Cliente *</label>
                <select
                  value={formData.cliente_id}
                  onChange={(e) => setFormData({ ...formData, cliente_id: e.target.value })}
                  className="w-full px-3 py-2 bg-[var(--bg-tertiary)] rounded-lg text-sm text-[var(--text-primary)] border border-[var(--border-color)] focus:border-[#D2B68A] outline-none"
                  required
                >
                  <option value="">Selecione um cliente</option>
                  {clientes.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.nome} {c.veiculo_interesse ? `- ${c.veiculo_interesse}` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-sm font-medium text-[var(--text-secondary)] block mb-1">Vendedor</label>
                <select
                  value={formData.vendedor_id}
                  onChange={(e) => setFormData({ ...formData, vendedor_id: e.target.value })}
                  className="w-full px-3 py-2 bg-[var(--bg-tertiary)] rounded-lg text-sm text-[var(--text-primary)] border border-[var(--border-color)] focus:border-[#D2B68A] outline-none"
                >
                  <option value="">Selecione um vendedor</option>
                  {membrosEquipe.map(m => (
                    <option key={m.id} value={m.id}>{m.nome}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-sm font-medium text-[var(--text-secondary)] block mb-1">Valor (R$) *</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.valor}
                  onChange={(e) => setFormData({ ...formData, valor: e.target.value })}
                  placeholder="0,00"
                  className="w-full px-3 py-2 bg-[var(--bg-tertiary)] rounded-lg text-sm text-[var(--text-primary)] border border-[var(--border-color)] focus:border-[#D2B68A] outline-none"
                  required
                />
              </div>

              <div>
                <label className="text-sm font-medium text-[var(--text-secondary)] block mb-1">Data de Envio *</label>
                <input
                  type="date"
                  value={formData.data_envio}
                  onChange={(e) => setFormData({ ...formData, data_envio: e.target.value })}
                  className="w-full px-3 py-2 bg-[var(--bg-tertiary)] rounded-lg text-sm text-[var(--text-primary)] border border-[var(--border-color)] focus:border-[#D2B68A] outline-none"
                  required
                />
              </div>

              <div>
                <label className="text-sm font-medium text-[var(--text-secondary)] block mb-1">Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="w-full px-3 py-2 bg-[var(--bg-tertiary)] rounded-lg text-sm text-[var(--text-primary)] border border-[var(--border-color)] focus:border-[#D2B68A] outline-none"
                >
                  <option value="enviada">Enviada</option>
                  <option value="negociando">Negociando</option>
                  <option value="aceita">✅ Aceita</option>
                  <option value="recusada">❌ Recusada</option>
                </select>
              </div>

              <div>
                <label className="text-sm font-medium text-[var(--text-secondary)] block mb-1">Observações</label>
                <textarea
                  value={formData.observacoes}
                  onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
                  rows="3"
                  placeholder="Detalhes adicionais..."
                  className="w-full px-3 py-2 bg-[var(--bg-tertiary)] rounded-lg text-sm text-[var(--text-primary)] border border-[var(--border-color)] focus:border-[#D2B68A] outline-none resize-none"
                />
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
                      <FileText size={16} />
                      {editando ? 'Atualizar' : 'Criar'}
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===== RELATÓRIO ===== */}
      <GerarRelatorioModal
        isOpen={showGerarRelatorio}
        onClose={() => setShowGerarRelatorio(false)}
        titulo="Relatório de Propostas"
        dados={dadosRelatorio}
        colunas={colunasRelatorio}
        nomeArquivo="propostas"
      />
    </div>
  )
}