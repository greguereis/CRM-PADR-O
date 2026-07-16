import { useState, useCallback } from 'react'
import { exportarPDF, exportarCSV } from '../utils/exportadores'
import toast from 'react-hot-toast'

export function useRelatorios() {
  const [exportando, setExportando] = useState(false)
  const [progresso, setProgresso] = useState(0)

  // ===== FORMATAR DADOS PARA RELATÓRIO =====
  const formatarDados = useCallback((dados, colunas) => {
    return dados.map(item => {
      const linha = {}
      colunas.forEach(col => {
        let valor = item[col.key]
        if (col.formatter) {
          valor = col.formatter(valor)
        }
        linha[col.key] = valor ?? '-'
      })
      return linha
    })
  }, [])

  // ===== EXPORTAR PDF =====
  const exportarPDF = useCallback(async ({
    dados,
    colunas,
    titulo = 'Relatório',
    subtitulo = '',
    nomeArquivo = 'relatorio',
    filtros = null
  }) => {
    setExportando(true)
    setProgresso(0)

    try {
      // Usar a função do exportadores.js
      const sucesso = await exportarPDF(dados, colunas, titulo, nomeArquivo)
      
      if (sucesso) {
        setProgresso(100)
        toast.success('PDF exportado com sucesso!')
        return true
      } else {
        toast.error('Erro ao exportar PDF')
        return false
      }
    } catch (error) {
      console.error('Erro ao exportar PDF:', error)
      toast.error('Erro ao exportar PDF: ' + error.message)
      return false
    } finally {
      setExportando(false)
      setProgresso(0)
    }
  }, [])

  // ===== EXPORTAR CSV =====
  const exportarCSV = useCallback(async ({
    dados,
    colunas,
    nomeArquivo = 'relatorio',
    separador = ',',
    delimitador = '"'
  }) => {
    setExportando(true)
    setProgresso(0)

    try {
      // Usar a função do exportadores.js
      const sucesso = await exportarCSV(dados, colunas, nomeArquivo)
      
      if (sucesso) {
        setProgresso(100)
        toast.success('CSV exportado com sucesso!')
        return true
      } else {
        toast.error('Erro ao exportar CSV')
        return false
      }
    } catch (error) {
      console.error('Erro ao exportar CSV:', error)
      toast.error('Erro ao exportar CSV: ' + error.message)
      return false
    } finally {
      setExportando(false)
      setProgresso(0)
    }
  }, [])

  // ===== GERAR RELATÓRIO COMPLETO (PDF + CSV) =====
  const gerarRelatorio = useCallback(async (opcoes) => {
    const { formato, ...resto } = opcoes
    
    if (formato === 'pdf') {
      return await exportarPDF(resto)
    } else if (formato === 'csv') {
      return await exportarCSV(resto)
    } else {
      toast.error('Formato de relatório inválido')
      return false
    }
  }, [exportarPDF, exportarCSV])

  // ===== VALIDAR DADOS PARA RELATÓRIO =====
  const validarDados = useCallback((dados, colunas) => {
    if (!dados || dados.length === 0) {
      toast.warning('Não há dados para exportar')
      return false
    }
    if (!colunas || colunas.length === 0) {
      toast.error('Colunas não definidas')
      return false
    }
    return true
  }, [])

  return {
    exportando,
    progresso,
    formatarDados,
    exportarPDF,
    exportarCSV,
    gerarRelatorio,
    validarDados
  }
}