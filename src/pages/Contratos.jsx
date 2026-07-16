import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { formatCurrency, formatDate } from '../utils/formatadores'
import { Download, Plus, Search, X, Eye, Edit2, Trash2, ChevronLeft, ChevronRight } from 'lucide-react'
import toast from 'react-hot-toast'
import RelatorioModal from '../components/common/RelatorioModal'

export default function Contratos() {
  const { user, membrosEquipe } = useAuth()
  const [contratos, setContratos] = useState([])
  const [loading, setLoading] = useState(true)
  const [showRelatorio, setShowRelatorio] = useState(false)
  const [busca, setBusca] = useState('')
  const [filtroVendedor, setFiltroVendedor] = useState('')
  const [dataInicio, setDataInicio] = useState('')
  const [dataFim, setDataFim] = useState('')
  const [pagina, setPagina] = useState(1)
  const [itensPorPagina] = useState(25)
  const [totalContratos, setTotalContratos] = useState(0)

  useEffect(() => {
    if (user?.equipeId) {
      carregarContratos()
    }
  }, [user?.equipeId, pagina, filtroVendedor, dataInicio, dataFim])

  const carregarContratos = async () => {
    setLoading(true)
    try {
      let query = supabase
        .from('contratos')
        .select('*', { count: 'exact' })
        .eq('equipe_id', user.equipeId)
        .order('data_fechamento', { ascending: false })
        .range((pagina - 1) * itensPorPagina, pagina * itensPorPagina - 1)

      if (filtroVendedor) {
        query = query.eq('vendedor_id', filtroVendedor)
      }
      if (dataInicio) {
        query = query.gte('data_fechamento', dataInicio)
      }
      if (dataFim) {
        query = query.lte('data_fechamento', dataFim)
      }

      const { data, error, count } = await query
      if (error) throw error

      // Enriquecer com nomes
      const contratosEnriquecidos = await Promise.all(
        (data || []).map(async (contrato) => {
          let clienteNome = 'Cliente removido'
          if (contrato.cliente_id) {
            const { data: cliente } = await supabase
              .from('contatos')
              .select('nome')
              .eq('id', contrato.cliente_id)
              .single()
            if (cliente) clienteNome = cliente.nome
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
          return { ...contrato, cliente_nome: clienteNome, vendedor_nome: vendedorNome }
        })
      )

      setContratos(contratosEnriquecidos)
      setTotalContratos(count || 0)
    } catch (error) {
      console.error('Erro ao carregar contratos:', error)
      toast.error('Erro ao carregar contratos')
    } finally {
      setLoading(false)
    }
  }

  const colunasRelatorio = [
    { key: 'data_fechamento', label: 'Data', formatter: formatDate },
    { key: 'cliente_nome', label: 'Cliente' },
    { key: 'vendedor_nome', label: 'Vendedor' },
    { key: 'valor_venda', label: 'Valor', formatter: formatCurrency },
    { key: 'comissao', label: 'Comissão', formatter: formatCurrency },
    { key: 'forma_pagamento', label: 'Pagamento' }
  ]

  const totalPaginas = Math.ceil(totalContratos / itensPorPagina)

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="w-8 h-8 border-2 border-[#D2B68A] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-bold text-[var(--text-primary)]">Contratos Fechados</h1>
          <p className="text-sm text-[var(--text-secondary)]">Histórico de vendas concretizadas</p>
        </div>
        <button
          onClick={() => setShowRelatorio(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-green-500/10 text-green-500 hover:bg-green-500/20 transition-colors"
        >
          <Download size={16} /> Relatório
        </button>
      </div>

      {/* Filtros */}
      <div className="card p-3">
        <div className="flex flex-wrap gap-2 items-center">
          <div className="flex-1 min-w-[150px] relative">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
            <input
              type="text"
              placeholder="Buscar cliente..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-[var(--bg-tertiary)] rounded-lg text-sm"
            />
          </div>
          <select
            value={filtroVendedor}
            onChange={(e) => setFiltroVendedor(e.target.value)}
            className="px-3 py-1.5 bg-[var(--bg-tertiary)] rounded-lg text-sm"
          >
            <option value="">Todos vendedores</option>
            {membrosEquipe.map(m => (
              <option key={m.id} value={m.id}>{m.nome}</option>
            ))}
          </select>
          <input
            type="date"
            value={dataInicio}
            onChange={(e) => setDataInicio(e.target.value)}
            className="px-3 py-1.5 bg-[var(--bg-tertiary)] rounded-lg text-sm w-32"
          />
          <input
            type="date"
            value={dataFim}
            onChange={(e) => setDataFim(e.target.value)}
            className="px-3 py-1.5 bg-[var(--bg-tertiary)] rounded-lg text-sm w-32"
          />
          <button
            onClick={() => { setBusca(''); setFiltroVendedor(''); setDataInicio(''); setDataFim('') }}
            className="px-3 py-1.5 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500/20"
          >
            <X size={14} /> Limpar
          </button>
        </div>
      </div>

      {/* Tabela */}
      <div className="card overflow-hidden">
        {contratos.length === 0 ? (
          <div className="p-12 text-center text-[var(--text-muted)]">Nenhum contrato encontrado</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[var(--border-color)] bg-[var(--bg-tertiary)]/50">
                  <th className="text-left p-3 text-[10px] font-semibold uppercase">Cliente</th>
                  <th className="text-left p-3 text-[10px] font-semibold uppercase">Vendedor</th>
                  <th className="text-left p-3 text-[10px] font-semibold uppercase">Valor</th>
                  <th className="text-left p-3 text-[10px] font-semibold uppercase">Data</th>
                  <th className="text-left p-3 text-[10px] font-semibold uppercase">Pagamento</th>
                  <th className="text-right p-3 text-[10px] font-semibold uppercase">Ações</th>
                </tr>
              </thead>
              <tbody>
                {contratos
                  .filter(c => c.cliente_nome?.toLowerCase().includes(busca.toLowerCase()) || !busca)
                  .map((c) => (
                    <tr key={c.id} className="border-b hover:bg-[var(--bg-tertiary)]/30">
                      <td className="p-3 text-sm text-[var(--text-primary)]">{c.cliente_nome}</td>
                      <td className="p-3 text-sm text-[var(--text-secondary)]">{c.vendedor_nome}</td>
                      <td className="p-3 text-sm font-bold text-[#10B981]">{formatCurrency(c.valor_venda)}</td>
                      <td className="p-3 text-sm text-[var(--text-secondary)]">{formatDate(c.data_fechamento)}</td>
                      <td className="p-3">
                        <span className="text-[10px] px-2 py-1 rounded-full bg-blue-500/10 text-blue-500">
                          {c.forma_pagamento === 'a_vista' ? 'À Vista' :
                           c.forma_pagamento === 'financiado' ? 'Financiado' : 'Consórcio'}
                        </span>
                      </td>
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button className="p-1.5 rounded hover:bg-[#D2B68A]/10 text-[var(--text-secondary)] hover:text-[#D2B68A]">
                            <Eye size={14} />
                          </button>
                          <button className="p-1.5 rounded hover:bg-[#D2B68A]/10 text-[var(--text-secondary)] hover:text-[#D2B68A]">
                            <Edit2 size={14} />
                          </button>
                          <button className="p-1.5 rounded hover:bg-red-500/10 text-[var(--text-secondary)] hover:text-red-500">
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

      {/* Paginação */}
      {totalContratos > 0 && (
        <div className="flex items-center justify-between p-3 border-t border-[var(--border-color)]">
          <span className="text-xs text-[var(--text-secondary)]">
            {((pagina - 1) * itensPorPagina) + 1} - {Math.min(pagina * itensPorPagina, totalContratos)} de {totalContratos}
          </span>
          <div className="flex gap-1">
            <button
              onClick={() => setPagina(p => Math.max(1, p - 1))}
              disabled={pagina === 1}
              className="p-2 rounded hover:bg-[var(--bg-tertiary)] disabled:opacity-50"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="px-3 py-1 text-sm">Pág. {pagina} de {totalPaginas}</span>
            <button
              onClick={() => setPagina(p => Math.min(totalPaginas, p + 1))}
              disabled={pagina === totalPaginas}
              className="p-2 rounded hover:bg-[var(--bg-tertiary)] disabled:opacity-50"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}

      <RelatorioModal
        isOpen={showRelatorio}
        onClose={() => setShowRelatorio(false)}
        titulo="Relatório de Contratos"
        dados={contratos.filter(c => c.cliente_nome?.toLowerCase().includes(busca.toLowerCase()) || !busca)}
        colunas={colunasRelatorio}
        nomeArquivo="contratos"
      />
    </div>
  )
}