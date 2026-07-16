import { useState } from 'react'
import { X, FileText, FileSpreadsheet, Calendar, Download } from 'lucide-react'
import toast from 'react-hot-toast'
import { exportarPDF, exportarCSV } from '../../utils/exportadores'

export default function RelatorioModal({ 
  isOpen, 
  onClose, 
  titulo, 
  dados, 
  colunas, 
  nomeArquivo = 'relatorio',
  periodoInicial = null,
  periodoFinal = null
}) {
  const [dataInicio, setDataInicio] = useState(periodoInicial || '')
  const [dataFim, setDataFim] = useState(periodoFinal || '')
  const [exportando, setExportando] = useState(false)

  if (!isOpen) return null

  // Filtra os dados pelo período
  const dadosFiltrados = dados.filter(item => {
    if (!dataInicio && !dataFim) return true
    
    const dataItem = item.data || item.data_criacao || item.data_envio || item.data_fechamento
    if (!dataItem) return true
    
    const dataObj = new Date(dataItem)
    const inicio = dataInicio ? new Date(dataInicio) : null
    const fim = dataFim ? new Date(dataFim) : null
    
    if (inicio && fim) {
      return dataObj >= inicio && dataObj <= fim
    }
    if (inicio) {
      return dataObj >= inicio
    }
    if (fim) {
      return dataObj <= fim
    }
    return true
  })

  const handleExportarPDF = () => {
    if (dadosFiltrados.length === 0) {
      toast.error('Não há dados para exportar')
      return
    }

    setExportando(true)
    try {
      const sucesso = exportarPDF(
        dadosFiltrados,
        colunas,
        titulo,
        nomeArquivo
      )
      if (sucesso) {
        toast.success('PDF exportado com sucesso!')
        onClose()
      }
    } catch (error) {
      console.error('Erro ao exportar PDF:', error)
      toast.error('Erro ao exportar PDF')
    } finally {
      setExportando(false)
    }
  }

  const handleExportarCSV = () => {
    if (dadosFiltrados.length === 0) {
      toast.error('Não há dados para exportar')
      return
    }

    setExportando(true)
    try {
      const sucesso = exportarCSV(
        dadosFiltrados,
        colunas,
        nomeArquivo
      )
      if (sucesso) {
        toast.success('CSV exportado com sucesso!')
        onClose()
      }
    } catch (error) {
      console.error('Erro ao exportar CSV:', error)
      toast.error('Erro ao exportar CSV')
    } finally {
      setExportando(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl p-6 w-full max-w-md shadow-2xl z-10">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-[var(--text-primary)] flex items-center gap-2">
            <Download size={20} className="text-[#D2B68A]" />
            {titulo}
          </h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-[var(--bg-tertiary)] text-[var(--text-secondary)]">
            <X size={20} />
          </button>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-[var(--text-secondary)] flex items-center gap-2">
              <Calendar size={16} />
              Período (opcional)
            </label>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-[var(--text-muted)]">Data Início</label>
                <input
                  type="date"
                  value={dataInicio}
                  onChange={(e) => setDataInicio(e.target.value)}
                  className="w-full px-3 py-2 bg-[var(--bg-tertiary)] rounded-lg text-sm text-[var(--text-primary)] border border-[var(--border-color)] focus:border-[#D2B68A] outline-none"
                />
              </div>
              <div>
                <label className="text-xs text-[var(--text-muted)]">Data Fim</label>
                <input
                  type="date"
                  value={dataFim}
                  onChange={(e) => setDataFim(e.target.value)}
                  className="w-full px-3 py-2 bg-[var(--bg-tertiary)] rounded-lg text-sm text-[var(--text-primary)] border border-[var(--border-color)] focus:border-[#D2B68A] outline-none"
                />
              </div>
            </div>
          </div>

          <div className="bg-[var(--bg-tertiary)] rounded-lg p-3">
            <p className="text-sm text-[var(--text-secondary)]">
              <span className="font-medium">{dadosFiltrados.length}</span> registros encontrados
              {dataInicio || dataFim ? ' (filtrados por período)' : ' (todos os registros)'}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={handleExportarPDF}
              disabled={exportando || dadosFiltrados.length === 0}
              className="flex items-center justify-center gap-2 p-3 rounded-lg bg-[#D2B68A] text-[#222D52] hover:bg-[#C4A67A] transition-all disabled:opacity-50 font-medium"
            >
              <FileText size={18} />
              PDF
            </button>
            <button
              onClick={handleExportarCSV}
              disabled={exportando || dadosFiltrados.length === 0}
              className="flex items-center justify-center gap-2 p-3 rounded-lg bg-green-500 text-white hover:bg-green-600 transition-all disabled:opacity-50 font-medium"
            >
              <FileSpreadsheet size={18} />
              CSV
            </button>
          </div>

          {exportando && (
            <div className="text-center text-sm text-[var(--text-secondary)]">
              <div className="w-6 h-6 border-2 border-[#D2B68A] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              Exportando...
            </div>
          )}

          <button
            onClick={onClose}
            className="w-full py-2.5 text-sm rounded-lg border border-[var(--border-color)] text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  )
}