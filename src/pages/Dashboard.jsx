import { useState, useEffect, useRef } from 'react'
import { 
  Users, Car, DollarSign, TrendingUp,
  Calendar, CheckCircle, BarChart3,
  RefreshCw, Sparkles
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { formatCurrency, formatDate } from '../utils/formatadores'
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts'
import GerarRelatorioModal from '../components/common/GerarRelatorioModal'
import toast from 'react-hot-toast'

export default function Dashboard() {
  const { user, membrosEquipe } = useAuth()
  
  // Estados
  const [loading, setLoading] = useState(true)
  const [showGerarRelatorio, setShowGerarRelatorio] = useState(false)
  const [periodo, setPeriodo] = useState('mes') // dia, semana, mes
  
  // Dados do Dashboard
  const [kpis, setKpis] = useState({
    totalLeads: 0,
    leadsMes: 0,
    leadsHoje: 0,
    leadsSemana: 0,
    totalVendas: 0,
    vendasMes: 0,
    vendasHoje: 0,
    faturamentoMes: 0,
    faturamentoTotal: 0,
    ticketMedio: 0,
    comissaoTotal: 0,
    leadsPorOrigem: [],
    vendasPorVendedor: [],
    evolucaoVendas: [],
    taxaConversao: 0,
    leadsStatus: [],
    propostasEnviadas: 0,
    propostasAceitas: 0,
    testDrivesAgendados: 0,
    testDrivesRealizados: 0,
    followupsHoje: 0,
    atendimentosPendentes: 0
  })
  
  const [dadosGraficoLinha, setDadosGraficoLinha] = useState([])
  const [dadosGraficoOrigem, setDadosGraficoOrigem] = useState([])
  const [dadosGraficoVendedores, setDadosGraficoVendedores] = useState([])
  const [dadosGraficoStatus, setDadosGraficoStatus] = useState([])
  const [contratos, setContratos] = useState([])
  const [leads, setLeads] = useState([])

  const carregadoRef = useRef(false)

  // Cores para gráficos
  const CORES = ['#D2B68A', '#3B82F6', '#10B981', '#8B5CF6', '#F59E0B', '#EF4444', '#EC4899', '#06B6D4', '#84CC16', '#F97316']
  const CORES_STATUS = {
    lead_entrou: '#9CA3AF',
    contato_inicial: '#3B82F6',
    agendou_visita: '#F59E0B',
    atendido: '#8B5CF6',
    proposta_enviada: '#6366F1',
    negociacao: '#F97316',
    contrato_fechado: '#10B981',
    perdeu: '#EF4444'
  }

  // ===== CARREGAR DADOS =====
  useEffect(() => {
    if (user?.equipeId && !carregadoRef.current) {
      carregadoRef.current = true
      carregarDashboard()
    }
  }, [user?.equipeId])

  useEffect(() => {
    if (carregadoRef.current) {
      carregarDashboard()
    }
  }, [periodo])

  const carregarDashboard = async () => {
    if (!user?.equipeId) {
      setLoading(false)
      return
    }
    
    setLoading(true)
    try {
      const hoje = new Date()
      const inicioHoje = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate()).toISOString()
      const fimHoje = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() + 1).toISOString()
      
      const inicioSemana = new Date(hoje)
      inicioSemana.setDate(inicioSemana.getDate() - 7)
      const inicioSemanaStr = inicioSemana.toISOString()
      
      const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1).toISOString()
      const fimMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0).toISOString()

      // ===== LEADS =====
      const { data: todosLeads } = await supabase
        .from('contatos')
        .select('*')
        .eq('equipe_id', user.equipeId)
        .is('deletado_em', null)

      const leadsData = todosLeads || []
      setLeads(leadsData)
      const totalLeads = leadsData.length

      // Leads por período
      const leadsHoje = leadsData.filter(l => l.data_criacao >= inicioHoje && l.data_criacao < fimHoje)
      const leadsSemana = leadsData.filter(l => l.data_criacao >= inicioSemanaStr)
      const leadsMes = leadsData.filter(l => l.data_criacao >= inicioMes && l.data_criacao < fimMes)

      // ===== CONTRATOS (VENDAS) =====
      const { data: todosContratos } = await supabase
        .from('contratos')
        .select('*')
        .eq('equipe_id', user.equipeId)

      const contratosData = todosContratos || []
      setContratos(contratosData)
      const totalVendas = contratosData.length

      const vendasHoje = contratosData.filter(c => c.data_fechamento >= inicioHoje && c.data_fechamento < fimHoje)
      const vendasMes = contratosData.filter(c => c.data_fechamento >= inicioMes && c.data_fechamento < fimMes)

      const faturamentoTotal = contratosData.reduce((acc, c) => acc + (c.valor_venda || 0), 0)
      const faturamentoMes = vendasMes.reduce((acc, c) => acc + (c.valor_venda || 0), 0)
      const comissaoTotal = contratosData.reduce((acc, c) => acc + (c.comissao || 0), 0)
      
      const ticketMedio = totalVendas > 0 ? faturamentoTotal / totalVendas : 0

      // ===== LEADS POR ORIGEM =====
      const origemMap = {}
      leadsData.forEach(l => {
        const origem = l.origem || 'trafego_pago'
        origemMap[origem] = (origemMap[origem] || 0) + 1
      })
      const leadsPorOrigem = Object.entries(origemMap).map(([name, value]) => {
        const labels = {
          trafego_pago: 'Tráfego Pago',
          loja_fisica: 'Loja Física',
          indicacao: 'Indicação'
        }
        return { name: labels[name] || name, value }
      })

      // ===== VENDAS POR VENDEDOR =====
      const vendedorMap = {}
      for (const contrato of contratosData) {
        if (contrato.vendedor_id) {
          let nome = 'Desconhecido'
          const { data: vendedor } = await supabase
            .from('usuarios')
            .select('nome')
            .eq('id', contrato.vendedor_id)
            .single()
          if (vendedor) nome = vendedor.nome
          
          if (!vendedorMap[contrato.vendedor_id]) {
            vendedorMap[contrato.vendedor_id] = { nome, total: 0, valor: 0 }
          }
          vendedorMap[contrato.vendedor_id].total += 1
          vendedorMap[contrato.vendedor_id].valor += contrato.valor_venda || 0
        }
      }
      const vendasPorVendedor = Object.values(vendedorMap)
        .sort((a, b) => b.valor - a.valor)

      // ===== EVOLUÇÃO DE VENDAS (ÚLTIMOS 12 MESES) =====
      const evolucaoMap = {}
      const meses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
      for (let i = 0; i < 12; i++) {
        const d = new Date()
        d.setMonth(d.getMonth() - i)
        const chave = `${meses[d.getMonth()]} ${d.getFullYear()}`
        evolucaoMap[chave] = 0
      }
      
      contratosData.forEach(c => {
        if (c.data_fechamento) {
          const d = new Date(c.data_fechamento)
          const chave = `${meses[d.getMonth()]} ${d.getFullYear()}`
          if (evolucaoMap[chave] !== undefined) {
            evolucaoMap[chave] += c.valor_venda || 0
          }
        }
      })
      
      const evolucaoVendas = Object.entries(evolucaoMap)
        .reverse()
        .map(([mes, valor]) => ({ mes, valor }))

      // ===== STATUS DOS LEADS =====
      const statusMap = {}
      leadsData.forEach(l => {
        const status = l.status || 'lead_entrou'
        statusMap[status] = (statusMap[status] || 0) + 1
      })
      const leadsStatus = Object.entries(statusMap)
        .map(([status, value]) => {
          const labels = {
            lead_entrou: 'Lead Entrou',
            contato_inicial: 'Contato Inicial',
            agendou_visita: 'Agendou Visita',
            atendido: 'Atendido',
            proposta_enviada: 'Proposta Enviada',
            negociacao: 'Negociação',
            contrato_fechado: '✅ Fechado',
            perdeu: 'Perdeu'
          }
          return { name: labels[status] || status, value, status }
        })
        .sort((a, b) => b.value - a.value)

      // ===== PROPOSTAS =====
      const { data: todasPropostas } = await supabase
        .from('propostas')
        .select('status')
        .eq('equipe_id', user.equipeId)
      
      const propostas = todasPropostas || []
      const propostasEnviadas = propostas.filter(p => p.status === 'enviada' || p.status === 'negociando').length
      const propostasAceitas = propostas.filter(p => p.status === 'aceita').length

      // ===== TEST-DRIVES =====
      const { data: todosEventos } = await supabase
        .from('eventos')
        .select('*')
        .eq('tipo', 'test_drive')
        .eq('criado_por', user.id)

      const eventos = todosEventos || []
      const testDrivesAgendados = eventos.filter(e => new Date(e.data_hora) >= new Date()).length
      const testDrivesRealizados = eventos.filter(e => new Date(e.data_hora) < new Date()).length

      // ===== FOLLOW-UPS DE HOJE =====
      const { data: interacoesHoje } = await supabase
        .from('historico_interacoes')
        .select('id')
        .eq('tipo', 'follow_up')
        .gte('data', inicioHoje)
        .lt('data', fimHoje)

      // ===== ATENDIMENTOS PENDENTES =====
      const atendimentosPendentes = leadsData.filter(l => 
        l.status === 'lead_entrou' || l.status === 'contato_inicial'
      ).length

      // ===== TAXA DE CONVERSÃO =====
      const leadsAbordados = leadsData.filter(l => l.status !== 'lead_entrou' && l.status !== 'perdeu').length
      const taxaConversao = leadsAbordados > 0 ? (totalVendas / leadsAbordados) * 100 : 0

      setKpis({
        totalLeads,
        leadsMes: leadsMes.length,
        leadsHoje: leadsHoje.length,
        leadsSemana: leadsSemana.length,
        totalVendas,
        vendasMes: vendasMes.length,
        vendasHoje: vendasHoje.length,
        faturamentoMes,
        faturamentoTotal,
        ticketMedio,
        comissaoTotal,
        leadsPorOrigem,
        vendasPorVendedor,
        evolucaoVendas,
        taxaConversao,
        leadsStatus,
        propostasEnviadas,
        propostasAceitas,
        testDrivesAgendados,
        testDrivesRealizados,
        followupsHoje: interacoesHoje?.length || 0,
        atendimentosPendentes
      })

      // ===== DADOS PARA GRÁFICOS =====
      setDadosGraficoLinha(evolucaoVendas)
      setDadosGraficoOrigem(leadsPorOrigem)
      setDadosGraficoVendedores(vendasPorVendedor)
      setDadosGraficoStatus(leadsStatus)

    } catch (error) {
      console.error('Erro ao carregar dashboard:', error)
      toast.error('Erro ao carregar dados do dashboard')
    } finally {
      setLoading(false)
    }
  }

  // ===== RELATÓRIO =====
  const colunasRelatorio = [
    { key: 'nome', label: 'Nome' },
    { key: 'email', label: 'Email' },
    { key: 'total', label: 'Total Leads' },
    { key: 'abordados', label: 'Abordados' },
    { key: 'fechados', label: 'Vendas' },
    { key: 'valorTotal', label: 'Valor Vendido', formatter: formatCurrency },
    { key: 'comissaoTotal', label: 'Comissão', formatter: formatCurrency }
  ]

  const dadosRelatorio = membrosEquipe.map(membro => {
    const contagens = leads.filter(l => l.criado_por === membro.id)
    const vendas = contratos.filter(c => c.vendedor_id === membro.id)
    return {
      ...membro,
      total: contagens.length,
      abordados: contagens.filter(l => l.status !== 'lead_entrou' && l.status !== 'perdeu').length,
      fechados: vendas.length,
      valorTotal: vendas.reduce((acc, c) => acc + (c.valor_venda || 0), 0),
      comissaoTotal: vendas.reduce((acc, c) => acc + (c.comissao || 0), 0)
    }
  })

  // ===== RENDER =====
  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-[#D2B68A] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-[var(--text-secondary)]">Carregando dashboard...</p>
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
            <Sparkles size={24} className="text-[#D2B68A]" />
            Dashboard
          </h1>
          <p className="text-xs sm:text-sm text-[var(--text-secondary)]">
            Visão geral do seu negócio
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <select
            value={periodo}
            onChange={(e) => setPeriodo(e.target.value)}
            className="px-3 py-2 bg-[var(--bg-tertiary)] rounded-lg text-sm text-[var(--text-primary)] border border-[var(--border-color)] focus:border-[#D2B68A] outline-none"
          >
            <option value="dia">Último dia</option>
            <option value="semana">Última semana</option>
            <option value="mes">Último mês</option>
          </select>
          <button
            onClick={() => setShowGerarRelatorio(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-green-500/10 text-green-500 hover:bg-green-500/20 transition-all text-sm"
          >
            <BarChart3 size={16} />
            Relatório
          </button>
          <button
            onClick={carregarDashboard}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] transition-all text-sm"
          >
            <RefreshCw size={16} />
          </button>
        </div>
      </div>

      {/* ===== KPIs ===== */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-1.5 sm:gap-2">
        <div className="card p-2 sm:p-3 text-center">
          <p className="text-lg sm:text-2xl font-bold text-[var(--text-primary)]">{kpis.totalLeads}</p>
          <p className="text-[7px] sm:text-[10px] text-[var(--text-secondary)] uppercase tracking-wider">Total Leads</p>
          <p className="text-[8px] text-[var(--text-muted)] mt-0.5">
            +{kpis.leadsMes} este mês
          </p>
        </div>

        <div className="card p-2 sm:p-3 text-center">
          <p className="text-lg sm:text-2xl font-bold text-blue-500">{kpis.totalVendas}</p>
          <p className="text-[7px] sm:text-[10px] text-[var(--text-secondary)] uppercase tracking-wider">Vendas</p>
          <p className="text-[8px] text-[var(--text-muted)] mt-0.5">
            +{kpis.vendasMes} este mês
          </p>
        </div>

        <div className="card p-2 sm:p-3 text-center">
          <p className="text-lg sm:text-2xl font-bold text-[#10B981]">{formatCurrency(kpis.faturamentoTotal)}</p>
          <p className="text-[7px] sm:text-[10px] text-[var(--text-secondary)] uppercase tracking-wider">Faturamento</p>
          <p className="text-[8px] text-[var(--text-muted)] mt-0.5">
            {formatCurrency(kpis.faturamentoMes)} este mês
          </p>
        </div>

        <div className="card p-2 sm:p-3 text-center">
          <p className="text-lg sm:text-2xl font-bold text-[#D2B68A]">{formatCurrency(kpis.ticketMedio)}</p>
          <p className="text-[7px] sm:text-[10px] text-[var(--text-secondary)] uppercase tracking-wider">Ticket Médio</p>
          <p className="text-[8px] text-[var(--text-muted)] mt-0.5">
            {kpis.totalVendas} vendas
          </p>
        </div>

        <div className="card p-2 sm:p-3 text-center bg-purple-500/5 border-purple-500/20">
          <p className="text-lg sm:text-2xl font-bold text-purple-500">{kpis.taxaConversao.toFixed(1)}%</p>
          <p className="text-[7px] sm:text-[10px] text-[var(--text-secondary)] uppercase tracking-wider">Conversão</p>
          <p className="text-[8px] text-[var(--text-muted)] mt-0.5">
            {kpis.totalVendas} / {kpis.totalLeads} leads
          </p>
        </div>
      </div>

      {/* ===== KPIs Secundários ===== */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5 sm:gap-2">
        <div className="card p-1.5 sm:p-2 text-center">
          <p className="text-sm sm:text-lg font-bold text-amber-500">{kpis.leadsHoje}</p>
          <p className="text-[7px] sm:text-[9px] text-[var(--text-secondary)] uppercase tracking-wider">Leads Hoje</p>
        </div>
        <div className="card p-1.5 sm:p-2 text-center">
          <p className="text-sm sm:text-lg font-bold text-green-500">{kpis.vendasHoje}</p>
          <p className="text-[7px] sm:text-[9px] text-[var(--text-secondary)] uppercase tracking-wider">Vendas Hoje</p>
        </div>
        <div className="card p-1.5 sm:p-2 text-center">
          <p className="text-sm sm:text-lg font-bold text-[#D2B68A]">{kpis.followupsHoje}</p>
          <p className="text-[7px] sm:text-[9px] text-[var(--text-secondary)] uppercase tracking-wider">Follow-ups</p>
        </div>
        <div className="card p-1.5 sm:p-2 text-center">
          <p className="text-sm sm:text-lg font-bold text-blue-500">{kpis.testDrivesAgendados}</p>
          <p className="text-[7px] sm:text-[9px] text-[var(--text-secondary)] uppercase tracking-wider">Test-Drives</p>
        </div>
        <div className="card p-1.5 sm:p-2 text-center">
          <p className="text-sm sm:text-lg font-bold text-indigo-500">{kpis.propostasEnviadas}</p>
          <p className="text-[7px] sm:text-[9px] text-[var(--text-secondary)] uppercase tracking-wider">Propostas</p>
        </div>
        <div className="card p-1.5 sm:p-2 text-center bg-red-500/5 border-red-500/20">
          <p className="text-sm sm:text-lg font-bold text-red-500">{kpis.atendimentosPendentes}</p>
          <p className="text-[7px] sm:text-[9px] text-[var(--text-secondary)] uppercase tracking-wider">Pendentes</p>
        </div>
      </div>

      {/* ===== GRÁFICOS ===== */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Evolução de Vendas */}
        <div className="card p-3">
          <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-3 flex items-center gap-2">
            <TrendingUp size={16} className="text-[#D2B68A]" />
            Evolução de Vendas (Últimos 12 meses)
          </h3>
          <div className="h-48 sm:h-56">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={dadosGraficoLinha}>
                <XAxis dataKey="mes" tick={{ fontSize: 9, fill: 'var(--text-muted)' }} />
                <YAxis tick={{ fontSize: 9, fill: 'var(--text-muted)' }} />
                <Tooltip 
                  formatter={(value) => formatCurrency(value)}
                  contentStyle={{ 
                    backgroundColor: 'var(--bg-secondary)', 
                    borderColor: 'var(--border-color)',
                    borderRadius: '8px',
                    fontSize: '11px'
                  }}
                />
                <Line 
                  type="monotone" 
                  dataKey="valor" 
                  stroke="#D2B68A" 
                  strokeWidth={2} 
                  dot={{ fill: '#D2B68A', r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Leads por Origem */}
        <div className="card p-3">
          <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-3 flex items-center gap-2">
            <Users size={16} className="text-[#D2B68A]" />
            Leads por Origem
          </h3>
          <div className="h-48 sm:h-56">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={dadosGraficoOrigem}
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={60}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {dadosGraficoOrigem.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={CORES[index % CORES.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'var(--bg-secondary)', 
                    borderColor: 'var(--border-color)',
                    borderRadius: '8px',
                    fontSize: '11px'
                  }}
                />
                <Legend 
                  formatter={(value) => <span style={{ color: 'var(--text-secondary)', fontSize: '10px' }}>{value}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* ===== VENDAS POR VENDEDOR ===== */}
      <div className="card p-3">
        <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-3 flex items-center gap-2">
          <CheckCircle size={16} className="text-[#D2B68A]" />
          Ranking de Vendas por Vendedor
        </h3>
        {dadosGraficoVendedores.length === 0 ? (
          <p className="text-sm text-[var(--text-muted)] text-center py-4">Nenhuma venda registrada</p>
        ) : (
          <div className="space-y-2">
            {dadosGraficoVendedores.map((v, index) => (
              <div key={index} className="flex items-center gap-3 p-2 bg-[var(--bg-tertiary)] rounded-lg">
                <span className="text-sm font-bold text-[var(--text-muted)] w-6 text-center">
                  {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`}
                </span>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-[var(--text-primary)]">{v.nome}</span>
                    <span className="text-sm font-bold text-[#10B981]">{formatCurrency(v.valor)}</span>
                  </div>
                  <div className="w-full h-1.5 bg-[var(--bg-secondary)] rounded-full overflow-hidden mt-0.5">
                    <div 
                      className="h-full rounded-full transition-all"
                      style={{ 
                        width: `${(v.valor / (dadosGraficoVendedores[0]?.valor || 1)) * 100}%`,
                        backgroundColor: CORES[index % CORES.length]
                      }}
                    />
                  </div>
                  <p className="text-[10px] text-[var(--text-muted)] mt-0.5">{v.total} vendas</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ===== STATUS DOS LEADS ===== */}
      <div className="card p-3">
        <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-3 flex items-center gap-2">
          <Users size={16} className="text-[#D2B68A]" />
          Funil de Vendas
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {dadosGraficoStatus.map((item, index) => (
            <div key={index} className="bg-[var(--bg-tertiary)] p-2 rounded-lg text-center">
              <p className="text-xs text-[var(--text-secondary)] truncate">{item.name}</p>
              <p className="text-lg font-bold text-[var(--text-primary)]">{item.value}</p>
              <div className="w-full h-1 bg-[var(--bg-secondary)] rounded-full overflow-hidden mt-0.5">
                <div 
                  className="h-full rounded-full"
                  style={{ 
                    width: `${(item.value / (dadosGraficoStatus[0]?.value || 1)) * 100}%`,
                    backgroundColor: CORES_STATUS[item.status] || '#D2B68A'
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ===== RELATÓRIO ===== */}
      <GerarRelatorioModal
        isOpen={showGerarRelatorio}
        onClose={() => setShowGerarRelatorio(false)}
        titulo="Relatório do Dashboard"
        dados={dadosRelatorio}
        colunas={colunasRelatorio}
        nomeArquivo="dashboard"
      />
    </div>
  )
}