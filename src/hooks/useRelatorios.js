import { useState, useCallback } from 'react'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
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
      const doc = new jsPDF()
      const dataAtual = new Date().toLocaleString('pt-BR')
      let y = 20

      // ===== TÍTULO =====
      doc.setFontSize(16)
      doc.text(titulo, 14, y)
      y += 8

      // ===== SUBTÍTULO =====
      if (subtitulo) {
        doc.setFontSize(11)
        doc.text(subtitulo, 14, y)
        y += 7
      }

      // ===== INFORMAÇÕES ADICIONAIS =====
      doc.setFontSize(9)
      doc.text(`Gerado em: ${dataAtual}`, 14, y)
      y += 5
      doc.text(`Total de registros: ${dados.length}`, 14, y)
      y += 5

      // ===== FILTROS APLICADOS =====
      if (filtros) {
        let filtroTexto = ''
        if (filtros.dataInicio && filtros.dataFim) {
          filtroTexto = `Período: ${new Date(filtros.dataInicio).toLocaleDateString('pt-BR')} até ${new Date(filtros.dataFim).toLocaleDateString('pt-BR')}`
        } else if (filtros.dataInicio) {
          filtroTexto = `A partir de: ${new Date(filtros.dataInicio).toLocaleDateString('pt-BR')}`
        } else if (filtros.dataFim) {
          filtroTexto = `Até: ${new Date(filtros.dataFim).toLocaleDateString('pt-BR')}`
        }
        if (filtroTexto) {
          doc.text(filtroTexto, 14, y)
          y += 5
        }
        if (filtros.status && filtros.status !== 'todos') {
          doc.text(`Status: ${filtros.status}`, 14, y)
          y += 5
        }
        if (filtros.vendedor) {
          doc.text(`Vendedor: ${filtros.vendedor}`, 14, y)
          y += 5
        }
      }

      y += 5

      // ===== CABEÇALHO DA TABELA =====
      const cabecalho = colunas.map(c => c.label)

      // ===== CORPO DA TABELA =====
      const linhas = dados.map(item => 
        colunas.map(c => {
          let valor = item[c.key]
          if (c.formatter) {
            valor = c.formatter(valor)
          }
          return valor ?? '-'
        })
      )

      // ===== GERAR TABELA =====
      autoTable(doc, {
        startY: y,
        head: [cabecalho],
        body: linhas,
        theme: 'grid',
        headStyles: { 
          fillColor: [210, 182, 138], 
          textColor: [34, 45, 82],
          fontSize: 8,
          fontStyle: 'bold'
        },
        styles: { 
          fontSize: 7,
          cellPadding: 2,
          overflow: 'linebreak'
        },
        columnStyles: {
          0: { cellWidth: 'auto' }
        },
        margin: { left: 10, right: 10 },
        didDrawPage: (data) => {
          // Rodapé
          const pageCount = doc.internal.getNumberOfPages()
          for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i)
            doc.setFontSize(7)
            doc.text(
              `Página ${i} de ${pageCount}`,
              doc.internal.pageSize.width / 2,
              doc.internal.pageSize.height - 5,
              { align: 'center' }
            )
          }
        }
      })

      // ===== SALVAR =====
      const nomeCompleto = `${nomeArquivo}-${new Date().toISOString().split('T')[0]}`
      doc.save(`${nomeCompleto}.pdf`)

      setProgresso(100)
      toast.success('PDF exportado com sucesso!')
      return true
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
      // ===== CABEÇALHO =====
      const cabecalho = colunas.map(c => c.label).join(separador)

      // ===== LINHAS =====
      const linhas = dados.map(item => {
        return colunas.map(c => {
          let valor = item[c.key]
          if (c.formatter) {
            valor = c.formatter(valor)
          }
          if (valor === null || valor === undefined) {
            valor = ''
          }
          // Escape para CSV
          const stringValor = String(valor)
          if (stringValor.includes(separador) || stringValor.includes(delimitador) || stringValor.includes('\n')) {
            return delimitador + stringValor.replace(new RegExp(delimitador, 'g'), delimitador + delimitador) + delimitador
          }
          return stringValor
        }).join(separador)
      })

      // ===== MONTAR CSV =====
      const csv = [cabecalho, ...linhas].join('\n')
      
      // Adicionar BOM para UTF-8
      const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
      
      // ===== DOWNLOAD =====
      const link = document.createElement('a')
      link.href = URL.createObjectURL(blob)
      link.download = `${nomeArquivo}-${new Date().toISOString().split('T')[0]}.csv`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(link.href)

      setProgresso(100)
      toast.success('CSV exportado com sucesso!')
      return true
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