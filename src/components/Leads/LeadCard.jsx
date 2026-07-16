import { useState } from 'react'
import { 
  Phone, MessageCircle, Mail, Car, DollarSign, 
  Calendar, Edit2, Trash2, Eye, ChevronDown, ChevronUp,
  Tag, User, Building2, Clock, CheckCircle, XCircle,
  AlertTriangle, TrendingUp, TrendingDown, Star
} from 'lucide-react'
import { formatCurrency, formatDate, formatPhone } from '../../utils/formatadores'

export default function LeadCard({ 
  lead, 
  onEdit, 
  onDelete, 
  onView, 
  onStatusChange,
  onClick,
  className = '',
  compact = false
}) {
  const [expanded, setExpanded] = useState(false)

  // Status do lead com cores
  const statusConfig = {
    lead_entrou: { label: 'Lead Entrou', cor: 'bg-gray-500/10 text-gray-500', icon: <User size={14} /> },
    contato_inicial: { label: 'Contato Inicial', cor: 'bg-blue-500/10 text-blue-500', icon: <Phone size={14} /> },
    agendou_visita: { label: 'Agendou Visita', cor: 'bg-amber-500/10 text-amber-500', icon: <Calendar size={14} /> },
    atendido: { label: 'Atendido', cor: 'bg-purple-500/10 text-purple-500', icon: <CheckCircle size={14} /> },
    proposta_enviada: { label: 'Proposta Enviada', cor: 'bg-indigo-500/10 text-indigo-500', icon: <FileText size={14} /> },
    negociacao: { label: 'Negociação', cor: 'bg-orange-500/10 text-orange-500', icon: <TrendingUp size={14} /> },
    contrato_fechado: { label: '✅ Contrato Fechado', cor: 'bg-green-500/10 text-green-500', icon: <CheckCircle size={14} /> },
    perdeu: { label: 'Perdeu', cor: 'bg-red-500/10 text-red-500', icon: <XCircle size={14} /> }
  }

  const origemConfig = {
    trafego_pago: { label: '🚀 Tráfego Pago', cor: 'bg-blue-500/10 text-blue-500' },
    loja_fisica: { label: '🏢 Loja Física', cor: 'bg-purple-500/10 text-purple-500' },
    indicacao: { label: '🤝 Indicação', cor: 'bg-green-500/10 text-green-500' }
  }

  const status = statusConfig[lead.status] || statusConfig.lead_entrou
  const origem = origemConfig[lead.origem] || origemConfig.trafego_pago

  const handleClick = () => {
    if (onClick) onClick(lead)
  }

  const handleStatusChange = (e) => {
    e.stopPropagation()
    if (onStatusChange) onStatusChange(lead.id, e.target.value)
  }

  const handleEdit = (e) => {
    e.stopPropagation()
    if (onEdit) onEdit(lead)
  }

  const handleDelete = (e) => {
    e.stopPropagation()
    if (onDelete) onDelete(lead.id)
  }

  const handleView = (e) => {
    e.stopPropagation()
    if (onView) onView(lead)
  }

  if (compact) {
    return (
      <div 
        className={`bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-lg p-3 hover:border-[#D2B68A] transition-all cursor-pointer ${className}`}
        onClick={handleClick}
      >
        <div className="flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-[var(--text-primary)] truncate">
                {lead.nome}
              </span>
              <span className={`text-[8px] px-1.5 py-0.5 rounded-full ${status.cor}`}>
                {status.label}
              </span>
            </div>
            <div className="flex items-center gap-2 text-[10px] text-[var(--text-muted)]">
              {lead.veiculo_interesse && (
                <span className="flex items-center gap-0.5">
                  <Car size={10} /> {lead.veiculo_interesse}
                </span>
              )}
              {lead.valor_veiculo && (
                <span className="flex items-center gap-0.5">
                  <DollarSign size={10} /> {formatCurrency(lead.valor_veiculo)}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1">
            {lead.telefone && (
              <a
                href={`https://wa.me/55${lead.telefone.replace(/\D/g, '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="p-1.5 rounded-lg hover:bg-[#25D366]/10 text-[#25D366] transition-colors"
                onClick={(e) => e.stopPropagation()}
                title="WhatsApp"
              >
                <MessageCircle size={14} />
              </a>
            )}
            <button
              onClick={handleView}
              className="p-1.5 rounded-lg hover:bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-[#D2B68A] transition-colors"
              title="Ver detalhes"
            >
              <Eye size={14} />
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div 
      className={`bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-lg hover:border-[#D2B68A] transition-all cursor-pointer ${className}`}
      onClick={handleClick}
    >
      {/* Header do Card */}
      <div className="p-3">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="text-sm font-semibold text-[var(--text-primary)] truncate">
                {lead.nome}
              </h4>
              <span className={`text-[8px] px-1.5 py-0.5 rounded-full ${status.cor}`}>
                {status.icon} {status.label}
              </span>
            </div>
            <div className="flex items-center gap-1 flex-wrap mt-0.5">
              <span className={`text-[8px] px-1.5 py-0.5 rounded-full ${origem.cor}`}>
                {origem.label}
              </span>
              {lead.veiculo_interesse && (
                <span className="text-[10px] text-[var(--text-secondary)] flex items-center gap-0.5">
                  <Car size={12} /> {lead.veiculo_interesse}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            {lead.telefone && (
              <a
                href={`https://wa.me/55${lead.telefone.replace(/\D/g, '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="p-1.5 rounded-lg hover:bg-[#25D366]/10 text-[#25D366] transition-colors"
                onClick={(e) => e.stopPropagation()}
                title="WhatsApp"
              >
                <MessageCircle size={14} />
              </a>
            )}
            <button
              onClick={handleView}
              className="p-1.5 rounded-lg hover:bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-[#D2B68A] transition-colors"
              title="Ver detalhes"
            >
              <Eye size={14} />
            </button>
            <button
              onClick={handleEdit}
              className="p-1.5 rounded-lg hover:bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-[#D2B68A] transition-colors"
              title="Editar"
            >
              <Edit2 size={14} />
            </button>
            <button
              onClick={handleDelete}
              className="p-1.5 rounded-lg hover:bg-red-500/10 text-[var(--text-secondary)] hover:text-red-500 transition-colors"
              title="Excluir"
            >
              <Trash2 size={14} />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); setExpanded(!expanded) }}
              className="p-1.5 rounded-lg hover:bg-[var(--bg-tertiary)] text-[var(--text-secondary)] transition-colors"
              title={expanded ? 'Recolher' : 'Expandir'}
            >
              {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
          </div>
        </div>

        {/* Informações básicas */}
        <div className="flex flex-wrap gap-2 mt-2 text-[10px] text-[var(--text-secondary)]">
          {lead.telefone && (
            <span className="flex items-center gap-0.5 font-mono">
              <Phone size={10} /> {formatPhone(lead.telefone)}
            </span>
          )}
          {lead.email && (
            <span className="flex items-center gap-0.5 truncate max-w-[150px]">
              <Mail size={10} /> {lead.email}
            </span>
          )}
          {lead.valor_veiculo && (
            <span className="flex items-center gap-0.5 font-medium text-[#10B981]">
              <DollarSign size={10} /> {formatCurrency(lead.valor_veiculo)}
            </span>
          )}
          {lead.vendedor_nome && (
            <span className="flex items-center gap-0.5">
              <User size={10} /> {lead.vendedor_nome}
            </span>
          )}
        </div>

        {lead.data_criacao && (
          <div className="text-[9px] text-[var(--text-muted)] mt-1 flex items-center gap-1">
            <Clock size={10} />
            Entrou em: {formatDate(lead.data_criacao)}
          </div>
        )}
      </div>

      {/* Conteúdo Expandido */}
      {expanded && (
        <div className="px-3 pb-3 pt-0 border-t border-[var(--border-color)] space-y-2">
          {/* Valor da entrada e financiamento */}
          <div className="grid grid-cols-2 gap-2 mt-2">
            {lead.valor_entrada && (
              <div className="bg-[var(--bg-tertiary)] p-2 rounded-lg">
                <p className="text-[8px] text-[var(--text-muted)] uppercase tracking-wider">Entrada</p>
                <p className="text-sm font-medium text-[var(--text-primary)]">{formatCurrency(lead.valor_entrada)}</p>
              </div>
            )}
            {lead.tipo_financiamento && (
              <div className="bg-[var(--bg-tertiary)] p-2 rounded-lg">
                <p className="text-[8px] text-[var(--text-muted)] uppercase tracking-wider">Financiamento</p>
                <p className="text-sm font-medium text-[var(--text-primary)]">
                  {lead.tipo_financiamento === 'consorcio' ? 'Consórcio' :
                   lead.tipo_financiamento === 'financiamento' ? 'Financiamento' :
                   lead.tipo_financiamento === 'a_vista' ? 'À Vista' : lead.tipo_financiamento}
                </p>
              </div>
            )}
          </div>

          {/* Mudar Status */}
          <div>
            <label className="text-[10px] font-medium text-[var(--text-secondary)] block mb-0.5">Mudar Status</label>
            <select
              value={lead.status}
              onChange={handleStatusChange}
              className="w-full px-2 py-1 bg-[var(--bg-tertiary)] rounded-lg text-xs text-[var(--text-primary)] border border-[var(--border-color)] focus:border-[#D2B68A] outline-none"
            >
              {Object.entries(statusConfig).map(([key, config]) => (
                <option key={key} value={key}>{config.label}</option>
              ))}
            </select>
          </div>

          {/* Ações rápidas */}
          <div className="flex gap-2">
            {lead.telefone && (
              <a
                href={`tel:${lead.telefone}`}
                className="flex-1 py-1.5 text-center text-[10px] rounded-lg bg-blue-500/10 text-blue-500 hover:bg-blue-500/20 transition-colors"
              >
                📞 Ligar
              </a>
            )}
            <button
              onClick={() => { if (onView) onView(lead) }}
              className="flex-1 py-1.5 text-center text-[10px] rounded-lg bg-[#D2B68A]/10 text-[#D2B68A] hover:bg-[#D2B68A]/20 transition-colors"
            >
              📋 Ver Histórico
            </button>
          </div>
        </div>
      )}
    </div>
  )
}