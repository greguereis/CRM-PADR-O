import { createClient } from '@supabase/supabase-js'

// ===== CONFIGURAÇÕES DO SUPABASE =====
// Estas variáveis devem ser definidas no arquivo .env.local
// VITE_SUPABASE_URL=sua_url_do_supabase
// VITE_SUPABASE_ANON_KEY=sua_chave_anonima

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://pbmhfginokmiacehhjyq.supabase.co'
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_j9l94VBA0IWQyrx4pE739w_9ojkJF_9'

// ===== CRIAÇÃO DO CLIENTE =====
export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  },
  db: {
    schema: 'public'
  }
})

// ===== FUNÇÕES AUXILIARES =====

/**
 * Verifica se o usuário está autenticado
 * @returns {Promise<boolean>}
 */
export const isAuthenticated = async () => {
  const { data: { session } } = await supabase.auth.getSession()
  return !!session
}

/**
 * Obtém o usuário atual
 * @returns {Promise<Object|null>}
 */
export const getCurrentUser = async () => {
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

/**
 * Obtém a sessão atual
 * @returns {Promise<Object|null>}
 */
export const getCurrentSession = async () => {
  const { data: { session } } = await supabase.auth.getSession()
  return session
}

/**
 * Faz logout do usuário
 * @returns {Promise<void>}
 */
export const signOut = async () => {
  await supabase.auth.signOut()
}

/**
 * Verifica se o usuário é administrador
 * @param {string} email - Email do usuário
 * @returns {boolean}
 */
export const isAdminUser = (email) => {
  return email === 'greguereisferreira@gmail.com'
}

/**
 * Obtém o ID da equipe do usuário atual
 * @returns {Promise<string|null>}
 */
export const getCurrentUserEquipeId = async () => {
  const user = await getCurrentUser()
  if (!user) return null

  const { data, error } = await supabase
    .from('usuarios')
    .select('equipe_id')
    .eq('id', user.id)
    .single()

  if (error) {
    console.error('Erro ao buscar equipe do usuário:', error)
    return null
  }

  return data?.equipe_id || null
}

/**
 * Busca todos os membros de uma equipe
 * @param {string} equipeId - ID da equipe
 * @returns {Promise<Array>}
 */
export const getMembrosEquipe = async (equipeId) => {
  if (!equipeId) return []

  const { data, error } = await supabase
    .from('usuarios')
    .select('*')
    .eq('equipe_id', equipeId)

  if (error) {
    console.error('Erro ao buscar membros da equipe:', error)
    return []
  }

  return data || []
}

/**
 * Busca informações de um usuário pelo ID
 * @param {string} userId - ID do usuário
 * @returns {Promise<Object|null>}
 */
export const getUsuarioById = async (userId) => {
  if (!userId) return null

  const { data, error } = await supabase
    .from('usuarios')
    .select('*')
    .eq('id', userId)
    .single()

  if (error) {
    console.error('Erro ao buscar usuário:', error)
    return null
  }

  return data
}

/**
 * Busca informações de um contato pelo ID
 * @param {string} contatoId - ID do contato
 * @returns {Promise<Object|null>}
 */
export const getContatoById = async (contatoId) => {
  if (!contatoId) return null

  const { data, error } = await supabase
    .from('contatos')
    .select('*')
    .eq('id', contatoId)
    .single()

  if (error) {
    console.error('Erro ao buscar contato:', error)
    return null
  }

  return data
}

/**
 * Busca todos os contatos de uma equipe
 * @param {string} equipeId - ID da equipe
 * @param {Object} filtros - Filtros opcionais
 * @returns {Promise<Array>}
 */
export const getContatosByEquipe = async (equipeId, filtros = {}) => {
  if (!equipeId) return []

  let query = supabase
    .from('contatos')
    .select('*')
    .eq('equipe_id', equipeId)
    .is('deletado_em', null)

  if (filtros.status && filtros.status !== 'todos') {
    query = query.eq('status', filtros.status)
  }

  if (filtros.origem && filtros.origem !== 'todos') {
    query = query.eq('origem', filtros.origem)
  }

  if (filtros.listaId) {
    query = query.eq('lista_id', filtros.listaId)
  }

  const { data, error } = await query.order('data_criacao', { ascending: false })

  if (error) {
    console.error('Erro ao buscar contatos:', error)
    return []
  }

  return data || []
}

/**
 * Busca todas as listas de uma equipe
 * @param {string} equipeId - ID da equipe
 * @returns {Promise<Array>}
 */
export const getListasByEquipe = async (equipeId) => {
  if (!equipeId) return []

  const { data, error } = await supabase
    .from('listas')
    .select('*')
    .eq('equipe_id', equipeId)
    .order('criado_em', { ascending: false })

  if (error) {
    console.error('Erro ao buscar listas:', error)
    return []
  }

  return data || []
}

/**
 * Busca todos os eventos de uma equipe
 * @param {string} equipeId - ID da equipe
 * @param {Object} filtros - Filtros opcionais
 * @returns {Promise<Array>}
 */
export const getEventosByEquipe = async (equipeId, filtros = {}) => {
  if (!equipeId) return []

  let query = supabase
    .from('eventos')
    .select('*')
    .eq('criado_por', equipeId) // Assumindo que criado_por é o ID do usuário

  if (filtros.tipo && filtros.tipo !== 'todos') {
    query = query.eq('tipo', filtros.tipo)
  }

  if (filtros.funcionarioId) {
    query = query.eq('funcionario_id', filtros.funcionarioId)
  }

  if (filtros.clienteId) {
    query = query.eq('cliente_id', filtros.clienteId)
  }

  if (filtros.dataInicio) {
    query = query.gte('data_hora', filtros.dataInicio)
  }

  if (filtros.dataFim) {
    query = query.lte('data_hora', filtros.dataFim)
  }

  const { data, error } = await query.order('data_hora', { ascending: true })

  if (error) {
    console.error('Erro ao buscar eventos:', error)
    return []
  }

  return data || []
}

/**
 * Busca todas as propostas de uma equipe
 * @param {string} equipeId - ID da equipe
 * @param {Object} filtros - Filtros opcionais
 * @returns {Promise<Array>}
 */
export const getPropostasByEquipe = async (equipeId, filtros = {}) => {
  if (!equipeId) return []

  let query = supabase
    .from('propostas')
    .select('*')
    .eq('equipe_id', equipeId)

  if (filtros.status && filtros.status !== 'todos') {
    query = query.eq('status', filtros.status)
  }

  if (filtros.vendedorId) {
    query = query.eq('vendedor_id', filtros.vendedorId)
  }

  if (filtros.dataInicio) {
    query = query.gte('data_envio', filtros.dataInicio)
  }

  if (filtros.dataFim) {
    query = query.lte('data_envio', filtros.dataFim)
  }

  const { data, error } = await query.order('data_envio', { ascending: false })

  if (error) {
    console.error('Erro ao buscar propostas:', error)
    return []
  }

  return data || []
}

/**
 * Busca todos os contratos de uma equipe
 * @param {string} equipeId - ID da equipe
 * @param {Object} filtros - Filtros opcionais
 * @returns {Promise<Array>}
 */
export const getContratosByEquipe = async (equipeId, filtros = {}) => {
  if (!equipeId) return []

  let query = supabase
    .from('contratos')
    .select('*')
    .eq('equipe_id', equipeId)

  if (filtros.vendedorId) {
    query = query.eq('vendedor_id', filtros.vendedorId)
  }

  if (filtros.formaPagamento && filtros.formaPagamento !== 'todos') {
    query = query.eq('forma_pagamento', filtros.formaPagamento)
  }

  if (filtros.dataInicio) {
    query = query.gte('data_fechamento', filtros.dataInicio)
  }

  if (filtros.dataFim) {
    query = query.lte('data_fechamento', filtros.dataFim)
  }

  const { data, error } = await query.order('data_fechamento', { ascending: false })

  if (error) {
    console.error('Erro ao buscar contratos:', error)
    return []
  }

  return data || []
}