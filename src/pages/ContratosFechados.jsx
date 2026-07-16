import { useState, useEffect, useRef } from 'react'
import { 
  Plus, Search, X, Edit2, Trash2, Eye,
  Download, FileText, DollarSign, Calendar, User, 
  CheckCircle, TrendingUp, BarChart3, RefreshCw,
  Car, Users, CreditCard, TrendingDown
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import toast from 'react-hot-toast'
import RelatorioModal from '../components/common/RelatorioModal'
import { formatCurrency, formatDate, formatDateTime } from '../utils/formatadores'

export default function ContratosFechados() {
  const { user, membrosEquipe } = useAuth()
  
  // Estados
  const [contratos, setContratos] = useState([])
  const [clientes, setClientes] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editando, setEditando] = useState(null)
  const [showRelatorio, setShowRelatorio] = useState(false)
  const [showDetalhes, setShowDetalhes] = useState(null)
  
  // Filtros
  const [busca, setBusca] = useState('')
  const [filtroVendedor, setFiltroVendedor] = useState('')
  const [filtroFormaPagamento, setFiltroFormaPagamento] = useState('todos')
  const [dataInicio, setDataInicio] = useState('')
  const [dataFim, setDataFim] = useState('')
  
  // Formulário
  const [formData, setFormData] = useState({
    cliente_id: '',
    vendedor_id: '',
    valor_venda: '',
    data_fechamento: '',
    comissao: '',
    forma_pagamento: 'a_vista',
    observacoes: ''
  })
  const [salvando, setSalvando] = useState(false)
  
  // Métricas
  const [metricas, setMetricas] = useState({
    total: 0,
    valorTotal: 0,
    comissaoTotal: 0,
    ticketMedio: 0,
    porVendedor: [],
    porFormaPagamento: {
      a_vista: 0,
      financiado: 0,
      consorcio: 0
    }
  })

  const carregadoRef = useRef(false)

  // Carregar dados
  useEffect(() => {
    if (user?.equipeId && !carregadoRef.current) {
      carregadoRef.current = true
      carregarClientes()
      carregarContratos()
    }
  }, [user?.equipeId])

  // Atualizar métricas quando contratos mudarem
  useEffect(() => {
    calcularMetricas()
  }, [contratos])

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

  const carregarContratos = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('contratos')
        .select('*')
        .eq('equipe_id', user.equipeId)
        .order('data_fechamento', { ascending: false })
      
      if (error) throw error
      
      // Enriquecer com nomes
      const contratosEnriquecidos = await Promise.all(
        (data || []).map(async (contrato) => {
          let clienteNome = 'Cliente removido'
          let veiculo = ''
          let telefone = ''
          if (contrato.cliente_id) {
            const { data: cliente } = await supabase
              .from('contatos')
              .select('nome, veiculo_interesse, telefone')
              .eq('id', contrato.cliente_id)
              .single()
            if (cliente) {
              clienteNome = cliente.nome
              veiculo = cliente.veiculo_interesse || ''
              telefone = cliente.telefone || ''
            }
          }
          
          let vendedorNome = 'Vendedor removido'
          if (contrato.vendedor_id) {
            const { data: vendedor } = await supabase
              .from('usuarios')
              .select('nome')
              .eq('id', contrato.vendedor_id)
              .single()
            if (vendedor) vendedorNome = vendedor.nome
          }
          
          return {
            ...contrato,
            cliente_nome: clienteNome,
            veiculo: veiculo,
            cliente_telefone: telefone,
            vendedor_nome: vendedorNome
          }
        })
      )
      
      setContratos(contratosEnriquecidos)
    } catch (error) {
      console.error('Erro ao carregar contratos:', error)
      toast.error('Erro ao carregar contratos')
    } finally {
      setLoading(false)
    }
  }

  // ===== MÉTRICAS =====
  const calcularMetricas = () => {
    const total = contratos.length
    const valorTotal = contratos.reduce((acc, c) => acc + (c.valor_venda || 0), 0)
    const comissaoTotal = contratos.reduce((acc, c) => acc + (c.comissao || 0), 0)
    const ticketMedio = total > 0 ? valorTotal / total : 0
    
    // Por vendedor
    const porVendedor = {}
    contratos.forEach(c => {
      if (c.vendedor_id) {
        if (!porVendedor[c.vendedor_id]) {
          porVendedor[c.vendedor_id] = {
            vendedor_id: c.vendedor_id,
            vendedor_nome: c.vendedor_nome || 'Desconhecido',
            total: 0,
            valor: 0,
            comissao: 0
          }
        }
        porVendedor[c.vendedor_id].total += 1
        porVendedor[c.vendedor_id].valor += c.valor_venda || 0
        porVendedor[c.vendedor_id].comissao += c.comissao || 0
      }
    })
    
    // Por forma de pagamento
    const porFormaPagamento = {
      a_vista: contratos.filter(c => c.forma_pagamento === 'a_vista').length,
      financiado: contratos.filter(c => c.forma_pagamento === 'financiado').length,
      consorcio: contratos.filter(c => c.forma_pagamento === 'consorcio').length
    }
    
    setMetricas({
      total,
      valorTotal,
      comissaoTotal,
      ticketMedio,
      porVendedor: Object.values(porVendedor).sort((a, b) => b.valor - a.valor),
      porFormaPagamento
    })
  }

  // ===== FUNÇÕES DE CRUD =====
  const handleSalvar = async () => {
    if (!formData.cliente_id) {
      toast.error('Selecione um cliente')
      return
    }
    if (!formData.valor_venda || parseFloat(formData.valor_venda) <= 0) {
      toast.error('Digite um valor de venda válido')
      return
    }
    if (!formData.data_fechamento) {
      toast.error('Selecione a data de fechamento')
      return
    }

    setSalvando(true)
    try {
      const dados = {
        cliente_id: formData.cliente_id,
        vendedor_id: formData.vendedor_id || user.uid,
        valor_venda: parseFloat(formData.valor_venda),
        data_fechamento: formData.data_fechamento,
        comissao: formData.comissao ? parseFloat(formData.comissao) : 0,
        forma_pagamento: formData.forma_pagamento || 'a_vista',
        observacoes: formData.observacoes || null,
        equipe_id: user.equipeId
      }

      if (editando) {
        // Editar
        const { error } = await supabase
          .from('contratos')
          .update(dados)
          .eq('id', editando.id)
        
        if (error) throw error
        toast.success('Contrato atualizado!')
      } else {
        // Criar
        const { error } = await supabase
          .from('contratos')
          .insert([{ ...dados, criado_por: user.uid }])
        
        if (error) throw error
        
        // Atualizar status do contato para 'contrato_fechado'
        await supabase
          .from('contatos')
          .update({ status: 'contrato_fechado' })
          .eq('id', formData.cliente_id)
        
        toast.success('Contrato registrado!')
      }

      setShowModal(false)
      setEditando(null)
      resetForm()
      await carregarContratos()
    } catch (error) {
      console.error('Erro ao salvar contrato:', error)
      toast.error('Erro ao salvar contrato')
    } finally {
      setSalvando(false)
    }
  }

  const handleExcluir = async (id) => {
    if (!confirm('Tem certeza que deseja excluir este contrato? Esta ação não pode ser desfeita.')) return
    
    try {
      const { error } = await supabase
        .from('contratos')
        .delete()
        .eq('id', id)
      
      if (error) throw error
      toast.success('Contrato excluído!')
      await carregarContratos()
    } catch (error) {
      console.error('Erro ao excluir contrato:', error)
      toast.error('Erro ao excluir contrato')
    }
  }

  const handleEditar = (contrato) => {
    setEditando(contrato)
    setFormData({
      cliente_id: contrato.cliente_id || '',
      vendedor_id: contrato.vendedor_id || '',
      valor_venda: contrato.valor_venda || '',
      data_fechamento: contrato.data_fechamento || '',
      comissao: contrato.comissao || '',
      forma_pagamento: contrato.forma_pagamento || 'a_vista',
      observacoes: contrato.observacoes || ''
    })
    setShowModal(true)
  }

  const resetForm = () => {
    setFormData({
      cliente_id: '',
      vendedor_id: '',
      valor_venda: '',
      data_fechamento: '',
      comissao: '',
      forma_pagamento: 'a_vista',
      observacoes: ''
    })
  }

  // ===== FILTROS =====
  const contratosFiltrados = contratos.filter(c => {
    // Busca
    if (busca) {
      const termo = busca.toLowerCase()
      const matchCliente = c.cliente_nome?.toLowerCase().includes(termo)
      const matchVeiculo = c.veiculo?.toLowerCase().includes(termo)
      const matchVendedor = c.vendedor_nome?.toLowerCase().includes(termo)
      if (!matchCliente && !matchVeiculo && !matchVendedor) return false
    }
    
    // Vendedor
    if (filtroVendedor && c.vendedor_id !== filtroVendedor) return false
    
    // Forma de pagamento
    if (filtroFormaPagamento !== 'todos' && c.forma_pagamento !== filtroFormaPagamento) return false
    
    // Período
    if (dataInicio && c.data_fechamento < dataInicio) return false
    if (dataFim && c.data_fechamento > dataFim) return false
    
    return true
  })

  // ===== RELATÓRIO =====
  const colunasRelatorio = [
    { key: 'data_fechamento', label: 'Data Fechamento', formatter: formatDate },
    { key: 'cliente_nome', label: 'Cliente' },
    { key: 'veiculo', label: 'Veículo' },
    { key: 'vendedor_nome', label: 'Vendedor' },
    { key: 'valor_venda', label: 'Valor Venda', formatter: formatCurrency },
    { key: 'comissao', label: 'Comissão', formatter: formatCurrency },
    { key: 'forma_pagamento', label: 'Forma Pagamento' },
    { key: 'observacoes', label: 'Observações' }
  ]

  const dadosRelatorio = contratosFiltrados.map(c => ({
    ...c,
    forma_pagamento: c.forma_pagamento === 'a_vista' ? 'À Vista' : 
                     c.forma_pagamento === 'financiado' ? 'Financiado' : 'Consórcio'
  }))

  // ===== RENDER =====
  const getFormaPagamentoLabel = (forma) => {
    const map = {
      a_vista: 'À Vista',
      financiado: 'Financiado',
      consorcio: 'Consórcio'
    }
    return map[forma] || forma
  }

  const getFormaPagamentoBadge = (forma) => {
    const cores = {
      a_vista: 'bg-green-500/10 text-green-500',
      financiado: 'bg-blue-500/10 text-blue-500',
      consorcio: 'bg-purple-500/10 text-purple-500'
    }
    return cores[forma] || 'bg-gray-500/10 text-gray-500'
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-[#D2B68A] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-[var(--text-secondary)]">Carregando contratos...</p>
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
            <CheckCircle size={24} className="text-[#D2B68A]" />
            Contratos Fechados
          </h1>
          <p className="text-xs sm:text-sm text-[var(--text-secondary)]">
            Histórico completo de todas as vendas concretizadas
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
            Novo Contrato
          </button>
        </div>
      </div>

      {/* Métricas */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 sm:gap-2">
        <div className="card p-2 sm:p-3 text-center">
          <p className="text-lg sm:text-xl font-bold text-[var(--text-primary)]">{metricas.total}</p>
          <p className="text-[7px] sm:text-[10px] text-[var(--text-secondary)] uppercase tracking-wider">Total Vendas</p>
        </div>
        <div className="card p-2 sm:p-3 text-center">
          <p className="text-lg sm:text-xl font-bold text-[#10B981]">{formatCurrency(metricas.valorTotal)}</p>
          <p className="text-[7px] sm:text-[10px] text-[var(--text-secondary)] uppercase tracking-wider">Faturamento</p>
        </div>
        <div className="card p-2 sm:p-3 text-center">
          <p className="text-lg sm:text-xl font-bold text-[#D2B68A]">{formatCurrency(metricas.comissaoTotal)}</p>
          <p className="text-[7px] sm:text-[10px] text-[var(--text-secondary)] uppercase tracking-wider">Comissão Total</p>
        </div>
        <div className="card p-2 sm:p-3 text-center">
          <p className="text-lg sm:text-xl font-bold text-blue-500">{formatCurrency(metricas.ticketMedio)}</p>
          <p className="text-[7px] sm:text-[10px] text-[var(--text-secondary)] uppercase tracking-wider">Ticket Médio</p>
        </div>
      </div>

      {/* Métricas por Vendedor */}
      {metricas.porVendedor.length > 0 && (
        <div className="card p-3">
          <h4 className="text-xs font-semibold text-[var(--text-secondary)] mb-2 flex items-center gap-2">
            <Users size={14} className="text-[#D2B68A]" />
            Performance por Vendedor
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {metricas.porVendedor.map((v, index) => (
              <div key={v.vendedor_id} className="flex items-center justify-between bg-[var(--bg-tertiary)] rounded-lg px-3 py-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-[var(--text-muted)]">#{index + 1}</span>
                  <span className="text-sm font-medium text-[var(--text-primary)]">{v.vendedor_nome}</span>
                </div>
                <div className="text-right">
                  <span className="text-sm font-bold text-[#10B981]">{formatCurrency(v.valor)}</span>
                  <span className="text-[10px] text-[var(--text-muted)] ml-2">{v.total} vendas</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

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
            value={filtroVendedor}
            onChange={(e) => setFiltroVendedor(e.target.value)}
            className="px-3 py-1.5 bg-[var(--bg-tertiary)] rounded-lg text-sm text-[var(--text-primary)] border border-transparent focus:border-[#D2B68A] outline-none"
          >
            <option value="">Todos os vendedores</option>
            {membrosEquipe.map(m => (
              <option key={m.id} value={m.id}>{m.nome}</option>
            ))}
          </select>

          <select
            value={filtroFormaPagamento}
            onChange={(e) => setFiltroFormaPagamento(e.target.value)}
            className="px-3 py-1.5 bg-[var(--bg-tertiary)] rounded-lg text-sm text-[var(--text-primary)] border border-transparent focus:border-[#D2B68A] outline-none"
          >
            <option value="todos">Todos os pagamentos</option>
            <option value="a_vista">À Vista</option>
            <option value="financiado">Financiado</option>
            <option value="consorcio">Consórcio</option>
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
              setFiltroVendedor('')
              setFiltroFormaPagamento('todos')
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
        {contratosFiltrados.length === 0 ? (
          <div className="p-12 text-center">
            <CheckCircle size={32} className="mx-auto text-[var(--text-muted)] opacity-30" />
            <p className="text-sm text-[var(--text-muted)] mt-2">Nenhum contrato encontrado</p>
            <button
              onClick={() => { setEditando(null); resetForm(); setShowModal(true) }}
              className="mt-2 text-sm text-[#D2B68A] hover:underline"
            >
              Registrar primeira venda
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
                  <th className="text-left p-3 text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">Data</th>
                  <th className="text-left p-3 text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">Pagamento</th>
                  <th className="text-right p-3 text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">Ações</th>
                </tr>
              </thead>
              <tbody>
                {contratosFiltrados.map((c) => (
                  <tr key={c.id} className="border-b border-[var(--border-color)] hover:bg-[var(--bg-tertiary)]/30 transition-all">
                    <td className="p-3">
                      <div>
                        <p className="text-sm font-medium text-[var(--text-primary)]">{c.cliente_nome}</p>
                        {c.cliente_telefone && (
                          <p className="text-xs text-[var(--text-muted)] font-mono">{c.cliente_telefone}</p>
                        )}
                      </div>
                    </td>
                    <td className="p-3">
                      <span className="text-sm text-[var(--text-secondary)]">{c.veiculo || '-'}</span>
                    </td>
                    <td className="p-3">
                      <span className="text-sm text-[var(--text-secondary)]">{c.vendedor_nome}</span>
                    </td>
                    <td className="p-3">
                      <div>
                        <span className="text-sm font-bold text-[#10B981]">{formatCurrency(c.valor_venda)}</span>
                        {c.comissao > 0 && (
                          <span className="text-[10px] text-[var(--text-muted)] ml-1">
                            (comissão: {formatCurrency(c.comissao)})
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="p-3">
                      <span className="text-sm text-[var(--text-secondary)]">{formatDate(c.data_fechamento)}</span>
                    </td>
                    <td className="p-3">
                      <span className={`text-[10px] px-2 py-1 rounded-full ${getFormaPagamentoBadge(c.forma_pagamento)}`}>
                        {getFormaPagamentoLabel(c.forma_pagamento)}
                      </span>
                    </td>
                    <td className="p-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => setShowDetalhes(c)}
                          className="p-1.5 rounded hover:bg-[#D2B68A]/10 text-[var(--text-secondary)] hover:text-[#D2B68A] transition-colors"
                          title="Ver detalhes"
                        >
                          <Eye size={14} />
                        </button>
                        <button
                          onClick={() => handleEditar(c)}
                          className="p-1.5 rounded hover:bg-[#D2B68A]/10 text-[var(--text-secondary)] hover:text-[#D2B68A] transition-colors"
                          title="Editar"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          onClick={() => handleExcluir(c.id)}
                          className="p-1.5 rounded hover:bg-red-500/10 text-[var(--text-secondary)] hover:text-red-500 transition-colors"
                          title="Excluir"
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

      {/* ===== MODAL DE CONTRATO ===== */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => { setShowModal(false); setEditando(null); resetForm() }} />
          <div className="relative bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl p-6 w-full max-w-md shadow-2xl z-10 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-[var(--text-primary)] flex items-center gap-2">
                <CheckCircle size={20} className="text-[#D2B68A]" />
                {editando ? 'Editar Contrato' : 'Novo Contrato'}
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
                <label className="text-sm font-medium text-[var(--text-secondary)] block mb-1">Valor da Venda (R$) *</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.valor_venda}
                  onChange={(e) => setFormData({ ...formData, valor_venda: e.target.value })}
                  placeholder="0,00"
                  className="w-full px-3 py-2 bg-[var(--bg-tertiary)] rounded-lg text-sm text-[var(--text-primary)] border border-[var(--border-color)] focus:border-[#D2B68A] outline-none"
                  required
                />
              </div>

              <div>
                <label className="text-sm font-medium text-[var(--text-secondary)] block mb-1">Data de Fechamento *</label>
                <input
                  type="date"
                  value={formData.data_fechamento}
                  onChange={(e) => setFormData({ ...formData, data_fechamento: e.target.value })}
                  className="w-full px-3 py-2 bg-[var(--bg-tertiary)] rounded-lg text-sm text-[var(--text-primary)] border border-[var(--border-color)] focus:border-[#D2B68A] outline-none"
                  required
                />
              </div>

              <div>
                <label className="text-sm font-medium text-[var(--text-secondary)] block mb-1">Comissão (R$)</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.comissao}
                  onChange={(e) => setFormData({ ...formData, comissao: e.target.value })}
                  placeholder="0,00"
                  className="w-full px-3 py-2 bg-[var(--bg-tertiary)] rounded-lg text-sm text-[var(--text-primary)] border border-[var(--border-color)] focus:border-[#D2B68A] outline-none"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-[var(--text-secondary)] block mb-1">Forma de Pagamento</label>
                <select
                  value={formData.forma_pagamento}
                  onChange={(e) => setFormData({ ...formData, forma_pagamento: e.target.value })}
                  className="w-full px-3 py-2 bg-[var(--bg-tertiary)] rounded-lg text-sm text-[var(--text-primary)] border border-[var(--border-color)] focus:border-[#D2B68A] outline-none"
                >
                  <option value="a_vista">À Vista</option>
                  <option value="financiado">Financiado</option>
                  <option value="consorcio">Consórcio</option>
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
                      <CheckCircle size={16} />
                      {editando ? 'Atualizar' : 'Registrar'}
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===== MODAL DE DETALHES ===== */}
      {showDetalhes && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowDetalhes(null)} />
          <div className="relative bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl p-6 w-full max-w-md shadow-2xl z-10">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-[var(--text-primary)] flex items-center gap-2">
                <Eye size={20} className="text-[#D2B68A]" />
                Detalhes do Contrato
              </h2>
              <button onClick={() => setShowDetalhes(null)} className="p-2 rounded-lg hover:bg-[var(--bg-tertiary)] text-[var(--text-secondary)]">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-[var(--bg-tertiary)] p-3 rounded-lg">
                  <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider">Cliente</p>
                  <p className="text-sm font-medium text-[var(--text-primary)]">{showDetalhes.cliente_nome}</p>
                </div>
                <div className="bg-[var(--bg-tertiary)] p-3 rounded-lg">
                  <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider">Veículo</p>
                  <p className="text-sm font-medium text-[var(--text-primary)]">{showDetalhes.veiculo || '-'}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="bg-[var(--bg-tertiary)] p-3 rounded-lg">
                  <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider">Vendedor</p>
                  <p className="text-sm font-medium text-[var(--text-primary)]">{showDetalhes.vendedor_nome}</p>
                </div>
                <div className="bg-[var(--bg-tertiary)] p-3 rounded-lg">
                  <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider">Data</p>
                  <p className="text-sm font-medium text-[var(--text-primary)]">{formatDate(showDetalhes.data_fechamento)}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="bg-[var(--bg-tertiary)] p-3 rounded-lg">
                  <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider">Valor</p>
                  <p className="text-lg font-bold text-[#10B981]">{formatCurrency(showDetalhes.valor_venda)}</p>
                </div>
                <div className="bg-[var(--bg-tertiary)] p-3 rounded-lg">
                  <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider">Comissão</p>
                  <p className="text-lg font-bold text-[#D2B68A]">{formatCurrency(showDetalhes.comissao)}</p>
                </div>
              </div>

              <div className="bg-[var(--bg-tertiary)] p-3 rounded-lg">
                <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider">Forma de Pagamento</p>
                <p className="text-sm font-medium text-[var(--text-primary)]">{getFormaPagamentoLabel(showDetalhes.forma_pagamento)}</p>
              </div>

              {showDetalhes.observacoes && (
                <div className="bg-[var(--bg-tertiary)] p-3 rounded-lg">
                  <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider">Observações</p>
                  <p className="text-sm text-[var(--text-primary)]">{showDetalhes.observacoes}</p>
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => { setShowDetalhes(null); handleEditar(showDetalhes) }}
                  className="flex-1 py-2.5 text-sm rounded-lg bg-[#D2B68A] text-[#222D52] hover:bg-[#C4A67A] transition-colors flex items-center justify-center gap-2"
                >
                  <Edit2 size={16} />
                  Editar
                </button>
                <button
                  onClick={() => { setShowDetalhes(null) }}
                  className="flex-1 py-2.5 text-sm rounded-lg border border-[var(--border-color)] text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] transition-colors"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===== RELATÓRIO ===== */}
      <RelatorioModal
        isOpen={showRelatorio}
        onClose={() => setShowRelatorio(false)}
        titulo="Relatório de Contratos Fechados"
        dados={dadosRelatorio}
        colunas={colunasRelatorio}
        nomeArquivo="contratos-fechados"
      />
    </div>
  )
}