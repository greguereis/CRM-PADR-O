import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

export const exportarPDF = (dados, colunas, titulo, nomeArquivo) => {
  try {
    const doc = new jsPDF()
    const dataAtual = new Date().toLocaleDateString('pt-BR')
    
    doc.setFontSize(16)
    doc.text(titulo, 14, 18)
    doc.setFontSize(10)
    doc.text(`Gerado em: ${dataAtual}`, 14, 26)
    doc.text(`Total: ${dados.length} registros`, 14, 32)
    
    const cabecalho = colunas.map(c => c.label)
    const linhas = dados.map(item => 
      colunas.map(c => {
        let valor = item[c.key]
        if (c.formatter) {
          valor = c.formatter(valor)
        }
        return valor || '-'
      })
    )
    
    autoTable(doc, {
      startY: 38,
      head: [cabecalho],
      body: linhas,
      theme: 'grid',
      headStyles: { fillColor: [210, 182, 138], textColor: [34, 45, 82] },
      styles: { fontSize: 8 },
      margin: { left: 10, right: 10 }
    })
    
    doc.save(`${nomeArquivo}-${dataAtual.replace(/\//g, '-')}.pdf`)
    return true
  } catch (error) {
    console.error('Erro ao exportar PDF:', error)
    return false
  }
}

export const exportarCSV = (dados, colunas, nomeArquivo) => {
  try {
    const cabecalho = colunas.map(c => c.label).join(',')
    const linhas = dados.map(item => 
      colunas.map(c => {
        let valor = item[c.key]
        if (c.formatter) {
          valor = c.formatter(valor)
        }
        if (typeof valor === 'string' && (valor.includes(',') || valor.includes('"'))) {
          valor = `"${valor.replace(/"/g, '""')}"`
        }
        return valor || ''
      }).join(',')
    )
    
    const csv = [cabecalho, ...linhas].join('\n')
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `${nomeArquivo}-${new Date().toLocaleDateString('pt-BR').replace(/\//g, '-')}.csv`
    link.click()
    URL.revokeObjectURL(link.href)
    return true
  } catch (error) {
    console.error('Erro ao exportar CSV:', error)
    return false
  }
}