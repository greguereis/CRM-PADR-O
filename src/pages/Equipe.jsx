import { useState, useEffect, useRef } from 'react'
import { 
  Users, UserPlus, UserMinus, Copy, Check, Link2,
  Calendar, Car, Phone, Mail, Award, DollarSign,
  TrendingUp, BarChart3, Eye, X, Download,
  ChevronLeft, ChevronRight, RefreshCw, MessageSquare,
  Clock, CheckCircle, AlertTriangle
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import toast from 'react-hot-toast'
import RelatorioModal from '../components/common/RelatorioModal'
import { formatCurrency, formatDate, formatDateTime } from '../utils/formatadores'

export default function Equipe() {
  const { user, membrosEquipe, recarregarUsuario, recarregarMembros } = useAuth()
  
  // Estados
  const [equipe, setEquipe] = useState(null)
  const [membros, setMembros] = useState([])
  const [loading, setLoading] = useState(true)
  const [membroSelecionado, setMembroSelecionado] = useState(null)
  const [showPainelMembro, setShowPainelMembro] = useState(false)
  const [showRelatorio, setShowRelatorio] = useState(false)
  
  // Estados para test-drives
  const [testDrives, setTestDrives] = useState([])
  const [carregandoTestDrives, setCarregandoTestDrives] = useState(false)
  
  // Estados para convite
  const [emailBusca, setEmailBusca] = useState('')
  const [usuarioEncontrado, setUsuarioEncontrado] = useState(null)
  const [buscando, setBuscando] = useState(false)
  const [codigoEntrada, setCodigoEntrada] = useState('')
  const [entrandoEquipe, setEntrandoEquipe] = useState(false)
  const [criandoEquipe, setCriandoEquipe] = useState(false)
  const [nomeEquipe, setNomeEquipe] = useState('')
  const [copied, setCopied] = useState(false)
  
  // Métricas dos membros
  const [metricasMembros, setMetricasMembros] = useState([])
  
  const carregadoRef = useRef(false)

  // ===== CARREGAR DADOS =====
  useEffect(() => {
    if (user?.equipeId && !carregadoRef.current) {
      carregadoRef.current = true
      carregarEquipe()
    }
  }, [user?.equipeId])

  useEffect(() => {
    if (membros.length > 0 && user?.equipeId) {
      carregarMetricasMembros()
      carregarTestDrives()
    }
  }, [membros])

  const carregarEquipe = async () => {
    if (!user?.equipeId) {
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const { data: equipeData, error } = await supabase
        .from('equipes')
        .select('*')
        .eq('id', user.equipeId)
        .single()

      if (error) throw error
      setEquipe(equipeData)

      if (equipeData.membros && equipeData.membros.length > 0) {
        const { data: membrosData } = await supabase
          .from('usuarios')
          .select('*')
          .in('id', equipeData.membros)
        setMembros(membrosData || [])
      } else {
        setMembros([])
      }
    } catch (error) {
      console.error('Erro ao carregar equipe:', error)
      toast.error('Erro ao carregar dados da equipe')
    } finally {
      setLoading(false)
    }
  }

  // ===== CARREGAR MÉTRICAS DOS MEMBROS =====
  const carregarMetricasMembros = async () => {
    if (!user?.equipeId || membros.length === 0) return
    
    try {
      const metricas = []
      
      for (const membro of membros) {
        // Buscar contatos criados por este membro
        const { data: contatos, error } = await supabase
          .from('contatos')
          .select('*')
          .eq('equipe_id', user.equipeId)
          .eq('criado_por', membro.id)

        if (error) throw error

        // Buscar contratos fechados por este membro
        const { data: contratos, error: contratosError } = await supabase
          .from('contratos')
          .select('valor_venda, comissao')
          .eq('equipe_id', user.equipeId)
          .eq('vendedor_id', membro.id)

        if (contratosError) throw contratosError

        // Buscar propostas deste membro
        const { data: propostas, error: propostasError } = await supabase
          .from('propostas')
          .select('valor, status')
          .eq('equipe_id', user.equipeId)
          .eq('vendedor_id', membro.id)

        if (propostasError) throw propostasError

        // Buscar follow-ups deste membro
        const { data: followups, error: followError } = await supabase
          .from('historico_interacoes')
          .select('id')
          .eq('usuario_id', membro.id)
          .eq('tipo', 'follow_up')

        if (followError) throw followError

        const total = contatos?.length || 0
        const abordados = contatos?.filter(c => c.status !== 'lead_entrou' && c.status !== 'perdeu').length || 0
        const fechados = contratos?.length || 0
        const valorTotal = contratos?.reduce((acc, c) => acc + (c.valor_venda || 0), 0) || 0
        const comissaoTotal = contratos?.reduce((acc, c) => acc + (c.comissao || 0), 0) || 0
        const totalFollowups = followups?.length || 0
        const propostasEnviadas = propostas?.filter(p => p.status === 'enviada').length || 0
        const propostasAceitas = propostas?.filter(p => p.status === 'aceita').length || 0

        // Buscar test-drives do membro
        const { data: testDrivesMembro, error: tdError } = await supabase
          .from('eventos')
          .select('*')
          .eq('funcionario_id', membro.id)
          .eq('tipo', 'test_drive')
          .gte('data_hora', new Date().toISOString())
          .order('data_hora', { ascending: true })

        if (tdError) throw tdError

        metricas.push({
          ...membro,
          total,
          abordados,
          fechados,
          valorTotal,
          comissaoTotal,
          totalFollowups,
          propostasEnviadas,
          propostasAceitas,
          testDrives: testDrivesMembro || []
        })
      }

      // Ordenar por valor total de vendas
      metricas.sort((a, b) => b.valorTotal - a.valorTotal)
      setMetricasMembros(metricas)
    } catch (error) {
      console.error('Erro ao carregar métricas:', error)
    }
  }

  // ===== CARREGAR TEST-DRIVES =====
  const carregarTestDrives = async () => {
    if (!user?.equipeId) return
    
    setCarregandoTestDrives(true)
    try {
      const { data, error } = await supabase
        .from('eventos')
        .select('*')
        .eq('tipo', 'test_drive')
        .eq('criado_por', user.uid)
        .order('data_hora', { ascending: true })
      
      if (error) throw error
      
      // Enriquecer com nomes
      const testDrivesEnriquecidos = await Promise.all(
        (data || []).map(async (td) => {
          let clienteNome = 'Cliente removido'
          let veiculo = ''
          if (td.cliente_id) {
            const { data: cliente } = await supabase
              .from('contatos')
              .select('nome, veiculo_interesse')
              .eq('id', td.cliente_id)
              .single()
            if (cliente) {
              clienteNome = cliente.nome
              veiculo = cliente.veiculo_interesse || td.veiculo || ''
            }
          }
          
          let funcionarioNome = ''
          if (td.funcionario_id) {
            const { data: funcionario } = await supabase
              .from('usuarios')
              .select('nome')
              .eq('id', td.funcionario_id)
              .single()
            if (funcionario) funcionarioNome = funcionario.nome
          }
          
          return {
            ...td,
            cliente_nome: clienteNome,
            veiculo: veiculo,
            funcionario_nome: funcionarioNome
          }
        })
      )
      
      setTestDrives(testDrivesEnriquecidos)
    } catch (error) {
      console.error('Erro ao carregar test-drives:', error)
    } finally {
      setCarregandoTestDrives(false)
    }
  }

  // ===== FUNÇÕES DE CRUD DA EQUIPE =====
  const criarEquipe = async () => {
    if (!nomeEquipe.trim()) {
      toast.error('Digite um nome para a equipe')
      return
    }
    setCriandoEquipe(true)
    try {
      const { data: novaEquipe, error } = await supabase
        .from('equipes')
        .insert({
          nome: nomeEquipe.trim(),
          membros: [user.uid],
          criado_por: user.uid,
          criado_em: new Date()
        })
        .select()
        .single()

      if (error) throw error

      await supabase
        .from('usuarios')
        .update({ equipe_id: novaEquipe.id })
        .eq('id', user.uid)

      toast.success('Equipe criada!')
      await recarregarUsuario()
      await recarregarMembros()
      carregarEquipe()
    } catch (error) {
      console.error('Erro ao criar equipe:', error)
      toast.error('Erro ao criar equipe')
    } finally {
      setCriandoEquipe(false)
    }
  }

  const entrarNaEquipe = async () => {
    if (!codigoEntrada.trim()) {
      toast.error('Cole o código da equipe')
      return
    }
    setEntrandoEquipe(true)
    try {
      const { data: equipeData, error } = await supabase
        .from('equipes')
        .select('*')
        .eq('id', codigoEntrada.trim())
        .single()

      if (error || !equipeData) {
        toast.error('Equipe não encontrada. Verifique o código.')
        return
      }

      if (equipeData.membros && equipeData.membros.includes(user.uid)) {
        toast.error('Você já é membro desta equipe')
        return
      }

      if (user.equipeId) {
        const { data: antigaEquipe } = await supabase
          .from('equipes')
          .select('membros')
          .eq('id', user.equipeId)
          .single()

        if (antigaEquipe) {
          const novosMembros = (antigaEquipe.membros || []).filter(m => m !== user.uid)
          await supabase.from('equipes').update({ membros: novosMembros }).eq('id', user.equipeId)
        }
      }

      const novosMembros = [...(equipeData.membros || []), user.uid]
      await supabase.from('equipes').update({ membros: novosMembros }).eq('id', codigoEntrada.trim())
      await supabase.from('usuarios').update({ equipe_id: codigoEntrada.trim() }).eq('id', user.uid)

      toast.success('Você entrou na equipe!')
      await recarregarUsuario()
      await recarregarMembros()
      carregarEquipe()
    } catch (error) {
      console.error('Erro ao entrar na equipe:', error)
      toast.error('Erro ao entrar na equipe')
    } finally {
      setEntrandoEquipe(false)
    }
  }

  const adicionarMembro = async () => {
    if (!usuarioEncontrado) return
    try {
      const novosMembros = [...(equipe.membros || []), usuarioEncontrado.id]
      const { error } = await supabase
        .from('equipes')
        .update({ membros: novosMembros })
        .eq('id', user.equipeId)

      if (error) throw error

      await supabase.from('usuarios').update({ equipe_id: user.equipeId }).eq('id', usuarioEncontrado.id)

      toast.success(`${usuarioEncontrado.nome} adicionado à equipe!`)
      setUsuarioEncontrado(null)
      setEmailBusca('')
      await recarregarMembros()
      carregarEquipe()
    } catch (error) {
      console.error('Erro ao adicionar:', error)
      toast.error('Erro ao adicionar membro')
    }
  }

  const removerMembro = async (membroId) => {
    if (membroId === user.uid) {
      toast.error('Você não pode remover a si mesmo')
      return
    }
    if (!confirm('Remover este membro da equipe?')) return
    try {
      const novosMembros = equipe.membros.filter(m => m !== membroId)
      const { error } = await supabase
        .from('equipes')
        .update({ membros: novosMembros })
        .eq('id', user.equipeId)

      if (error) throw error

      await supabase.from('usuarios').update({ equipe_id: null }).eq('id', membroId)
      toast.success('Membro removido da equipe')
      await recarregarMembros()
      carregarEquipe()
    } catch (error) {
      console.error('Erro ao remover:', error)
      toast.error('Erro ao remover membro')
    }
  }

  const buscarUsuario = async () => {
    if (!emailBusca.trim()) {
      toast.error('Digite um email para buscar')
      return
    }
    setBuscando(true)
    setUsuarioEncontrado(null)
    try {
      const { data, error } = await supabase
        .from('usuarios')
        .select('*')
        .eq('email', emailBusca.trim().toLowerCase())

      if (error) throw error

      if (!data || data.length === 0) {
        toast.error('Usuário não encontrado. Ele precisa fazer login primeiro.')
        return
      }

      const usuarioData = data[0]
      if (equipe?.membros?.includes(usuarioData.id)) {
        toast.error('Este usuário já é membro da equipe')
        return
      }

      setUsuarioEncontrado(usuarioData)
      toast.success(`Usuário encontrado: ${usuarioData.nome}`)
    } catch (error) {
      console.error('Erro ao buscar:', error)
      toast.error('Erro ao buscar usuário')
    } finally {
      setBuscando(false)
    }
  }

  const copiarCodigo = () => {
    navigator.clipboard.writeText(user.equipeId)
    setCopied(true)
    toast.success('Código da equipe copiado!')
    setTimeout(() => setCopied(false), 2000)
  }

  // ===== RELATÓRIO =====
  const colunasRelatorio = [
    { key: 'nome', label: 'Nome' },
    { key: 'email', label: 'Email' },
    { key: 'total', label: 'Total Leads' },
    { key: 'abordados', label: 'Abordados' },
    { key: 'fechados', label: 'Vendas' },
    { key: 'valorTotal', label: 'Valor Vendido', formatter: formatCurrency },
    { key: 'comissaoTotal', label: 'Comissão', formatter: formatCurrency },
    { key: 'totalFollowups', label: 'Follow-ups' }
  ]

  const dadosRelatorio = metricasMembros.map(m => ({
    ...m,
    total: m.total || 0,
    abordados: m.abordados || 0,
    fechados: m.fechados || 0,
    valorTotal: m.valorTotal || 0,
    comissaoTotal: m.comissaoTotal || 0,
    totalFollowups: m.totalFollowups || 0
  }))

  // ===== RENDER =====
  const getStatusTestDrive = (dataHora) => {
    const agora = new Date()
    const data = new Date(dataHora)
    if (data < agora) return { label: 'Realizado', cor: 'text-green-500 bg-green-500/10' }
    const diff = Math.ceil((data - agora) / (1000 * 60 * 60 * 24))
    if (diff === 0) return { label: 'Hoje', cor: 'text-amber-500 bg-amber-500/10' }
    if (diff === 1) return { label: 'Amanhã', cor: 'text-blue-500 bg-blue-500/10' }
    return { label: `${diff} dias`, cor: 'text-[var(--text-muted)] bg-[var(--bg-tertiary)]' }
  }

  // Se não tem equipe
  if (!user?.equipeId) {
    return (
      <div className="space-y-4 max-w-md mx-auto mt-20">
        <div className="card p-8 text-center">
          <div className="w-16 h-16 bg-brand-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Plus size={28} className="text-brand-500" />
          </div>
          <h1 className="text-xl font-bold text-[var(--text-primary)] mb-2">Criar uma Equipe</h1>
          <p className="text-sm text-[var(--text-secondary)] mb-6">
            Crie sua equipe e compartilhe o código com seus colaboradores.
          </p>
          <div className="space-y-3">
            <input
              type="text"
              value={nomeEquipe}
              onChange={(e) => setNomeEquipe(e.target.value)}
              placeholder="Nome da equipe (ex: Agência REI)"
              className="w-full px-3 py-2.5 bg-[var(--bg-tertiary)] rounded-lg text-sm text-[var(--text-primary)] placeholder-[var(--text-secondary)] border border-transparent focus:border-brand-500 outline-none text-center"
              onKeyDown={(e) => e.key === 'Enter' && criarEquipe()}
            />
            <button
              onClick={criarEquipe}
              disabled={criandoEquipe || !nomeEquipe.trim()}
              className="btn-primary w-full py-2.5 text-sm disabled:opacity-50"
            >
              {criandoEquipe ? 'Criando...' : 'Criar Equipe'}
            </button>
          </div>
        </div>

        <div className="card p-8 text-center">
          <div className="w-16 h-16 bg-brand-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Link2 size={28} className="text-brand-500" />
          </div>
          <h1 className="text-xl font-bold text-[var(--text-primary)] mb-2">Entrar em uma Equipe</h1>
          <p className="text-sm text-[var(--text-secondary)] mb-6">
            Cole o código da equipe compartilhado com você.
          </p>
          <div className="space-y-3">
            <input
              type="text"
              value={codigoEntrada}
              onChange={(e) => setCodigoEntrada(e.target.value)}
              placeholder="Cole o código da equipe aqui"
              className="w-full px-3 py-2.5 bg-[var(--bg-tertiary)] rounded-lg text-sm text-[var(--text-primary)] placeholder-[var(--text-secondary)] border border-transparent focus:border-brand-500 outline-none font-mono text-center"
              onKeyDown={(e) => e.key === 'Enter' && entrarNaEquipe()}
            />
            <button
              onClick={entrarNaEquipe}
              disabled={entrandoEquipe || !codigoEntrada.trim()}
              className="btn-primary w-full py-2.5 text-sm disabled:opacity-50"
            >
              {entrandoEquipe ? 'Entrando...' : 'Entrar na Equipe'}
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
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
            Equipe
          </h1>
          <p className="text-xs sm:text-sm text-[var(--text-secondary)]">
            Gerencie sua equipe e acompanhe os test-drives
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
            onClick={carregarEquipe}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] transition-all text-sm"
          >
            <RefreshCw size={16} />
          </button>
        </div>
      </div>

      {/* Código da Equipe */}
      <div className="card p-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <p className="text-xs text-[var(--text-secondary)] mb-1">Código da equipe</p>
            <code className="text-sm font-mono text-[var(--text-primary)] bg-[var(--bg-tertiary)] px-3 py-1.5 rounded-lg block">
              {user.equipeId}
            </code>
          </div>
          <button
            onClick={copiarCodigo}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#D2B68A] text-[#222D52] hover:bg-[#C4A67A] transition-all text-sm font-medium"
          >
            {copied ? <Check size={16} /> : <Copy size={16} />}
            {copied ? 'Copiado!' : 'Copiar'}
          </button>
        </div>
        <p className="text-xs text-[var(--text-muted)] mt-2">
          Compartilhe este código com novos membros da equipe
        </p>
      </div>

      {/* Lista de Membros */}
      <div className="card p-4">
        <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-3 flex items-center gap-2">
          <Users size={16} className="text-[#D2B68A]" />
          Membros da Equipe
          <span className="text-xs text-[var(--text-muted)] font-normal">
            ({membros.length})
          </span>
        </h3>

        <div className="space-y-2">
          {metricasMembros.map((membro) => (
            <div
              key={membro.id}
              className="flex items-center justify-between p-3 bg-[var(--bg-tertiary)] rounded-lg hover:bg-[var(--bg-hover)] transition-all cursor-pointer"
              onClick={() => {
                setMembroSelecionado(membro)
                setShowPainelMembro(true)
              }}
            >
              <div className="flex items-center gap-3 flex-1 min-w-0">
                {membro.foto ? (
                  <img src={membro.foto} alt={membro.nome} className="w-10 h-10 rounded-full" />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-[#D2B68A] flex items-center justify-center text-white font-bold text-sm">
                    {membro.nome?.charAt(0) || '?'}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[var(--text-primary)]">
                    {membro.nome}
                    {membro.id === user.uid && (
                      <span className="text-[10px] text-[#D2B68A] ml-2">(você)</span>
                    )}
                  </p>
                  <p className="text-xs text-[var(--text-secondary)] truncate">{membro.email}</p>
                  <div className="flex items-center gap-2 mt-0.5 text-[10px] text-[var(--text-muted)] flex-wrap">
                    <span className="flex items-center gap-0.5">
                      <Users size={10} /> {membro.total || 0} leads
                    </span>
                    <span className="flex items-center gap-0.5 text-blue-500">
                      <CheckCircle size={10} /> {membro.abordados || 0} abordados
                    </span>
                    <span className="flex items-center gap-0.5 text-green-500">
                      <DollarSign size={10} /> {formatCurrency(membro.valorTotal || 0)}
                    </span>
                    <span className="flex items-center gap-0.5 text-[#D2B68A]">
                      <Car size={10} /> {membro.testDrives?.length || 0} test-drives
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1 flex-shrink-0">
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#D2B68A]/10 text-[#D2B68A]">
                  {membro.fechados || 0} vendas
                </span>
                {membro.id !== user.uid && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      removerMembro(membro.id)
                    }}
                    className="p-1.5 rounded hover:bg-red-500/10 text-[var(--text-secondary)] hover:text-red-500 transition-colors"
                    title="Remover membro"
                  >
                    <UserMinus size={14} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Adicionar Membro */}
        <div className="mt-4 pt-4 border-t border-[var(--border-color)]">
          <h4 className="text-xs font-medium text-[var(--text-secondary)] mb-2 flex items-center gap-2">
            <UserPlus size={14} className="text-[#D2B68A]" />
            Adicionar Membro por Email
          </h4>
          <div className="flex gap-2">
            <input
              type="email"
              value={emailBusca}
              onChange={(e) => setEmailBusca(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && buscarUsuario()}
              placeholder="ex: joao@gmail.com"
              className="flex-1 px-3 py-2 bg-[var(--bg-tertiary)] rounded-lg text-sm text-[var(--text-primary)] placeholder-[var(--text-secondary)] border border-transparent focus:border-[#D2B68A] outline-none"
            />
            <button
              onClick={buscarUsuario}
              disabled={buscando || !emailBusca.trim()}
              className="px-4 py-2 rounded-lg bg-[#D2B68A] text-[#222D52] hover:bg-[#C4A67A] disabled:opacity-50 transition-all text-sm font-medium"
            >
              {buscando ? 'Buscando...' : 'Buscar'}
            </button>
          </div>

          {usuarioEncontrado && (
            <div className="mt-2 p-3 bg-[#D2B68A]/5 border border-[#D2B68A]/20 rounded-lg flex items-center justify-between">
              <div className="flex items-center gap-3">
                {usuarioEncontrado.foto ? (
                  <img src={usuarioEncontrado.foto} alt="" className="w-8 h-8 rounded-full" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-[#D2B68A] flex items-center justify-center text-white font-bold text-xs">
                    {usuarioEncontrado.nome?.charAt(0) || '?'}
                  </div>
                )}
                <div>
                  <p className="text-sm font-medium text-[var(--text-primary)]">{usuarioEncontrado.nome}</p>
                  <p className="text-xs text-[var(--text-secondary)]">{usuarioEncontrado.email}</p>
                </div>
              </div>
              <button
                onClick={adicionarMembro}
                className="px-4 py-1.5 rounded-lg bg-[#D2B68A] text-[#222D52] hover:bg-[#C4A67A] transition-all text-sm font-medium flex items-center gap-1"
              >
                <UserPlus size={14} /> Adicionar
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ===== PAINEL DO MEMBRO ===== */}
      {showPainelMembro && membroSelecionado && (
        <div className="fixed inset-0 z-40 flex justify-end">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => { setShowPainelMembro(false); setMembroSelecionado(null) }} />
          <div className="relative bg-[var(--bg-secondary)] border-l border-[var(--border-color)] w-full max-w-md shadow-2xl z-10 h-full overflow-y-auto">
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  {membroSelecionado.foto ? (
                    <img src={membroSelecionado.foto} alt={membroSelecionado.nome} className="w-12 h-12 rounded-full" />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-[#D2B68A] flex items-center justify-center text-white font-bold text-lg">
                      {membroSelecionado.nome?.charAt(0) || '?'}
                    </div>
                  )}
                  <div>
                    <h2 className="text-lg font-semibold text-[var(--text-primary)]">{membroSelecionado.nome}</h2>
                    <p className="text-sm text-[var(--text-secondary)]">{membroSelecionado.email}</p>
                    {membroSelecionado.id === user.uid && (
                      <span className="text-[10px] text-[#D2B68A]">(você)</span>
                    )}
                  </div>
                </div>
                <button onClick={() => { setShowPainelMembro(false); setMembroSelecionado(null) }} className="p-2 rounded-lg hover:bg-[var(--bg-tertiary)]">
                  <X size={20} />
                </button>
              </div>

              {/* Métricas do Membro */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-4">
                <div className="bg-[var(--bg-tertiary)] p-2 rounded-lg text-center">
                  <p className="text-lg font-bold text-[var(--text-primary)]">{membroSelecionado.total || 0}</p>
                  <p className="text-[8px] text-[var(--text-muted)] uppercase tracking-wider">Leads</p>
                </div>
                <div className="bg-[var(--bg-tertiary)] p-2 rounded-lg text-center">
                  <p className="text-lg font-bold text-blue-500">{membroSelecionado.abordados || 0}</p>
                  <p className="text-[8px] text-[var(--text-muted)] uppercase tracking-wider">Abordados</p>
                </div>
                <div className="bg-[var(--bg-tertiary)] p-2 rounded-lg text-center">
                  <p className="text-lg font-bold text-green-500">{membroSelecionado.fechados || 0}</p>
                  <p className="text-[8px] text-[var(--text-muted)] uppercase tracking-wider">Vendas</p>
                </div>
                <div className="bg-[var(--bg-tertiary)] p-2 rounded-lg text-center">
                  <p className="text-lg font-bold text-[#D2B68A]">{formatCurrency(membroSelecionado.valorTotal || 0)}</p>
                  <p className="text-[8px] text-[var(--text-muted)] uppercase tracking-wider">Valor</p>
                </div>
                <div className="bg-[var(--bg-tertiary)] p-2 rounded-lg text-center">
                  <p className="text-lg font-bold text-purple-500">{formatCurrency(membroSelecionado.comissaoTotal || 0)}</p>
                  <p className="text-[8px] text-[var(--text-muted)] uppercase tracking-wider">Comissão</p>
                </div>
                <div className="bg-[var(--bg-tertiary)] p-2 rounded-lg text-center">
                  <p className="text-lg font-bold text-amber-500">{membroSelecionado.totalFollowups || 0}</p>
                  <p className="text-[8px] text-[var(--text-muted)] uppercase tracking-wider">Follow-ups</p>
                </div>
              </div>

              {/* Test-Drives do Membro */}
              <div>
                <h3 className="text-sm font-semibold text-[var(--text-primary)] flex items-center gap-2 mb-2">
                  <Car size={16} className="text-[#D2B68A]" />
                  Test-Drives Agendados
                  <span className="text-xs text-[var(--text-muted)] font-normal">
                    ({membroSelecionado.testDrives?.length || 0})
                  </span>
                </h3>

                {carregandoTestDrives ? (
                  <div className="text-center py-4">
                    <div className="w-6 h-6 border-2 border-[#D2B68A] border-t-transparent rounded-full animate-spin mx-auto" />
                  </div>
                ) : (membroSelecionado.testDrives || []).length === 0 ? (
                  <p className="text-sm text-[var(--text-muted)] text-center py-4">
                    Nenhum test-drive agendado para este funcionário
                  </p>
                ) : (
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {membroSelecionado.testDrives.map((td) => {
                      const status = getStatusTestDrive(td.data_hora)
                      return (
                        <div key={td.id} className="bg-[var(--bg-tertiary)] p-3 rounded-lg border border-[var(--border-color)]">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-medium text-[var(--text-primary)]">
                                🚗 Test-Drive
                              </p>
                              <p className="text-xs text-[var(--text-secondary)]">
                                {td.cliente_nome || 'Cliente'} • {td.veiculo || 'Veículo não definido'}
                              </p>
                            </div>
                            <span className={`text-[10px] px-2 py-0.5 rounded-full ${status.cor}`}>
                              {status.label}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 mt-1 text-[10px] text-[var(--text-muted)]">
                            <span className="flex items-center gap-0.5">
                              <Calendar size={12} /> {formatDateTime(td.data_hora)}
                            </span>
                            {td.local && (
                              <span className="flex items-center gap-0.5">
                                📍 {td.local}
                              </span>
                            )}
                          </div>
                          {td.observacoes && (
                            <p className="text-[10px] text-[var(--text-muted)] mt-1">{td.observacoes}</p>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* Propostas e Follow-ups */}
              <div className="grid grid-cols-2 gap-2 mt-4">
                <div className="bg-[var(--bg-tertiary)] p-2 rounded-lg">
                  <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider">Propostas</p>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-blue-500">{membroSelecionado.propostasEnviadas || 0}</span>
                    <span className="text-[10px] text-[var(--text-muted)]">enviadas</span>
                    <span className="text-sm font-medium text-green-500">{membroSelecionado.propostasAceitas || 0}</span>
                    <span className="text-[10px] text-[var(--text-muted)]">aceitas</span>
                  </div>
                </div>
                <div className="bg-[var(--bg-tertiary)] p-2 rounded-lg">
                  <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider">Follow-ups</p>
                  <p className="text-sm font-medium text-amber-500">{membroSelecionado.totalFollowups || 0}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===== RELATÓRIO ===== */}
      <RelatorioModal
        isOpen={showRelatorio}
        onClose={() => setShowRelatorio(false)}
        titulo="Relatório da Equipe"
        dados={dadosRelatorio}
        colunas={colunasRelatorio}
        nomeArquivo="equipe"
      />
    </div>
  )
}