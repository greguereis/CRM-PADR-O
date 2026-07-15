import { useState } from 'react'
import { Calendar, ChevronDown } from 'lucide-react'

export default function PeriodoSelector({ 
  valueInicio, 
  valueFim, 
  onChange,
  className = ''
}) {
  const [aberto, setAberto] = useState(false)
  const [inicio, setInicio] = useState(valueInicio || '')
  const [fim, setFim] = useState(valueFim || '')

  const aplicar = () => {
    onChange(inicio, fim)
    setAberto(false)
  }

  const limpar = () => {
    setInicio('')
    setFim('')
    onChange('', '')
    setAberto(false)
  }

  return (
    <div className={`relative ${className}`}>
      <button
        onClick={() => setAberto(!aberto)}
        className="flex items-center gap-2 px-3 py-2 bg-[var(--bg-tertiary)] rounded-lg text-sm text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors"
      >
        <Calendar size={16} className="text-[#D2B68A]" />
        <span>
          {inicio || fim ? (
            <>
              {inicio ? new Date(inicio).toLocaleDateString('pt-BR') : '...'}
              {inicio && fim ? ' até ' : ''}
              {fim ? new Date(fim).toLocaleDateString('pt-BR') : ''}
            </>
          ) : (
            'Selecionar período'
          )}
        </span>
        <ChevronDown size={14} className={`transition-transform ${aberto ? 'rotate-180' : ''}`} />
      </button>

      {aberto && (
        <div className="absolute top-full left-0 mt-1 z-20 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-lg p-4 shadow-lg w-64">
          <div className="space-y-2">
            <div>
              <label className="text-xs text-[var(--text-muted)]">Data Início</label>
              <input
                type="date"
                value={inicio}
                onChange={(e) => setInicio(e.target.value)}
                className="w-full px-3 py-1.5 bg-[var(--bg-tertiary)] rounded-lg text-sm text-[var(--text-primary)] border border-[var(--border-color)] focus:border-[#D2B68A] outline-none"
              />
            </div>
            <div>
              <label className="text-xs text-[var(--text-muted)]">Data Fim</label>
              <input
                type="date"
                value={fim}
                onChange={(e) => setFim(e.target.value)}
                className="w-full px-3 py-1.5 bg-[var(--bg-tertiary)] rounded-lg text-sm text-[var(--text-primary)] border border-[var(--border-color)] focus:border-[#D2B68A] outline-none"
              />
            </div>
            <div className="flex gap-2 pt-2">
              <button
                onClick={aplicar}
                className="flex-1 py-1.5 text-sm rounded-lg bg-[#D2B68A] text-[#222D52] hover:bg-[#C4A67A] transition-colors"
              >
                Aplicar
              </button>
              <button
                onClick={limpar}
                className="flex-1 py-1.5 text-sm rounded-lg border border-[var(--border-color)] text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] transition-colors"
              >
                Limpar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}