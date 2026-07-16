import { useState, useEffect, useRef } from 'react'
import { 
  Calendar, Clock, Plus, Search,
  ChevronLeft, ChevronRight, RefreshCw, 
  Users, Car, Phone, Download,
  X, Edit2, Trash2
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import toast from 'react-hot-toast'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isToday, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import ModalEvento from '../components/agenda/ModalEvento'
import TestDriveForm from '../components/agenda/TestDriveForm'
import GerarRelatorioModal from '../components/common/GerarRelatorioModal'
import { formatDateTime } from '../utils/formatadores'

export default function Agenda() {
  const { user, membrosEquipe } = useAuth()
  
  // Estados
  const [eventos, setEventos] = useState([])
  const [clientes, setClientes] = useState([])
  const [loading, setLoading] = useState(true)
  const [dataAtual, setDataAtual] = useState(new Date())
  const [diasMes, setDiasMes] = useState([])
  const [eventosDoDia, setEventosDoDia] = useState([])
  const [diaSelecionado, setDiaSelecionado] = useState(null)
  
  // Estados dos modais
  const [modalEventoAberto, setModalEventoAberto] = useState(false)
  const [modalTestDriveAberto, setModalTestDriveAberto] = useState(false)
  const [eventoEditando, setEventoEditando] = useState(null)
  const [showGerarRelatorio, setShowGerarRelatorio] = useState(false)
  
  // Filtros
  const [filtroTipo, setFiltroTipo] = useState('todos')
  const [filtroFuncionario, setFiltroFuncionario] = useState('')
  const [busca, setBusca] = useState('')

  // Referência para evitar recarregamentos duplicados
  const carregadoRef = useRef(false)

  // Carregar dados iniciais
  useEffect(() => {
    if (user?.equipeId && !carregadoRef.current) {
      carregadoRef.current = true
      carregarClientes()
      carregarEventos()
    }
  }, [user?.equipeId])

  // Atualizar dias do mês quando a data mudar
  useEffect(() => {
    const start = startOfMonth(dataAtual)
    const end = endOfMonth(dataAtual)
    const dias = eachDayOfInterval({ start, end })
    setDiasMes(dias)
    
    // Selecionar o dia atual por padrão
    const hoje = new Date()
    if (dias.some(d => isToday(d))) {
      setDiaSelecionado(hoje)
    } else {
      setDiaSelecionado(dias[0])
    }
  }, [dataAtual])

  // Filtrar eventos quando os filtros mudarem
  useEffect(() => {
    let filtrados = [...eventos]
    
    if (filtroTipo !== 'todos') {
      filtrados = filtrados.filter(e => e.tipo === filtroTipo)
    }
    
    if (filtroFuncionario) {
      filtrados = filtrados.filter(e => e.funcionario_id === filtroFuncionario)
    }
    
    if (busca) {
      const termo = busca.toLowerCase()
      filtrados = filtrados.filter(e => 
        e.cliente_nome?.toLowerCase().includes(termo) ||
        e.veiculo?.toLowerCase().includes(termo) ||
        e.observacoes?.toLowerCase().includes(termo)
      )
    }
    
    // Atualizar eventos do dia selecionado
    if (diaSelecionado) {
      const dataStr = format(diaSelecionado, 'yyyy-MM-dd')
      const doDia = filtrados.filter(e => 
        format(parseISO(e.data_hora), 'yyyy-MM-dd') === dataStr
      )
      setEventosDoDia(doDia)
    }
  }, [eventos, filtroTipo, filtroFuncionario, busca, diaSelecionado])

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

  const carregarEventos = async () => {
    setLoading(true)
    try {
      // Buscar eventos
      const { data: eventosData, error } = await supabase
        .from('eventos')
        .select('*')
        .eq('criado_por', user.id)
        .order('data_hora', { ascending: true })
      
      if (error) throw error
      
      // Buscar todos os clientes e funcionários em uma única consulta
      const clienteIds = [...new Set((eventosData || []).map(e => e.cliente_id).filter(Boolean))]
      const funcionarioIds = [...new Set((eventosData || []).map(e => e.funcionario_id).filter(Boolean))]
      
      let clientesMap = {}
      let funcionariosMap = {}
      
      if (clienteIds.length > 0) {
        const { data: clientesData } = await supabase
          .from('contatos')
          .select('id, nome, telefone')
          .in('id', clienteIds)
        
        clientesMap = (clientesData || []).reduce((acc, c) => {
          acc[c.id] = c
          return acc
        }, {})
      }
      
      if (funcionarioIds.length > 0) {
        const { data: funcionariosData } = await supabase
          .from('usuarios')
          .select('id, nome')
          .in('id', funcionarioIds)
        
        funcionariosMap = (funcionariosData || []).reduce((acc, f) => {
          acc[f.id] = f
          return acc
        }, {})
      }
      
      // Enriquecer os eventos
      const eventosEnriquecidos = (eventosData || []).map(evento => {
        const cliente = clientesMap[evento.cliente_id]
        const funcionario = funcionariosMap[evento.funcionario_id]
        
        return {
          ...evento,
          cliente_nome: cliente?.nome || 'Cliente removido',
          cliente_telefone: cliente?.telefone || '',
          funcionario_nome: funcionario?.nome || ''
        }
      })
      
      setEventos(eventosEnriquecidos)
    } catch (error) {
      console.error('Erro ao carregar eventos:', error)
      toast.error('Erro ao carregar eventos')
    } finally {
      setLoading(false)
    }
  }

  // ===== FUNÇÕES DE CRUD =====
  const salvarEvento = async (dados, eventoId = null) => {
    try {
      if (eventoId) {
        // Editar
        const { error } = await supabase
          .from('eventos')
          .update(dados)
          .eq('id', eventoId)
        
        if (error) throw error
      } else {
        // Criar
        const { error } = await supabase
          .from('eventos')
          .insert([{ ...dados, criado_por: user.id }])
        
        if (error) throw error
      }
      
      await carregarEventos()
    } catch (error) {
      console.error('Erro ao salvar evento:', error)
      throw error
    }
  }

  const excluirEvento = async (eventoId) => {
    if (!confirm('Tem certeza que deseja excluir este evento?')) return
    
    try {
      const { error } = await supabase
        .from('eventos')
        .delete()
        .eq('id', eventoId)
      
      if (error) throw error
      
      toast.success('Evento excluído!')
      await carregarEventos()
    } catch (error) {
      console.error('Erro ao excluir evento:', error)
      toast.error('Erro ao excluir evento')
    }
  }

  // ===== FUNÇÕES DE NAVEGAÇÃO =====
  const mudarMes = (delta) => {
    const novaData = new Date(dataAtual)
    novaData.setMonth(novaData.getMonth() + delta)
    setDataAtual(novaData)
  }

  const voltarHoje = () => {
    setDataAtual(new Date())
  }

  // ===== FUNÇÕES DE RELATÓRIO =====
  const colunasRelatorio = [
    { key: 'data_hora', label: 'Data/Hora', formatter: formatDateTime },
    { key: 'tipo', label: 'Tipo' },
    { key: 'cliente_nome', label: 'Cliente' },
    { key: 'funcionario_nome', label: 'Funcionário' },
    { key: 'veiculo', label: 'Veículo' },
    { key: 'local', label: 'Local' },
    { key: 'observacoes', label: 'Observações' }
  ]

  const dadosRelatorio = eventos.map(e => ({
    ...e,
    tipo: e.tipo === 'reuniao' ? 'Reunião' : e.tipo === 'test_drive' ? 'Test-Drive' : 'Follow-up'
  }))

  // ===== RENDER =====
  const getTipoIcon = (tipo) => {
    switch(tipo) {
      case 'reuniao': return <Calendar size={14} className="text-blue-500" />
      case 'test_drive': return <Car size={14} className="text-[#D2B68A]" />
      case 'follow_up': return <Phone size={14} className="text-green-500" />
      default: return <Calendar size={14} />
    }
  }

  const getTipoLabel = (tipo) => {
    switch(tipo) {
      case 'reuniao': return 'Reunião'
      case 'test_drive': return 'Test-Drive'
      case 'follow_up': return 'Follow-up'
      default: return tipo
    }
  }

  const getStatusBadge = (tipo) => {
    const cores = {
      reuniao: 'bg-blue-500/10 text-blue-500',
      test_drive: 'bg-[#D2B68A]/10 text-[#D2B68A]',
      follow_up: 'bg-green-500/10 text-green-500'
    }
    return cores[tipo] || 'bg-gray-500/10 text-gray-500'
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-[#D2B68A] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-[var(--text-secondary)]">Carregando agenda...</p>
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
            <Calendar size={24} className="text-[#D2B68A]" />
            Agenda
          </h1>
          <p className="text-xs sm:text-sm text-[var(--text-secondary)]">
            Gerencie reuniões, test-drives e follow-ups
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
            onClick={() => { setEventoEditando(null); setModalEventoAberto(true) }}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#D2B68A] text-[#222D52] hover:bg-[#C4A67A] transition-all text-sm font-medium"
          >
            <Plus size={16} />
            Novo Evento
          </button>
          <button
            onClick={() => setModalTestDriveAberto(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-blue-500 text-white hover:bg-blue-600 transition-all text-sm"
          >
            <Car size={16} />
            Test-Drive
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
              placeholder="Buscar eventos..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-[var(--bg-tertiary)] rounded-lg text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] border border-transparent focus:border-[#D2B68A] outline-none"
            />
          </div>

          <select
            value={filtroTipo}
            onChange={(e) => setFiltroTipo(e.target.value)}
            className="px-3 py-1.5 bg-[var(--bg-tertiary)] rounded-lg text-sm text-[var(--text-primary)] border border-transparent focus:border-[#D2B68A] outline-none"
          >
            <option value="todos">Todos os tipos</option>
            <option value="reuniao">Reunião</option>
            <option value="test_drive">Test-Drive</option>
            <option value="follow_up">Follow-up</option>
          </select>

          <select
            value={filtroFuncionario}
            onChange={(e) => setFiltroFuncionario(e.target.value)}
            className="px-3 py-1.5 bg-[var(--bg-tertiary)] rounded-lg text-sm text-[var(--text-primary)] border border-transparent focus:border-[#D2B68A] outline-none"
          >
            <option value="">Todos os funcionários</option>
            {membrosEquipe.map(m => (
              <option key={m.id} value={m.id}>{m.nome}</option>
            ))}
          </select>

          <button
            onClick={() => {
              setFiltroTipo('todos')
              setFiltroFuncionario('')
              setBusca('')
            }}
            className="px-3 py-1.5 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-all text-sm"
          >
            <X size={14} className="inline" /> Limpar
          </button>
        </div>
      </div>

      {/* Calendário */}
      <div className="card p-3">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <button
              onClick={() => mudarMes(-1)}
              className="p-1.5 rounded hover:bg-[var(--bg-tertiary)] text-[var(--text-secondary)]"
            >
              <ChevronLeft size={18} />
            </button>
            <h2 className="text-base font-semibold text-[var(--text-primary)]">
              {format(dataAtual, 'MMMM yyyy', { locale: ptBR })}
            </h2>
            <button
              onClick={() => mudarMes(1)}
              className="p-1.5 rounded hover:bg-[var(--bg-tertiary)] text-[var(--text-secondary)]"
            >
              <ChevronRight size={18} />
            </button>
            <button
              onClick={voltarHoje}
              className="ml-2 px-3 py-1 text-xs rounded-lg bg-[#D2B68A]/10 text-[#D2B68A] hover:bg-[#D2B68A]/20 transition-colors"
            >
              Hoje
            </button>
          </div>
          <span className="text-xs text-[var(--text-muted)]">
            {eventos.length} eventos
          </span>
        </div>

        {/* Grid de dias */}
        <div className="grid grid-cols-7 gap-0.5">
          {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(dia => (
            <div key={dia} className="text-center text-[10px] font-medium text-[var(--text-muted)] py-1">
              {dia}
            </div>
          ))}
          
          {diasMes.map((dia, index) => {
            const dataStr = format(dia, 'yyyy-MM-dd')
            const eventosDoDiaCount = eventos.filter(e => 
              format(parseISO(e.data_hora), 'yyyy-MM-dd') === dataStr
            ).length
            const isDiaSelecionado = diaSelecionado && isSameDay(dia, diaSelecionado)
            const isDiaHoje = isToday(dia)
            
            return (
              <button
                key={index}
                onClick={() => setDiaSelecionado(dia)}
                className={`
                  aspect-square p-1 rounded-lg text-sm transition-all relative
                  ${isDiaSelecionado ? 'bg-[#D2B68A] text-[#222D52]' : ''}
                  ${isDiaHoje && !isDiaSelecionado ? 'border border-[#D2B68A]' : ''}
                  ${!isDiaSelecionado ? 'hover:bg-[var(--bg-tertiary)] text-[var(--text-primary)]' : ''}
                `}
              >
                <span className="text-xs">{format(dia, 'd')}</span>
                {eventosDoDiaCount > 0 && (
                  <span className={`
                    absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full
                    ${isDiaSelecionado ? 'bg-[#222D52]' : 'bg-[#D2B68A]'}
                  `} />
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Eventos do Dia */}
      <div className="card p-3">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-[var(--text-primary)] flex items-center gap-2">
            <Clock size={16} className="text-[#D2B68A]" />
            {diaSelecionado ? format(diaSelecionado, "dd 'de' MMMM", { locale: ptBR }) : 'Selecione um dia'}
            <span className="text-xs text-[var(--text-muted)] font-normal">
              ({eventosDoDia.length} eventos)
            </span>
          </h3>
          <button
            onClick={carregarEventos}
            className="p-1.5 rounded hover:bg-[var(--bg-tertiary)] text-[var(--text-secondary)]"
            title="Recarregar"
          >
            <RefreshCw size={14} />
          </button>
        </div>

        {eventosDoDia.length === 0 ? (
          <div className="text-center py-8">
            <Calendar size={32} className="mx-auto text-[var(--text-muted)] opacity-30" />
            <p className="text-sm text-[var(--text-muted)] mt-2">
              Nenhum evento neste dia
            </p>
            <button
              onClick={() => { setEventoEditando(null); setModalEventoAberto(true) }}
              className="mt-2 text-sm text-[#D2B68A] hover:underline"
            >
              Adicionar evento
            </button>
          </div>
        ) : (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {eventosDoDia
              .sort((a, b) => a.data_hora.localeCompare(b.data_hora))
              .map((evento) => (
                <div
                  key={evento.id}
                  className="flex items-center justify-between p-3 bg-[var(--bg-tertiary)] rounded-lg hover:bg-[var(--bg-hover)] transition-all group"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      {getTipoIcon(evento.tipo)}
                      <span className={`text-[10px] px-2 py-0.5 rounded-full ${getStatusBadge(evento.tipo)}`}>
                        {getTipoLabel(evento.tipo)}
                      </span>
                      <span className="text-xs text-[var(--text-muted)] font-mono">
                        {format(parseISO(evento.data_hora), 'HH:mm')}
                      </span>
                      <span className="text-sm font-medium text-[var(--text-primary)] truncate">
                        {evento.cliente_nome}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mt-0.5 text-xs text-[var(--text-muted)] flex-wrap">
                      {evento.veiculo && (
                        <span className="flex items-center gap-0.5">
                          <Car size={12} /> {evento.veiculo}
                        </span>
                      )}
                      {evento.funcionario_nome && (
                        <span className="flex items-center gap-0.5">
                          <Users size={12} /> {evento.funcionario_nome}
                        </span>
                      )}
                      {evento.local && (
                        <span>{evento.local}</span>
                      )}
                      {evento.cliente_telefone && (
                        <a
                          href={`https://wa.me/55${evento.cliente_telefone.replace(/\D/g, '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[#25D366] hover:underline"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Phone size={12} className="inline" />
                        </a>
                      )}
                    </div>
                    {evento.observacoes && (
                      <p className="text-xs text-[var(--text-muted)] mt-0.5 truncate">
                        {evento.observacoes}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => {
                        setEventoEditando(evento)
                        setModalEventoAberto(true)
                      }}
                      className="p-1.5 rounded hover:bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:text-[#D2B68A]"
                      title="Editar"
                    >
                      <Edit2 size={14} />
                    </button>
                    <button
                      onClick={() => excluirEvento(evento.id)}
                      className="p-1.5 rounded hover:bg-red-500/10 text-[var(--text-secondary)] hover:text-red-500"
                      title="Excluir"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>

      {/* ===== MODAIS ===== */}
      <ModalEvento
        isOpen={modalEventoAberto}
        onClose={() => { setModalEventoAberto(false); setEventoEditando(null) }}
        evento={eventoEditando}
        onSave={salvarEvento}
        clientes={clientes}
        membros={membrosEquipe}
      />

      <TestDriveForm
        isOpen={modalTestDriveAberto}
        onClose={() => setModalTestDriveAberto(false)}
        onSave={salvarEvento}
        clientes={clientes}
        funcionarioId={user?.id}
      />

      <GerarRelatorioModal
        isOpen={showGerarRelatorio}
        onClose={() => setShowGerarRelatorio(false)}
        titulo="Relatório de Agenda"
        dados={dadosRelatorio}
        colunas={colunasRelatorio}
        nomeArquivo="agenda-eventos"
      />
    </div>
  )
}