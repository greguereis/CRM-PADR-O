import { createContext, useContext, useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext()

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [membrosEquipe, setMembrosEquipe] = useState([])

  const carregarUsuario = async (sessionUser) => {
    try {
      if (!sessionUser) {
        setUser(null)
        setMembrosEquipe([])
        setLoading(false)
        return
      }

      // Busca dados do usuário na tabela usuarios
      const { data: usuarioData, error: selectError } = await supabase
        .from('usuarios')
        .select('*')
        .eq('id', sessionUser.id)
        .single()

      // Se não existe, cria o usuário
      if (!usuarioData && !selectError) {
        const { error: insertError } = await supabase.from('usuarios').insert({
          id: sessionUser.id,
          nome: sessionUser.user_metadata?.full_name || sessionUser.user_metadata?.name,
          email: sessionUser.email,
          foto: sessionUser.user_metadata?.avatar_url,
          equipe_id: null,
          criado_em: new Date()
        })
        if (insertError) {
          console.error('Erro ao criar usuário:', insertError)
        }
      }

      // Buscar novamente após criação
      const { data: usuarioAtualizado } = await supabase
        .from('usuarios')
        .select('*')
        .eq('id', sessionUser.id)
        .single()

      const userData = {
        uid: sessionUser.id,
        nome: sessionUser.user_metadata?.full_name || sessionUser.user_metadata?.name,
        email: sessionUser.email,
        foto: sessionUser.user_metadata?.avatar_url,
        equipeId: usuarioAtualizado?.equipe_id || null
      }

      setUser(userData)

      // ===== CARREGAR MEMBROS DA EQUIPE =====
      if (userData.equipeId) {
        await carregarMembrosEquipe(userData.equipeId)
      } else {
        setMembrosEquipe([])
      }

    } catch (error) {
      console.error('Erro ao carregar usuário:', error)
    } finally {
      setLoading(false)
    }
  }

  // ===== FUNÇÃO: CARREGAR MEMBROS DA EQUIPE =====
  const carregarMembrosEquipe = async (equipeId) => {
    try {
      const { data, error } = await supabase
        .from('usuarios')
        .select('*')
        .eq('equipe_id', equipeId)

      if (error) throw error

      // Definir cores fixas para cada membro (baseado no email)
      const coresPorEmail = {
        'greguereisferreira@gmail.com': { cor: '#8B5CF6', corClara: '#EDE9FE' }, // Roxo
        'sther@gmail.com': { cor: '#3B82F6', corClara: '#DBEAFE' }, // Azul
        'greg@gmail.com': { cor: '#10B981', corClara: '#D1FAE5' }, // Verde
        // Adicione mais membros aqui conforme necessário
        // Exemplo: 'email@exemplo.com': { cor: '#F59E0B', corClara: '#FEF3C7' }, // Amarelo
      }

      const membrosComCores = (data || []).map(membro => {
        const cores = coresPorEmail[membro.email] || { cor: '#6B7280', corClara: '#F3F4F6' }
        return {
          ...membro,
          cor: cores.cor,
          corClara: cores.corClara
        }
      })

      setMembrosEquipe(membrosComCores)
    } catch (error) {
      console.error('Erro ao carregar membros da equipe:', error)
      setMembrosEquipe([])
    }
  }

  // ===== FUNÇÃO: RECARREGAR USUÁRIO =====
  const recarregarUsuario = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (session?.user) {
      await carregarUsuario(session.user)
    }
  }

  // ===== FUNÇÃO: RECARREGAR MEMBROS DA EQUIPE =====
  const recarregarMembros = async () => {
    if (user?.equipeId) {
      await carregarMembrosEquipe(user.equipeId)
    }
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      carregarUsuario(session?.user || null)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      carregarUsuario(session?.user || null)
    })

    return () => subscription.unsubscribe()
  }, [])

  const login = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin
      }
    })
    if (error) throw error
  }

  const logout = async () => {
    await supabase.auth.signOut()
    setUser(null)
    setMembrosEquipe([])
  }

  return (
    <AuthContext.Provider value={{ 
      user, 
      loading, 
      login, 
      logout, 
      recarregarUsuario,
      recarregarMembros,
      membrosEquipe
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within AuthProvider')
  return context
}