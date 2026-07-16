import { useState, useEffect } from 'react'
import { X, Calendar, Clock, User, Car, FileText, Users } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import toast from 'react-hot-toast'

export default function ModalEvento({ 
  isOpen, 
  onClose, 
  evento = null, 
  onSave,
  clientes = [],
  membros = []
}) {
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    tipo: 'reuniao',
    cliente_id: '',
    funcionario_id: '',
    veiculo: '',
    data: '',
    hora: '',
    duracao: 30,
    local: '',
    observacoes: ''
  })

  const isEditando = !!evento

  useEffect(() => {
    if (evento) {
      const data = new Date(evento.data_hora)
      setFormData({
        tipo: evento.tipo || 'reuniao',
        cliente_id: evento.cliente_id || '',
        funcionario_id: evento.funcionario_id || '',
        veiculo: evento.veiculo || '',
        data: data.toISOString().split('T')[0],
        hora: data.toTimeString().slice(0, 5),
        duracao: evento.duracao_minutos || 30,
        local: evento.local || '',
        observacoes: evento.observacoes || ''
      })
    } else {
      // Reset para novo evento
      const agora = new Date()
      const dataAtual = agora.toISOString().split('T')[0]
      const horaAtual = agora.toTimeString().slice(0, 5)
      setFormData({
        tipo: 'reuniao',
        cliente_id: '',
        funcionario_id: user?.uid || '',
        veiculo: '',
        data: dataAtual,
        hora: horaAtual,
        duracao: 30,
        local: '',
        observacoes: ''
      })
    }
  }, [evento, user])

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

    if (formData.tipo === 'test_drive' && !formData.funcionario_id) {
      toast.error('Selecione o funcionário responsável pelo test-drive')
      return
    }

    setLoading(true)
    try {
      const dataHora = new Date(`${formData.data}T${formData.hora}:00`).toISOString()
      
      const eventoData = {
        tipo: formData.tipo,
        cliente_id: formData.cliente_id,
        funcionario_id: formData.tipo === 'test_drive' ? formData.funcionario_id : null,
        veiculo: formData.veiculo || null,
        data_hora: dataHora,
        duracao_minutos: parseInt(formData.duracao) || 30,
        local: formData.local || null,
        observacoes: formData.observacoes || null,
        criado_por: user.uid
      }

      await onSave(eventoData, evento?.id)
      toast.success(isEditando ? 'Evento atualizado!' : 'Evento criado!')
      onClose()
    } catch (error) {
      console.error('Erro ao salvar evento:', error)
      toast.error('Erro ao salvar evento')
    } finally {
      setLoading(false)
    }
  }

  const tiposEvento = [
    { value: 'reuniao', label: '📅 Reunião' },
    { value: 'test_drive', label: '🚗 Test-Drive' },
    { value: 'follow_up', label: '📞 Follow-up' }
  ]

  const opcoesDuracao = [15, 30, 45, 60, 90, 120]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl p-6 w-full max-w-lg shadow-2xl z-10 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-[var(--text-primary)] flex items-center gap-2">
            <Calendar size={20} className="text-[#D2B68A]" />
            {isEditando ? 'Editar Evento' : 'Novo Evento'}
          </h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-[var(--bg-tertiary)] text-[var(--text-secondary)]">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Tipo de Evento */}
          <div>
            <label className="text-sm font-medium text-[var(--text-secondary)] block mb-1">
              Tipo de Evento *
            </label>
            <select
              name="tipo"
              value={formData.tipo}
              onChange={handleChange}
              className="w-full px-3 py-2 bg-[var(--bg-tertiary)] rounded-lg text-sm text-[var(--text-primary)] border border-[var(--border-color)] focus:border-[#D2B68A] outline-none"
            >
              {tiposEvento.map(t => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>

          {/* Cliente */}
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

          {/* Funcionário Responsável (apenas para test-drive) */}
          {formData.tipo === 'test_drive' && (
            <div className="border-l-4 border-[#D2B68A] pl-3">
              <label className="text-sm font-medium text-[var(--text-secondary)] block mb-1 flex items-center gap-2">
                <Users size={16} className="text-[#D2B68A]" />
                Funcionário Responsável *
              </label>
              <select
                name="funcionario_id"
                value={formData.funcionario_id}
                onChange={handleChange}
                className="w-full px-3 py-2 bg-[var(--bg-tertiary)] rounded-lg text-sm text-[var(--text-primary)] border border-[#D2B68A] focus:border-[#D2B68A] outline-none"
                required
              >
                <option value="">Selecione o funcionário</option>
                {membros.map(membro => (
                  <option key={membro.id} value={membro.id}>
                    {membro.nome}
                  </option>
                ))}
              </select>
              <p className="text-xs text-[var(--text-muted)] mt-1">
                Este test-drive aparecerá na agenda do funcionário selecionado.
              </p>
            </div>
          )}

          {/* Veículo (opcional, mas útil para test-drive) */}
          <div>
            <label className="text-sm font-medium text-[var(--text-secondary)] block mb-1 flex items-center gap-2">
              <Car size={16} className="text-[#D2B68A]" />
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

          {/* Data e Hora */}
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

          {/* Duração */}
          <div>
            <label className="text-sm font-medium text-[var(--text-secondary)] block mb-1">
              Duração (minutos)
            </label>
            <select
              name="duracao"
              value={formData.duracao}
              onChange={handleChange}
              className="w-full px-3 py-2 bg-[var(--bg-tertiary)] rounded-lg text-sm text-[var(--text-primary)] border border-[var(--border-color)] focus:border-[#D2B68A] outline-none"
            >
              {opcoesDuracao.map(min => (
                <option key={min} value={min}>{min} min</option>
              ))}
            </select>
          </div>

          {/* Local */}
          <div>
            <label className="text-sm font-medium text-[var(--text-secondary)] block mb-1">
              Local
            </label>
            <input
              type="text"
              name="local"
              value={formData.local}
              onChange={handleChange}
              placeholder="Ex: Loja, Online, etc."
              className="w-full px-3 py-2 bg-[var(--bg-tertiary)] rounded-lg text-sm text-[var(--text-primary)] border border-[var(--border-color)] focus:border-[#D2B68A] outline-none"
            />
          </div>

          {/* Observações */}
          <div>
            <label className="text-sm font-medium text-[var(--text-secondary)] block mb-1 flex items-center gap-2">
              <FileText size={16} className="text-[#D2B68A]" />
              Observações
            </label>
            <textarea
              name="observacoes"
              value={formData.observacoes}
              onChange={handleChange}
              rows="3"
              placeholder="Detalhes adicionais..."
              className="w-full px-3 py-2 bg-[var(--bg-tertiary)] rounded-lg text-sm text-[var(--text-primary)] border border-[var(--border-color)] focus:border-[#D2B68A] outline-none resize-none"
            />
          </div>

          {/* Botões */}
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
                  Salvando...
                </>
              ) : (
                <>
                  <Calendar size={16} />
                  {isEditando ? 'Atualizar' : 'Criar'}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}