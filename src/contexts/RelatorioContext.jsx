import { createContext, useContext, useState, useCallback } from 'react'
import { exportarPDF, exportarCSV } from '../utils/exportadores'

const RelatorioContext = createContext()

export function RelatorioProvider({ children }) {
  const [relatorioData, setRelatorioData] = useState({
    dados: [],
    colunas: [],
    titulo: '',
    nomeArquivo: 'relatorio'
  })
  const [exportando, setExportando] = useState(false)

  const gerarRelatorio = useCallback(async (dados, colunas, titulo, nomeArquivo) => {
    setExportando(true)
    try {
      // Aqui você pode adicionar lógica adicional, como salvar no histórico
      setRelatorioData({ dados, colunas, titulo, nomeArquivo })
      return true
    } catch (error) {
      console.error('Erro ao gerar relatório:', error)
      return false
    } finally {
      setExportando(false)
    }
  }, [])

  const exportarPDF = useCallback((dados, colunas, titulo, nomeArquivo) => {
    return exportarPDF(dados, colunas, titulo, nomeArquivo)
  }, [])

  const exportarCSV = useCallback((dados, colunas, nomeArquivo) => {
    return exportarCSV(dados, colunas, nomeArquivo)
  }, [])

  return (
    <RelatorioContext.Provider value={{
      relatorioData,
      exportando,
      gerarRelatorio,
      exportarPDF,
      exportarCSV
    }}>
      {children}
    </RelatorioContext.Provider>
  )
}

export function useRelatorios() {
  const context = useContext(RelatorioContext)
  if (!context) {
    throw new Error('useRelatorios must be used within RelatorioProvider')
  }
  return context
}