const PDFDocument = require('pdfkit')

function formatarData(data) {
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
    timeZone: 'America/Araguaina'
  }).format(new Date(data))
}

function gerarPdf(relatorio) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 45, bufferPages: true })
    const partes = []
    doc.on('data', parte => partes.push(parte))
    doc.on('end', () => resolve(Buffer.concat(partes)))
    doc.on('error', reject)

    doc.fontSize(20).fillColor('#a3ff10').text('Insulog', { align: 'center' })
    doc.moveDown(0.3).fontSize(16).fillColor('#222').text('Relatorio de controle glicemico e insulina', { align: 'center' })
    doc.moveDown()
    doc.fontSize(10)
      .text(`Paciente: ${relatorio.usuario.nome}`)
      .text(`Periodo: ${relatorio.periodo.dataInicio} a ${relatorio.periodo.dataFim}`)
      .text(`Gerado em: ${formatarData(relatorio.geradoEm)}`)

    const resumo = relatorio.resumo
    doc.moveDown().fontSize(14).fillColor('#176B87').text('Resumo')
    doc.fontSize(10).fillColor('#222')
      .text(`Registros: ${resumo.totalRegistros} em ${resumo.totalDias} dia(s)`)
      .text(`Glicose media: ${resumo.media} mg/dL | Minima: ${resumo.minimo} | Maxima: ${resumo.maximo}`)
      .text(`CV: ${resumo.cv}% | GMI estimado: ${resumo.gmi}%`)
      .text(`Insulina total: ${resumo.totalInsulina} UI | Media diaria: ${resumo.mediaDiariaInsulina} UI`)

    doc.moveDown().fontSize(14).fillColor('#176B87').text('Faixas glicemicas')
    doc.fontSize(10).fillColor('#222')
    for (const faixa of resumo.faixas) {
      doc.text(`${faixa.descricao}: ${faixa.quantidade} (${faixa.percentual}%)`)
    }

    doc.addPage().fontSize(14).fillColor('#176B87').text('Registros completos')
    doc.moveDown(0.5).fontSize(8).fillColor('#222')

    for (const registro of relatorio.registros) {
      if (doc.y > 740) doc.addPage()
      const insulina = registro.insulinas.length
        ? registro.insulinas.map(item => `${item.tipo}: ${item.unidades} UI`).join(', ')
        : '-'
      doc.text(`${formatarData(registro.dataHora)} | ${registro.glicose} mg/dL | ${registro.classificacao}`)
      doc.text(`Periodo: ${registro.periodo} | Insulina: ${insulina}`)
      if (registro.observacao) doc.text(`Observacao: ${registro.observacao}`)
      doc.moveDown(0.5)
    }

    const paginas = doc.bufferedPageRange()
    for (let indice = paginas.start; indice < paginas.start + paginas.count; indice += 1) {
      doc.switchToPage(indice)
      doc.fontSize(8).fillColor('#666').text(
        `Dados informados pelo paciente | Pagina ${indice + 1} de ${paginas.count}`,
        45,
        800,
        { width: 505, align: 'center' }
      )
    }

    doc.end()
  })
}

module.exports = { gerarPdf }
