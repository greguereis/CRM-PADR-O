import { useState } from 'react'
import { X, Car } from 'lucide-react'
import toast from 'react-hot-toast'

export default function TestDriveForm({ 
  isOpen, 
  onClose, 
  onSave,
  clientes = [],
  funcionarioId,
  veiculoSugerido = ''
}) {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    cliente_id: '',
    veiculo: veiculoSugerido || '',
    data: '',
    hora: '',
    observacoes: ''
  })

  if (!isOpen) return null

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!formData.cliente_id) {
      toast.error('Selecione um cliente')
      return
    }

    if (!formData.data || !formData.hora) {
      toast.error('Preencha data e hora')
      return
    }

    setLoading(true)
    try {
      const dataHora = new Date(`${formData.data}T${formData.hora}:00`).toISOString()
      
      await onSave({
        tipo: 'test_drive',
        cliente_id: formData.cliente_id,
        funcionario_id: funcionarioId,
        veiculo: formData.veiculo || null,
        data_hora: dataHora,
        duracao_minutos: 30,
        observacoes: formData.observacoes || null
      })
      
      toast.success('Test-drive agendado!')
      onClose()
    } catch (error) {
      console.error('Erro ao agendar test-drive:', error)
      toast.error('Erro ao agendar test-drive')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl p-6 w-full max-w-md shadow-2xl z-10">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-[var(--text-primary)] flex items-center gap-2">
            <Car size={20} className="text-[#D2B68A]" />
            Agendar Test-Drive
          </h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-[var(--bg-tertiary)] text-[var(--text-secondary)]">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium text-[var(--text-secondary)] block mb-1">
              Cliente *
            </label>
            <select
              name="cliente_id"
              value={formData.cliente_id}
              onChange={handleChange}
              className="w-full px-3 py-2 bg-[var(--bg-tertiary)] rounded-lg text-sm text-[var(--text-primary)] border border-[var(--border-color)] focus:border-[#D2B68A] outline-none"
              required
            >
              <option value="">Selecione um cliente</option>
              {clientes.map(cliente => (
                <option key={cliente.id} value={cliente.id}>
                  {cliente.nome} {cliente.veiculo_interesse ? `- ${cliente.veiculo_interesse}` : ''}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-sm font-medium text-[var(--text-secondary)] block mb-1">
              Veículo
            </label>
            <input
              type="text"
              name="veiculo"
              value={formData.veiculo}
              onChange={handleChange}
              placeholder="Ex: Honda Civic 2022"
              className="w-full px-3 py-2 bg-[var(--bg-tertiary)] rounded-lg text-sm text-[var(--text-primary)] border border-[var(--border-color)] focus:border-[#D2B68A] outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-[var(--text-secondary)] block mb-1">
                Data *
              </label>
              <input
                type="date"
                name="data"
                value={formData.data}
                onChange={handleChange}
                className="w-full px-3 py-2 bg-[var(--bg-tertiary)] rounded-lg text-sm text-[var(--text-primary)] border border-[var(--border-color)] focus:border-[#D2B68A] outline-none"
                required
              />
            </div>
            <div>
              <label className="text-sm font-medium text-[var(--text-secondary)] block mb-1">
                Hora *
              </label>
              <input
                type="time"
                name="hora"
                value={formData.hora}
                onChange={handleChange}
                className="w-full px-3 py-2 bg-[var(--bg-tertiary)] rounded-lg text-sm text-[var(--text-primary)] border border-[var(--border-color)] focus:border-[#D2B68A] outline-none"
                required
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-[var(--text-secondary)] block mb-1">
              Observações
            </label>
            <textarea
              name="observacoes"
              value={formData.observacoes}
              onChange={handleChange}
              rows="2"
              placeholder="Detalhes adicionais..."
              className="w-full px-3 py-2 bg-[var(--bg-tertiary)] rounded-lg text-sm text-[var(--text-primary)] border border-[var(--border-color)] focus:border-[#D2B68A] outline-none resize-none"
            />
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 text-sm rounded-lg border border-[var(--border-color)] text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2.5 text-sm rounded-lg bg-[#D2B68A] text-[#222D52] hover:bg-[#C4A67A] disabled:opacity-50 font-medium flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-[#222D52] border-t-transparent rounded-full animate-spin" />
                  Agendando...
                </>
              ) : (
                <>
                  <Car size={16} />
                  Agendar Test-Drive
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}