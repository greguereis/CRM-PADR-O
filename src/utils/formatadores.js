/**
 * ===== FORMATADORES DO PARHUB CRM =====
 * Funções para formatação de dados em toda a aplicação
 */

/**
 * Formata um valor para moeda brasileira (R$)
 * @param {number} value - Valor a ser formatado
 * @returns {string} Valor formatado ou '-' se for nulo/indefinido
 */
export const formatCurrency = (value) => {
  if (value === null || value === undefined) return '-'
  if (value === 0) return 'R$ 0,00'
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value)
}

/**
 * Formata uma data para o formato brasileiro (dd/mm/aaaa)
 * @param {string|Date} date - Data a ser formatada
 * @returns {string} Data formatada ou '-' se for inválida
 */
export const formatDate = (date) => {
  if (!date) return '-'
  try {
    const d = typeof date === 'string' ? new Date(date) : date
    if (isNaN(d.getTime())) return '-'
    return d.toLocaleDateString('pt-BR')
  } catch {
    return '-'
  }
}

/**
 * Formata uma data e hora para o formato brasileiro (dd/mm/aaaa HH:mm)
 * @param {string|Date} date - Data a ser formatada
 * @returns {string} Data e hora formatadas ou '-' se for inválida
 */
export const formatDateTime = (date) => {
  if (!date) return '-'
  try {
    const d = typeof date === 'string' ? new Date(date) : date
    if (isNaN(d.getTime())) return '-'
    return d.toLocaleDateString('pt-BR') + ' ' + d.toLocaleTimeString('pt-BR', { 
      hour: '2-digit', 
      minute: '2-digit' 
    })
  } catch {
    return '-'
  }
}

/**
 * Formata um número de telefone para o formato brasileiro
 * @param {string} phone - Número de telefone (apenas dígitos)
 * @returns {string} Telefone formatado ou '-' se for inválido
 */
export const formatPhone = (phone) => {
  if (!phone) return '-'
  
  // Remove tudo que não é dígito
  const p = phone.replace(/\D/g, '')
  
  // Formata dependendo do tamanho
  if (p.length === 10) {
    // (XX) XXXX-XXXX
    return `(${p.slice(0,2)}) ${p.slice(2,6)}-${p.slice(6)}`
  } else if (p.length === 11) {
    // (XX) XXXXX-XXXX
    return `(${p.slice(0,2)}) ${p.slice(2,7)}-${p.slice(7)}`
  } else if (p.length === 8) {
    // XXXX-XXXX
    return `${p.slice(0,4)}-${p.slice(4)}`
  } else if (p.length === 9) {
    // XXXXX-XXXX
    return `${p.slice(0,5)}-${p.slice(5)}`
  }
  
  // Retorna o número sem formatação se não for possível formatar
  return phone
}

/**
 * Formata o status do lead para exibição
 * @param {string} status - Status do lead (código interno)
 * @returns {string} Status formatado para exibição
 */
export const formatStatus = (status) => {
  const statusMap = {
    // Status novos (versão 2.0)
    lead_entrou: 'Lead Entrou',
    contato_inicial: 'Contato Inicial',
    agendou_visita: 'Agendou Visita',
    atendido: 'Atendido',
    proposta_enviada: 'Proposta Enviada',
    negociacao: 'Negociação',
    contrato_fechado: '✅ Contrato Fechado',
    perdeu: 'Perdeu',
    // Status antigos (compatibilidade)
    nao_abordado: 'Não Abordado',
    abordado: 'Abordado',
    respondeu: 'Respondeu',
    reuniao: 'Reunião',
    proposta: 'Proposta',
    fechou: 'Fechou'
  }
  return statusMap[status] || status
}

/**
 * Formata a origem do lead para exibição
 * @param {string} origem - Origem do lead (código interno)
 * @returns {string} Origem formatada para exibição
 */
export const formatOrigem = (origem) => {
  const origemMap = {
    trafego_pago: '🚀 Tráfego Pago',
    loja_fisica: '🏢 Loja Física',
    indicacao: '🤝 Indicação'
  }
  return origemMap[origem] || origem
}

/**
 * Formata o tipo de financiamento para exibição
 * @param {string} tipo - Tipo de financiamento (código interno)
 * @returns {string} Tipo formatado para exibição
 */
export const formatTipoFinanciamento = (tipo) => {
  const tipoMap = {
    consorcio: 'Consórcio',
    financiamento: 'Financiamento',
    a_vista: 'À Vista'
  }
  return tipoMap[tipo] || tipo
}

/**
 * Formata o status do lead com emoji para exibição
 * @param {string} status - Status do lead (código interno)
 * @returns {string} Status formatado com emoji
 */
export const formatStatusWithEmoji = (status) => {
  const statusMap = {
    lead_entrou: '📥 Lead Entrou',
    contato_inicial: '📞 Contato Inicial',
    agendou_visita: '📅 Agendou Visita',
    atendido: '✅ Atendido',
    proposta_enviada: '📄 Proposta Enviada',
    negociacao: '🤝 Negociação',
    contrato_fechado: '🎉 Contrato Fechado',
    perdeu: '❌ Perdeu',
    nao_abordado: '⏳ Não Abordado',
    abordado: '👋 Abordado',
    respondeu: '💬 Respondeu',
    reuniao: '👥 Reunião',
    proposta: '📋 Proposta',
    fechou: '🏆 Fechou'
  }
  return statusMap[status] || status
}