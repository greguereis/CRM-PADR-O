import { useState, useEffect, useRef } from 'react'
import { 
  Plus, Search, Filter, X, ChevronLeft, ChevronRight,
  FileText, Download, Calendar, DollarSign, User, Briefcase,
  CheckCircle, XCircle, Clock, AlertCircle, Eye, Edit2, Trash2,
  Loader2, RefreshCw
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import toast from 'react-hot-toast'
import RelatorioModal from '../components/common/RelatorioModal'
import { formatCurrency, formatDate, formatDateTime } from '../utils/formatadores'
import { useListas } from '../hooks/useListas'

const statusOptions = [
  { value: 'todos', label: 'Todos os status' },
  { value: 'enviada', label: 'Enviada' },
  { value: 'negociando', label: 'Negociando' },
  { value: 'aceita', label: 'Aceita' },
  { value: 'recusada', label: 'Recusada' },
]

export default function Propostas() {
  const { user, membrosEquipe } = useAuth()
  const { listas } = useListas()
  
  const [propostas, setPropostas] = useState([])
  const [propostasFiltradas, setPropostasFiltradas] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filtroStatus, setFiltroStatus] = useState('todos')
  const [filtroVendedor, setFiltroVendedor] = useState('todos')
  const [dataInicio, setDataInicio] = useState('')
  const [dataFim, setDataFim] = useState('')
  const [showRelatorio, setShowRelatorio] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [editando, setEditando] = useState(null)
  
  const carregadoRef = useRef(false)

  // Estados para nova proposta
  const [novaProposta, setNovaProposta] = useState({
    cliente_nome: '',
    cliente_telefone: '',
    cliente_email: '',
    veiculo: '',
    valor: '',
    data_envio: new Date().toISOString().split('T')[0],
    status: 'enviada',
    vendedor_id: user?.uid || '',
    observacoes: ''
  })
  const [salvando, setSalvando] = useState(false)

  useEffect(() => {
    if (user?.equipeId && !carregadoRef.current) {
      carregadoRef.current = true
      carregarPropostas()
    }
  }, [user?.equipeId])

  useEffect(() => {
    aplicarFiltros()
  }, [propostas, searchTerm, filtroStatus, filtroVendedor, dataInicio, dataFim])

  const carregarPropostas = async () => {
    if (!user?.equipeId) return
    
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('propostas')
        .select('*')
        .eq('equipe_id', user.equipeId)
        .order('data_envio', { ascending: false })

      if (error) throw error

      // Buscar nomes dos clientes e vendedores
      const propostasCompletas = await Promise.all((data || []).map(async (proposta) => {
        let clienteNome = proposta.cliente_nome || 'Cliente removido'
        let vendedorNome = 'Desconhecido'
        
        // Buscar cliente se tiver cliente_id
        if (proposta.cliente_id) {
          const { data: clienteData } = await supabase
            .from('contatos')
            .select('nome')
            .eq('id', proposta.cliente_id)
            .single()
          if (clienteData) clienteNome = clienteData.nome
        }
        
        // Buscar vendedor
        if (proposta.vendedor_id) {
          const vendedor = membrosEquipe.find(m => m.id === proposta.vendedor_id)
          if (vendedor) vendedorNome = vendedor.nome
        }
        
        return {
          ...proposta,
          cliente_nome: clienteNome,
          vendedor_nome: vendedorNome
        }
      }))

      setPropostas(propostasCompletas)
    } catch (error) {
      console.error('Erro ao carregar propostas:', error)
      toast.error('Erro ao carregar propostas')
    } finally {
      setLoading(false)
    }
  }

  const aplicarFiltros = () => {
    let filtrados = [...propostas]

    // Busca
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase().trim()
      filtrados = filtrados.filter(p =>
        p.cliente_nome?.toLowerCase().includes(term) ||
        p.veiculo?.toLowerCase().includes(term) ||
        p.observacoes?.toLowerCase().includes(term)
      )
    }

    // Status
    if (filtroStatus !== 'todos') {
      filtrados = filtrados.filter(p => p.status === filtroStatus)
    }

    // Vendedor
    if (filtroVendedor !== 'todos') {
      filtrados = filtrados.filter(p => p.vendedor_id === filtroVendedor)
    }

    // Período
    if (dataInicio) {
      filtrados = filtrados.filter(p => p.data_envio >= dataInicio)
    }
    if (dataFim) {
      filtrados = filtrados.filter(p => p.data_envio <= dataFim)
    }

    setPropostasFiltradas(filtrados)
  }

  const handleSalvarProposta = async () => {
    if (!novaProposta.cliente_nome.trim()) {
      toast.error('Nome do cliente é obrigatório')
      return
    }
    if (!novaProposta.valor || parseFloat(novaProposta.valor) <= 0) {
      toast.error('Valor da proposta é obrigatório')
      return
    }

    setSalvando(true)
    try {
      const dados = {
        equipe_id: user.equipeId,
        cliente_nome: novaProposta.cliente_nome.trim(),
        cliente_telefone: novaProposta.cliente_telefone || null,
        cliente_email: novaProposta.cliente_email || null,
        veiculo: novaProposta.veiculo || null,
        valor: parseFloat(novaProposta.valor),
        data_envio: novaProposta.data_envio || new Date().toISOString().split('T')[0],
        status: novaProposta.status,
        vendedor_id: novaProposta.vendedor_id || user.uid,
        observacoes: novaProposta.observacoes || null,
        criado_por: user.uid,
        criado_em: new Date().toISOString()
      }

      const { data, error } = await supabase
        .from('propostas')
        .insert(dados)
        .select()
        .single()

      if (error) throw error

      toast.success('Proposta criada com sucesso!')
      setShowModal(false)
      setNovaProposta({
        cliente_nome: '',
        cliente_telefone: '',
        cliente_email: '',
        veiculo: '',
        valor: '',
        data_envio: new Date().toISOString().split('T')[0],
        status: 'enviada',
        vendedor_id: user?.uid || '',
        observacoes: ''
      })
      carregarPropostas()
    } catch (error) {
      console.error('Erro ao salvar proposta:', error)
      toast.error('Erro ao salvar proposta')
    } finally {
      setSalvando(false)
    }
  }

  const handleAtualizarStatus = async (id, novoStatus) => {
    try {
      const { error } = await supabase
        .from('propostas')
        .update({ status: novoStatus })
        .eq('id', id)

      if (error) throw error

      toast.success(`Status atualizado para ${novoStatus}`)
      carregarPropostas()
    } catch (error) {
      console.error('Erro ao atualizar status:', error)
      toast.error('Erro ao atualizar status')
    }
  }

  const handleExcluirProposta = async (id) => {
    if (!confirm('Tem certeza que deseja excluir esta proposta?')) return

    try {
      const { error } = await supabase
        .from('propostas')
        .delete()
        .eq('id', id)

      if (error) throw error

      toast.success('Proposta excluída!')
      carregarPropostas()
    } catch (error) {
      console.error('Erro ao excluir proposta:', error)
      toast.error('Erro ao excluir proposta')
    }
  }

  const getStatusBadge = (status) => {
    const config = {
      enviada: { label: 'Enviada', cor: 'bg-blue-500/20 text-blue-500', icone: <Clock size={12} /> },
      negociando: { label: 'Negociando', cor: 'bg-amber-500/20 text-amber-500', icone: <AlertCircle size={12} /> },
      aceita: { label: 'Aceita', cor: 'bg-green-500/20 text-green-500', icone: <CheckCircle size={12} /> },
      recusada: { label: 'Recusada', cor: 'bg-red-500/20 text-red-500', icone: <XCircle size={12} /> }
    }
    const c = config[status] || config.enviada
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${c.cor}`}>
        {c.icone} {c.label}
      </span>
    )
  }

  const colunasRelatorio = [
    { key: 'cliente_nome', label: 'Cliente' },
    { key: 'veiculo', label: 'Veículo' },
    { key: 'vendedor_nome', label: 'Vendedor' },
    { key: 'valor', label: 'Valor', formatter: formatCurrency },
    { key: 'data_envio', label: 'Data Envio', formatter: formatDate },
    { key: 'status', label: 'Status' },
  ]

  const totalValor = propostasFiltradas.reduce((acc, p) => acc + (p.valor || 0), 0)
  const totalAceitas = propostasFiltradas.filter(p => p.status === 'aceita').length
  const totalAceitasValor = propostasFiltradas
    .filter(p => p.status === 'aceita')
    .reduce((acc, p) => acc + (p.valor || 0), 0)

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-lg sm:text-2xl font-bold text-[var(--text-primary)] flex items-center gap-2">
            <FileText size={20} className="text-[#D2B68A]" />
            Propostas
          </h1>
          <p className="text-sm text-[var(--text-secondary)]">
            Gerencie todas as propostas enviadas para seus clientes
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setShowRelatorio(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-green-500 text-white hover:bg-green-600 transition-all text-sm"
          >
            <Download size={16} /> Relatório
          </button>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#D2B68A] text-[#222D52] hover:bg-[#C4A67A] transition-all text-sm font-medium"
          >
            <Plus size={16} /> Nova Proposta
          </button>
        </div>
      </div>

      {/* Métricas */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <div className="card p-3 text-center">
          <p className="text-lg sm:text-xl font-bold text-[var(--text-primary)]">{propostasFiltradas.length}</p>
          <p className="text-[10px] text-[var(--text-secondary)] uppercase tracking-wider">Total</p>
        </div>
        <div className="card p-3 text-center">
          <p className="text-lg sm:text-xl font-bold text-amber-500">{formatCurrency(totalValor)}</p>
          <p className="text-[10px] text-[var(--text-secondary)] uppercase tracking-wider">Valor Total</p>
        </div>
        <div className="card p-3 text-center">
          <p className="text-lg sm:text-xl font-bold text-green-500">{totalAceitas}</p>
          <p className="text-[10px] text-[var(--text-secondary)] uppercase tracking-wider">Aceitas</p>
        </div>
        <div className="card p-3 text-center">
          <p className="text-lg sm:text-xl font-bold text-green-500">{formatCurrency(totalAceitasValor)}</p>
          <p className="text-[10px] text-[var(--text-secondary)] uppercase tracking-wider">Valor Aceito</p>
        </div>
      </div>

      {/* Filtros */}
      <div className="card p-3 space-y-2">
        <div className="flex flex-wrap gap-2 items-center">
          <div className="flex-1 min-w-[150px] relative">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
            <input
              type="text"
              placeholder="Buscar por cliente ou veículo..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-[var(--bg-tertiary)] rounded-lg text-sm text-[var(--text-primary)] placeholder-[var(--text-secondary)] border border-transparent focus:border-[#D2B68A] outline-none"
            />
          </div>

          <select
            value={filtroStatus}
            onChange={(e) => setFiltroStatus(e.target.value)}
            className="px-3 py-1.5 bg-[var(--bg-tertiary)] rounded-lg text-sm text-[var(--text-primary)] border border-[var(--border-color)] focus:border-[#D2B68A] outline-none"
          >
            {statusOptions.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>

          <select
            value={filtroVendedor}
            onChange={(e) => setFiltroVendedor(e.target.value)}
            className="px-3 py-1.5 bg-[var(--bg-tertiary)] rounded-lg text-sm text-[var(--text-primary)] border border-[var(--border-color)] focus:border-[#D2B68A] outline-none"
          >
            <option value="todos">Todos os vendedores</option>
            {membrosEquipe.map(m => (
              <option key={m.id} value={m.id}>{m.nome}</option>
            ))}
          </select>

          <div className="flex items-center gap-1">
            <input
              type="date"
              value={dataInicio}
              onChange={(e) => setDataInicio(e.target.value)}
              className="px-2 py-1.5 bg-[var(--bg-tertiary)] rounded-lg text-sm text-[var(--text-primary)] border border-[var(--border-color)] focus:border-[#D2B68A] outline-none w-32"
              placeholder="Início"
            />
            <span className="text-[var(--text-muted)]">até</span>
            <input
              type="date"
              value={dataFim}
              onChange={(e) => setDataFim(e.target.value)}
              className="px-2 py-1.5 bg-[var(--bg-tertiary)] rounded-lg text-sm text-[var(--text-primary)] border border-[var(--border-color)] focus:border-[#D2B68A] outline-none w-32"
              placeholder="Fim"
            />
          </div>

          {(searchTerm || filtroStatus !== 'todos' || filtroVendedor !== 'todos' || dataInicio || dataFim) && (
            <button
              onClick={() => {
                setSearchTerm('')
                setFiltroStatus('todos')
                setFiltroVendedor('todos')
                setDataInicio('')
                setDataFim('')
              }}
              className="p-1.5 rounded-lg hover:bg-red-500/10 text-red-500 transition-colors"
            >
              <X size={18} />
            </button>
          )}
        </div>
      </div>

      {/* Tabela */}
      <div className="card overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <Loader2 size={24} className="animate-spin mx-auto text-[#D2B68A]" />
          </div>
        ) : propostasFiltradas.length === 0 ? (
          <div className="p-12 text-center">
            <FileText size={32} className="mx-auto mb-3 text-[var(--text-muted)]" />
            <p className="text-sm text-[var(--text-secondary)]">Nenhuma proposta encontrada</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--border-color)] bg-[var(--bg-tertiary)]/50">
                  <th className="text-left p-3 text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">Cliente</th>
                  <th className="text-left p-3 text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">Veículo</th>
                  <th className="text-left p-3 text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">Vendedor</th>
                  <th className="text-right p-3 text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">Valor</th>
                  <th className="text-left p-3 text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">Data</th>
                  <th className="text-left p-3 text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">Status</th>
                  <th className="text-center p-3 text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">Ações</th>
                </tr>
              </thead>
              <tbody>
                {propostasFiltradas.map((proposta) => (
                  <tr key={proposta.id} className="border-b border-[var(--border-color)] hover:bg-[var(--bg-tertiary)]/30 transition-colors">
                    <td className="p-3">
                      <div>
                        <p className="font-medium text-[var(--text-primary)]">{proposta.cliente_nome}</p>
                        {proposta.cliente_telefone && (
                          <p className="text-xs text-[var(--text-muted)]">{proposta.cliente_telefone}</p>
                        )}
                      </div>
                    </td>
                    <td className="p-3 text-[var(--text-secondary)]">
                      {proposta.veiculo || '-'}
                    </td>
                    <td className="p-3 text-[var(--text-secondary)]">
                      {proposta.vendedor_nome || '-'}
                    </td>
                    <td className="p-3 text-right font-medium text-[var(--text-primary)]">
                      {formatCurrency(proposta.valor)}
                    </td>
                    <td className="p-3 text-[var(--text-secondary)]">
                      {formatDate(proposta.data_envio)}
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-1">
                        {getStatusBadge(proposta.status)}
                      </div>
                    </td>
                    <td className="p-3">
                      <div className="flex items-center justify-center gap-1">
                        <select
                          value={proposta.status}
                          onChange={(e) => handleAtualizarStatus(proposta.id, e.target.value)}
                          className="text-xs px-2 py-0.5 bg-[var(--bg-tertiary)] rounded border border-[var(--border-color)] focus:border-[#D2B68A] outline-none"
                        >
                          <option value="enviada">Enviada</option>
                          <option value="negociando">Negociando</option>
                          <option value="aceita">Aceita</option>
                          <option value="recusada">Recusada</option>
                        </select>
                        <button
                          onClick={() => handleExcluirProposta(proposta.id)}
                          className="p-1 rounded hover:bg-red-500/10 text-[var(--text-secondary)] hover:text-red-500 transition-colors"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Nova Proposta */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowModal(false)} />
          <div className="relative bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl p-6 w-full max-w-md shadow-2xl z-10 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-[var(--text-primary)] flex items-center gap-2">
                <FileText size={20} className="text-[#D2B68A]" />
                Nova Proposta
              </h2>
              <button onClick={() => setShowModal(false)} className="p-2 rounded-lg hover:bg-[var(--bg-tertiary)] text-[var(--text-secondary)]">
                <X size={20} />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium text-[var(--text-secondary)]">Nome do Cliente *</label>
                <input
                  type="text"
                  value={novaProposta.cliente_nome}
                  onChange={(e) => setNovaProposta({ ...novaProposta, cliente_nome: e.target.value })}
                  placeholder="Nome do cliente"
                  className="w-full mt-1 px-3 py-2 bg-[var(--bg-tertiary)] rounded-lg text-sm text-[var(--text-primary)] border border-[var(--border-color)] focus:border-[#D2B68A] outline-none"
                  autoFocus
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-sm font-medium text-[var(--text-secondary)]">Telefone</label>
                  <input
                    type="text"
                    value={novaProposta.cliente_telefone}
                    onChange={(e) => setNovaProposta({ ...novaProposta, cliente_telefone: e.target.value })}
                    placeholder="(00) 00000-0000"
                    className="w-full mt-1 px-3 py-2 bg-[var(--bg-tertiary)] rounded-lg text-sm text-[var(--text-primary)] border border-[var(--border-color)] focus:border-[#D2B68A] outline-none"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-[var(--text-secondary)]">Email</label>
                  <input
                    type="email"
                    value={novaProposta.cliente_email}
                    onChange={(e) => setNovaProposta({ ...novaProposta, cliente_email: e.target.value })}
                    placeholder="email@exemplo.com"
                    className="w-full mt-1 px-3 py-2 bg-[var(--bg-tertiary)] rounded-lg text-sm text-[var(--text-primary)] border border-[var(--border-color)] focus:border-[#D2B68A] outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-[var(--text-secondary)]">Veículo</label>
                <input
                  type="text"
                  value={novaProposta.veiculo}
                  onChange={(e) => setNovaProposta({ ...novaProposta, veiculo: e.target.value })}
                  placeholder="Ex: Honda Civic 2023"
                  className="w-full mt-1 px-3 py-2 bg-[var(--bg-tertiary)] rounded-lg text-sm text-[var(--text-primary)] border border-[var(--border-color)] focus:border-[#D2B68A] outline-none"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-[var(--text-secondary)]">Valor da Proposta *</label>
                <input
                  type="number"
                  step="0.01"
                  value={novaProposta.valor}
                  onChange={(e) => setNovaProposta({ ...novaProposta, valor: e.target.value })}
                  placeholder="0,00"
                  className="w-full mt-1 px-3 py-2 bg-[var(--bg-tertiary)] rounded-lg text-sm text-[var(--text-primary)] border border-[var(--border-color)] focus:border-[#D2B68A] outline-none"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-[var(--text-secondary)]">Data de Envio</label>
                <input
                  type="date"
                  value={novaProposta.data_envio}
                  onChange={(e) => setNovaProposta({ ...novaProposta, data_envio: e.target.value })}
                  className="w-full mt-1 px-3 py-2 bg-[var(--bg-tertiary)] rounded-lg text-sm text-[var(--text-primary)] border border-[var(--border-color)] focus:border-[#D2B68A] outline-none"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-[var(--text-secondary)]">Status</label>
                <select
                  value={novaProposta.status}
                  onChange={(e) => setNovaProposta({ ...novaProposta, status: e.target.value })}
                  className="w-full mt-1 px-3 py-2 bg-[var(--bg-tertiary)] rounded-lg text-sm text-[var(--text-primary)] border border-[var(--border-color)] focus:border-[#D2B68A] outline-none"
                >
                  <option value="enviada">Enviada</option>
                  <option value="negociando">Negociando</option>
                  <option value="aceita">Aceita</option>
                  <option value="recusada">Recusada</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-[var(--text-secondary)]">Vendedor</label>
                <select
                  value={novaProposta.vendedor_id}
                  onChange={(e) => setNovaProposta({ ...novaProposta, vendedor_id: e.target.value })}
                  className="w-full mt-1 px-3 py-2 bg-[var(--bg-tertiary)] rounded-lg text-sm text-[var(--text-primary)] border border-[var(--border-color)] focus:border-[#D2B68A] outline-none"
                >
                  {membrosEquipe.map(m => (
                    <option key={m.id} value={m.id}>{m.nome}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-[var(--text-secondary)]">Observações</label>
                <textarea
                  value={novaProposta.observacoes}
                  onChange={(e) => setNovaProposta({ ...novaProposta, observacoes: e.target.value })}
                  rows="3"
                  placeholder="Detalhes da proposta..."
                  className="w-full mt-1 px-3 py-2 bg-[var(--bg-tertiary)] rounded-lg text-sm text-[var(--text-primary)] border border-[var(--border-color)] focus:border-[#D2B68A] outline-none resize-none"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-2.5 text-sm rounded-lg border border-[var(--border-color)] text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSalvarProposta}
                  disabled={salvando || !novaProposta.cliente_nome.trim() || !novaProposta.valor}
                  className="flex-1 py-2.5 text-sm rounded-lg bg-[#D2B68A] text-[#222D52] hover:bg-[#C4A67A] disabled:opacity-50 font-medium flex items-center justify-center gap-2"
                >
                  {salvando ? <Loader2 size={16} className="animate-spin" /> : <FileText size={16} />}
                  {salvando ? 'Salvando...' : 'Salvar Proposta'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Relatório */}
      <RelatorioModal
        isOpen={showRelatorio}
        onClose={() => setShowRelatorio(false)}
        titulo="Relatório de Propostas"
        dados={propostasFiltradas}
        colunas={colunasRelatorio}
        nomeArquivo="propostas"
        periodoInicial={dataInicio}
        periodoFinal={dataFim}
      />
    </div>
  )
}