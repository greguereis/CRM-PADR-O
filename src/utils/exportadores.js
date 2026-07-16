import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

/**
 * ===== EXPORTADORES DO PARHUB CRM =====
 * Funções para exportar dados em PDF e CSV
 */

/**
 * Exporta dados para um arquivo PDF
 * @param {Array} dados - Array de objetos a serem exportados
 * @param {Array} colunas - Array de objetos com { key, label, formatter? }
 * @param {string} titulo - Título do relatório
 * @param {string} nomeArquivo - Nome do arquivo sem extensão
 * @returns {boolean} - Sucesso da operação
 */
export const exportarPDF = (dados, colunas, titulo, nomeArquivo) => {
  try {
    // Validações
    if (!dados || dados.length === 0) {
      console.warn('Nenhum dado para exportar')
      return false
    }
    if (!colunas || colunas.length === 0) {
      console.warn('Nenhuma coluna definida')
      return false
    }

    const doc = new jsPDF()
    const dataAtual = new Date().toLocaleDateString('pt-BR')
    
    // Título
    doc.setFontSize(16)
    doc.text(titulo, 14, 18)
    doc.setFontSize(10)
    doc.text(`Gerado em: ${dataAtual}`, 14, 26)
    doc.text(`Total: ${dados.length} registros`, 14, 32)
    
    // Preparar cabeçalho e linhas
    const cabecalho = colunas.map(c => c.label)
    const linhas = dados.map(item => 
      colunas.map(c => {
        let valor = item[c.key]
        if (c.formatter) {
          valor = c.formatter(valor)
        }
        return valor ?? '-'
      })
    )
    
    // Gerar tabela
    autoTable(doc, {
      startY: 38,
      head: [cabecalho],
      body: linhas,
      theme: 'grid',
      headStyles: { 
        fillColor: [210, 182, 138], 
        textColor: [34, 45, 82],
        fontStyle: 'bold',
        fontSize: 8
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
    
    // Salvar
    const nomeCompleto = `${nomeArquivo}-${dataAtual.replace(/\//g, '-')}`
    doc.save(`${nomeCompleto}.pdf`)
    return true
  } catch (error) {
    console.error('Erro ao exportar PDF:', error)
    return false
  }
}

/**
 * Exporta dados para um arquivo CSV
 * @param {Array} dados - Array de objetos a serem exportados
 * @param {Array} colunas - Array de objetos com { key, label, formatter? }
 * @param {string} nomeArquivo - Nome do arquivo sem extensão
 * @param {string} separador - Separador de colunas (padrão: ',')
 * @param {string} delimitador - Delimitador de campos (padrão: '"')
 * @returns {boolean} - Sucesso da operação
 */
export const exportarCSV = (dados, colunas, nomeArquivo, separador = ',', delimitador = '"') => {
  try {
    // Validações
    if (!dados || dados.length === 0) {
      console.warn('Nenhum dado para exportar')
      return false
    }
    if (!colunas || colunas.length === 0) {
      console.warn('Nenhuma coluna definida')
      return false
    }

    // Cabeçalho
    const cabecalho = colunas.map(c => c.label).join(separador)
    
    // Linhas
    const linhas = dados.map(item => {
      return colunas.map(c => {
        let valor = item[c.key]
        if (c.formatter) {
          valor = c.formatter(valor)
        }
        // Tratar valores nulos/indefinidos
        if (valor === null || valor === undefined) {
          valor = ''
        }
        // Converter para string
        const stringValor = String(valor)
        // Escape para CSV (se contiver separador, delimitador ou quebra de linha)
        if (
          stringValor.includes(separador) || 
          stringValor.includes(delimitador) || 
          stringValor.includes('\n')
        ) {
          return delimitador + stringValor.replace(new RegExp(delimitador, 'g'), delimitador + delimitador) + delimitador
        }
        return stringValor
      }).join(separador)
    })
    
    // Montar CSV
    const csv = [cabecalho, ...linhas].join('\n')
    
    // Adicionar BOM para UTF-8 (garante compatibilidade com Excel)
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
    
    // Download
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    const dataAtual = new Date().toLocaleDateString('pt-BR').replace(/\//g, '-')
    link.download = `${nomeArquivo}-${dataAtual}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(link.href)
    
    return true
  } catch (error) {
    console.error('Erro ao exportar CSV:', error)
    return false
  }
}