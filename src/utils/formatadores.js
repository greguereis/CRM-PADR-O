export const formatCurrency = (value) => {
  if (value === null || value === undefined || value === 0) return '-'
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value)
}

export const formatDate = (date) => {
  if (!date) return '-'
  try {
    const d = new Date(date)
    return d.toLocaleDateString('pt-BR')
  } catch {
    return '-'
  }
}

export const formatDateTime = (date) => {
  if (!date) return '-'
  try {
    const d = new Date(date)
    return d.toLocaleDateString('pt-BR') + ' ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  } catch {
    return '-'
  }
}

export const formatPhone = (phone) => {
  if (!phone) return '-'
  const p = phone.replace(/\D/g, '')
  if (p.length === 10) {
    return `(${p.slice(0,2)}) ${p.slice(2,6)}-${p.slice(6)}`
  } else if (p.length === 11) {
    return `(${p.slice(0,2)}) ${p.slice(2,7)}-${p.slice(7)}`
  }
  return phone
}

export const formatStatus = (status) => {
  const statusMap = {
    lead_entrou: 'Lead Entrou',
    contato_inicial: 'Contato Inicial',
    agendou_visita: 'Agendou Visita',
    atendido: 'Atendido',
    proposta_enviada: 'Proposta Enviada',
    negociacao: 'Negociação',
    contrato_fechado: 'Contrato Fechado',
    perdeu: 'Perdeu',
    // mantendo compatibilidade com status antigos
    nao_abordado: 'Não Abordado',
    abordado: 'Abordado',
    respondeu: 'Respondeu',
    reuniao: 'Reunião',
    proposta: 'Proposta',
    fechou: 'Fechou'
  }
  return statusMap[status] || status
}

export const formatOrigem = (origem) => {
  const origemMap = {
    trafego_pago: 'Tráfego Pago',
    loja_fisica: 'Loja Física',
    indicacao: 'Indicação'
  }
  return origemMap[origem] || origem
}

export const formatTipoFinanciamento = (tipo) => {
  const tipoMap = {
    consorcio: 'Consórcio',
    financiamento: 'Financiamento',
    a_vista: 'À Vista'
  }
  return tipoMap[tipo] || tipo
}