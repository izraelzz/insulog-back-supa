const fs = require('node:fs')
const path = require('node:path')
const PDFDocument = require('pdfkit')
const SVGtoPDF = require('svg-to-pdfkit')
const { calcularPadraoGlicose } = require('./padraoGlicose')
const { calcularComparativoDatas } = require('./comparativoDatas')
const { calcularEvolucaoGlicose } = require('./evolucaoGlicose')
const { calcularAnaliseInsulina } = require('./analiseInsulina')
const { calcularEventosRelevantes } = require('./eventosRelevantes')
const { prepararRegistrosCompletos } = require('./registrosCompletos')

const logoSvgPath = path.resolve(__dirname, '../../assets/images/insulogLogoSVG.svg')
const logoSvg = fs.readFileSync(logoSvgPath, 'utf8')
let sequenciaLogo = 0

function desenharLogo(doc, x, y, largura) {
  const altura = largura * (62 / 264)
  const id = `logo_${sequenciaLogo += 1}`
  const svgDimensionado = logoSvg
    .replace('<svg width="264" height="62"', `<svg width="${largura}" height="${altura}"`)
    .replaceAll('_2518_2837', `_2518_2837_${id}`)

  SVGtoPDF(doc, svgDimensionado, x, y, { width: largura, height: altura })
}

function formatarData(data) {
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
    timeZone: 'America/Araguaina'
  }).format(new Date(typeof data === 'string' && /^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}:\d{2}(\.\d+)?$/.test(data)
    ? `${data.replace(' ', 'T')}-03:00`
    : data))
}

function formatarDataCurta(data) {
  const [ano, mes, dia] = String(data).slice(0, 10).split('-')
  return `${dia}/${mes}/${ano}`
}

function formatarNumero(valor, casas = 1) {
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: casas,
    maximumFractionDigits: casas
  }).format(valor)
}

function contarAplicacoes(relatorio) {
  return relatorio.registros.reduce((total, registro) => total + registro.insulinas.length, 0)
}

function descreverTratamento(relatorio) {
  const tipos = new Set(
    relatorio.registros.flatMap(registro => registro.insulinas.map(insulina => insulina.tipo))
  )
  if (tipos.size === 0) return 'Sem aplicações registradas no período'
  return [...tipos].join(' + ')
}

function desenharCampo(doc, rotulo, valor, x, y, largura) {
  doc.font('Helvetica').fontSize(8).fillColor('#66879a').text(rotulo, x, y, { width: largura })
  doc.font('Helvetica-Bold').fontSize(9.5).fillColor('#27353d').text(String(valor), x, y + 15, {
    width: largura,
    height: 27,
    ellipsis: true
  })
}

function desenharCapa(doc, relatorio) {
  const larguraPagina = doc.page.width
  const margem = 45
  const larguraConteudo = larguraPagina - (margem * 2)
  const resumo = relatorio.resumo
  const aplicacoes = contarAplicacoes(relatorio)
  const mediaDiariaRegistros = resumo.totalRegistros / resumo.totalDias
  const inicio = formatarDataCurta(relatorio.periodo.dataInicio)
  const fim = formatarDataCurta(relatorio.periodo.dataFim)

  doc.save()
  doc.rect(0, 0, larguraPagina, 8).fill('#21c979')
  desenharLogo(doc, (larguraPagina - 215) / 2, 28, 215)

  doc.font('Helvetica-Bold').fontSize(19).fillColor('#27353d').text(
    'Relatório de Controle Glicêmico e Insulina',
    margem,
    111,
    { width: larguraConteudo, align: 'center' }
  )
  doc.font('Helvetica').fontSize(9).fillColor('#547589').text(
    'Resumo clínico baseado nos registros informados para acompanhamento endocrinológico',
    margem,
    139,
    { width: larguraConteudo, align: 'center' }
  )

  doc.roundedRect(margem, 182, larguraConteudo, 390, 14).lineWidth(0.8).strokeColor('#d5e1e5').stroke()
  doc.font('Helvetica-Bold').fontSize(14).fillColor('#27353d').text('Dados do relatório', margem + 23, 201)
  doc.roundedRect(margem + 23, 229, 104, 4, 2).fill('#21c979')

  const colunaEsquerda = margem + 23
  const colunaDireita = margem + 280
  const larguraCampo = 205
  const linhas = [255, 310, 365, 420, 475, 530]
  const tipoDiabetes = relatorio.usuario.tipo_diabetes || relatorio.usuario.tipoDiabetes || 'Não informado'

  desenharCampo(doc, 'Paciente:', relatorio.usuario.nome, colunaEsquerda, linhas[0], larguraCampo)
  desenharCampo(doc, 'Total de dias analisados:', `${resumo.totalDias} dia(s)`, colunaDireita, linhas[0], larguraCampo)
  desenharCampo(doc, 'Tipo de diabetes:', tipoDiabetes, colunaEsquerda, linhas[1], larguraCampo)
  desenharCampo(doc, 'Total de registros de glicose:', resumo.totalRegistros, colunaDireita, linhas[1], larguraCampo)
  desenharCampo(doc, 'Tratamento registrado:', descreverTratamento(relatorio), colunaEsquerda, linhas[2], larguraCampo)
  desenharCampo(doc, 'Média de registros por dia:', formatarNumero(mediaDiariaRegistros), colunaDireita, linhas[2], larguraCampo)
  desenharCampo(doc, 'Período analisado:', `${inicio} a ${fim}`, colunaEsquerda, linhas[3], larguraCampo)
  desenharCampo(doc, 'Aplicações de insulina registradas:', aplicacoes, colunaDireita, linhas[3], larguraCampo)
  desenharCampo(doc, 'Tipo de relatório:', 'Relatório do período', colunaEsquerda, linhas[4], larguraCampo)
  desenharCampo(doc, 'Base das informações:', `Mesmo conjunto de ${resumo.totalRegistros} registros`, colunaDireita, linhas[4], larguraCampo)
  desenharCampo(doc, 'Gerado em:', formatarData(relatorio.geradoEm), colunaEsquerda, linhas[5], larguraCampo)
  desenharCampo(doc, 'Aplicativo:', 'Insulog', colunaDireita, linhas[5], larguraCampo)

  doc.roundedRect(margem, 596, larguraConteudo, 112, 13).fillAndStroke('#e9f8f0', '#c8ead8')
  doc.circle(margem + 28, 631, 10).lineWidth(2).strokeColor('#21c979').stroke()
  doc.font('Helvetica-Bold').fontSize(11).fillColor('#27353d').text(
    'Documento gerado automaticamente pelo Insulog',
    margem + 52,
    615,
    { width: larguraConteudo - 72 }
  )
  doc.font('Helvetica').fontSize(8.5).fillColor('#547589').text(
    `As informações deste relatório foram consolidadas a partir dos mesmos ${resumo.totalRegistros} registros do período de ${inicio} a ${fim}. Use este documento como apoio para acompanhar tendências e compartilhe-o com o profissional de saúde responsável pela sua avaliação.`,
    margem + 52,
    636,
    { width: larguraConteudo - 75, lineGap: 2 }
  )

  doc.font('Helvetica-Bold').fontSize(9).fillColor('#129052').text(
    'Insulog - Gestão inteligente de glicose e insulina',
    margem,
    739,
    { width: larguraConteudo, align: 'center' }
  )
  doc.strokeColor('#dbe5e9').lineWidth(0.7).moveTo(margem, 764).lineTo(larguraPagina - margem, 764).stroke()
  doc.font('Helvetica').fontSize(6.5).fillColor('#66879a').text(
    'Insulog - Relatório gerado automaticamente | Dados informados pelo paciente | Página 1',
    margem,
    773,
    { width: larguraConteudo, lineBreak: false }
  )
  doc.text('Este documento não substitui consulta, diagnóstico ou prescrição médica.', margem, 784, {
    width: larguraConteudo,
    lineBreak: false
  })
  doc.restore()
}

function desenharIconeIndicador(doc, x, y, cor, tipo) {
  doc.circle(x + 14, y + 18, 12).fill('#ffffff')
  doc.save().strokeColor(cor).fillColor(cor).lineWidth(1.5)
  if (tipo === 'gota') {
    doc.moveTo(x + 14, y + 9).bezierCurveTo(x + 7, y + 18, x + 9, y + 25, x + 14, y + 26)
      .bezierCurveTo(x + 19, y + 25, x + 21, y + 18, x + 14, y + 9).stroke()
  } else if (tipo === 'calendario') {
    doc.roundedRect(x + 7, y + 12, 14, 13, 2).stroke()
    doc.moveTo(x + 7, y + 16).lineTo(x + 21, y + 16).stroke()
    doc.moveTo(x + 11, y + 9).lineTo(x + 11, y + 13).moveTo(x + 18, y + 9).lineTo(x + 18, y + 13).stroke()
  } else if (tipo === 'insulina') {
    doc.moveTo(x + 9, y + 24).lineTo(x + 20, y + 13).stroke()
    doc.moveTo(x + 17, y + 10).lineTo(x + 23, y + 16).stroke()
    doc.moveTo(x + 19, y + 9).lineTo(x + 24, y + 14).stroke()
    doc.moveTo(x + 8, y + 25).lineTo(x + 6, y + 27).stroke()
  } else {
    doc.moveTo(x + 7, y + 24).lineTo(x + 7, y + 11).stroke()
    doc.moveTo(x + 7, y + 24).lineTo(x + 22, y + 24).stroke()
    doc.moveTo(x + 9, y + 20).lineTo(x + 13, y + 17).lineTo(x + 17, y + 18).lineTo(x + 21, y + 13).stroke()
  }
  doc.restore()
}

function desenharCardIndicador(doc, card, x, y, largura, altura) {
  doc.roundedRect(x, y, largura, altura, 10).fillAndStroke('#e9f8f0', '#c8ead8')
  desenharIconeIndicador(doc, x + 5, y + 2, card.cor, card.icone)
  doc.font('Helvetica').fontSize(7.5).fillColor('#66879a').text(card.rotulo, x + 39, y + 10, {
    width: largura - 47,
    height: 25,
    ellipsis: true
  })
  doc.font('Helvetica-Bold').fontSize(14).fillColor(card.cor).text(card.valor, x + 13, y + 36, {
    width: largura - 26,
    lineBreak: false
  })
}

// function classificarPeriodo(resumo) {
//   if (resumo.percentualAlvo >= 70 && resumo.percentualAbaixoAlvo < 4) return { texto: 'Adequado', cor: '#159257', fundo: '#dff5e9' }
//   if (resumo.percentualAlvo >= 50) return { texto: 'Parcialmente adequado', cor: '#8c6500', fundo: '#ffd34d' }
//   return { texto: 'Requer atenção', cor: '#a13d3d', fundo: '#ffdede' }
// }

function desenharRodape(doc, pagina) {
  const margem = 45
  const larguraConteudo = doc.page.width - (margem * 2)
  doc.strokeColor('#dbe5e9').lineWidth(0.7).moveTo(margem, 764).lineTo(doc.page.width - margem, 764).stroke()
  doc.font('Helvetica').fontSize(6.5).fillColor('#66879a').text(
    `Insulog - Relatório gerado automaticamente | Dados informados pelo paciente | Página ${pagina}`,
    margem, 773, { width: larguraConteudo, lineBreak: false }
  )
  doc.text('Este documento não substitui consulta, diagnóstico ou prescrição médica.', margem, 784, {
    width: larguraConteudo, lineBreak: false
  })
}

function desenharCabecalhoInterno(doc) {
  const margem = 45
  const larguraLogo = 85

  doc.save()
  doc.rect(0, 0, doc.page.width, 8).fill('#21c979')
  desenharLogo(doc, (doc.page.width - larguraLogo) / 2, 22, larguraLogo)
  doc.strokeColor('#dbe5e9').lineWidth(0.7)
    .moveTo(margem, 58)
    .lineTo(doc.page.width - margem, 58)
    .stroke()
  doc.restore()
}

function desenharResumoClinico(doc, relatorio) {
  const margem = 45
  const larguraConteudo = doc.page.width - (margem * 2)
  const resumo = relatorio.resumo
  const verde = '#159257'
  const vermelho = '#ef4e55'
  const laranja = '#ff8a1f'
  const amarelo = '#f4bb25'

  desenharCabecalhoInterno(doc)

  doc.font('Helvetica-Bold').fontSize(20).fillColor('#27353d').text('Resumo clínico do período', margem, 74)
  doc.roundedRect(margem, 102, 62, 4, 2).fill('#21c979')
  doc.font('Helvetica').fontSize(8.5).fillColor('#547589').text(
    `Esta seção apresenta uma visão consolidada dos registros de glicose e insulina informados pelo paciente durante o período selecionado. Todos os indicadores foram calculados a partir dos mesmos ${resumo.totalRegistros} registros.`,
    margem, 120, { width: larguraConteudo, lineGap: 2 }
  )

  const cards = [
    { rotulo: 'Glicose média', valor: `${formatarNumero(resumo.media)} mg/dL`, cor: verde, icone: 'gota' },
    { rotulo: 'Menor glicose registrada', valor: `${resumo.minimo} mg/dL`, cor: vermelho, icone: 'gota' },
    { rotulo: 'Maior glicose registrada', valor: `${resumo.maximo} mg/dL`, cor: laranja, icone: 'gota' },
    { rotulo: 'Percentual de registros na faixa alvo', valor: `${formatarNumero(resumo.percentualAlvo)}%`, cor: verde, icone: 'grafico' },
    { rotulo: 'Registros abaixo de 70 mg/dL', valor: `${formatarNumero(resumo.percentualAbaixoAlvo)}%`, cor: vermelho, icone: 'grafico' },
    { rotulo: 'Registros acima de 180 mg/dL', valor: `${formatarNumero(resumo.percentualAcimaAlvo)}%`, cor: amarelo, icone: 'grafico' },
    { rotulo: 'Dias com hipoglicemia', valor: `${resumo.diasHipoglicemia} dia(s)`, cor: vermelho, icone: 'calendario' },
    { rotulo: 'Dias com hiperglicemia importante', valor: `${resumo.diasHiperglicemiaImportante} dia(s)`, cor: laranja, icone: 'calendario' },
    { rotulo: 'Média diária de insulina', valor: `${formatarNumero(resumo.mediaDiariaInsulina)} UI/dia`, cor: verde, icone: 'insulina' },
    { rotulo: 'Total de insulina no período', valor: `${formatarNumero(resumo.totalInsulina)} UI`, cor: verde, icone: 'insulina' },
    { rotulo: 'CV% - variabilidade glicêmica', valor: `${formatarNumero(resumo.cv)}%`, cor: amarelo, icone: 'grafico' },
    { rotulo: 'GMI estimado', valor: `${formatarNumero(resumo.gmi)}%`, cor: verde, icone: 'grafico' }
  ]
  const gap = 10
  const cardWidth = (larguraConteudo - (gap * 2)) / 3
  const cardHeight = 61
  const cardStartY = 166
  cards.forEach((card, index) => {
    const column = index % 3
    const row = Math.floor(index / 3)
    desenharCardIndicador(doc, card, margem + column * (cardWidth + gap), cardStartY + row * 70, cardWidth, cardHeight)
  })

  // const classificacao = classificarPeriodo(resumo)
  // doc.roundedRect(margem, 462, larguraConteudo, 47, 10).fillAndStroke('#fff8e5', '#f3d67a')
  // doc.font('Helvetica').fontSize(8.5).fillColor('#547589').text('Classificação geral do período', margem + 17, 480)
  // const pillWidth = doc.widthOfString(classificacao.texto) + 24
  // doc.roundedRect(margem + 205, 473, pillWidth, 22, 11).fill(classificacao.fundo)
  // doc.font('Helvetica-Bold').fontSize(8).fillColor(classificacao.cor).text(classificacao.texto, margem + 217, 480, {
  //   lineBreak: false
  // })

  doc.font('Helvetica-Bold').fontSize(14).fillColor('#27353d').text('Principais pontos observados', margem, 531)
  const observacoes = [
    `${formatarNumero(resumo.percentualAlvo)}% dos registros permaneceram na faixa alvo de 70 a 180 mg/dL.`,
    `Foram identificados ${resumo.diasHipoglicemia} dia(s) com glicose abaixo de 70 mg/dL.`,
    `Foram identificados ${resumo.diasHiperglicemiaImportante} dia(s) com hiperglicemia importante, acima de 250 mg/dL.`,
    `A média diária registrada foi de ${formatarNumero(resumo.mediaDiariaInsulina)} UI de insulina.`
  ]
  let observationY = 557
  for (const texto of observacoes) {
    doc.circle(margem + 7, observationY + 4, 2).fill('#21c979')
    doc.font('Helvetica').fontSize(8.2).fillColor('#27353d').text(texto, margem + 18, observationY, {
      width: larguraConteudo - 18,
      lineGap: 1
    })
    observationY += 21
  }

  doc.roundedRect(margem, 660, larguraConteudo, 82, 10).fillAndStroke('#e9f8f0', '#c8ead8')
  doc.rect(margem, 660, 5, 82).fill('#21c979')
  desenharIconeIndicador(doc, margem + 8, 670, verde, 'grafico')
  doc.font('Helvetica-Bold').fontSize(11).fillColor('#27353d').text('Nota técnica', margem + 42, 674)
  doc.font('Helvetica').fontSize(8.2).fillColor('#547589').text(
    'Como os dados são inseridos manualmente, os percentuais apresentados representam a proporção de registros em cada faixa glicêmica, e não o tempo contínuo em faixa.',
    margem + 42, 698, { width: larguraConteudo - 62, lineGap: 2 }
  )
  desenharRodape(doc, 2)
}

function desenharFaixasGlicemicas(doc, relatorio) {
  const margem = 45
  const largura = doc.page.width - margem * 2
  const inicio = formatarDataCurta(relatorio.periodo.dataInicio)
  const fim = formatarDataCurta(relatorio.periodo.dataFim)
  const estilos = [
    { criterio: '<54 mg/dL', legenda: 'Muito baixo <54', cor: '#a92c32', classificacao: 'Grave' },
    { criterio: '54-69 mg/dL', legenda: 'Baixo 54-69', cor: '#ef4549', classificacao: 'Atenção' },
    { criterio: '70-180 mg/dL', legenda: 'Faixa alvo 70-180', cor: '#21c979', classificacao: 'Adequado' },
    { criterio: '181-250 mg/dL', legenda: 'Alto 181-250', cor: '#f5c640', classificacao: 'Alterado' },
    { criterio: '>250 mg/dL', legenda: 'Muito alto >250', cor: '#ff8a1f', classificacao: 'Grave' }
  ]
  const faixas = relatorio.resumo.faixas.map((faixa, indice) => ({ ...faixa, ...estilos[indice] }))
  const percentual = valor => `${formatarNumero(valor, Number.isInteger(valor) ? 0 : 1)}%`

  doc.rect(0, 0, doc.page.width, 8).fill('#21c979')
  desenharLogo(doc, margem, 22, 105)
  doc.font('Helvetica-Bold').fontSize(9).fillColor('#547589').text('Registros por faixa glicêmica', margem, 27, {
    width: largura, align: 'right'
  })
  doc.strokeColor('#dbe5e9').lineWidth(0.7).moveTo(margem, 58).lineTo(margem + largura, 58).stroke()
  doc.font('Helvetica-Bold').fontSize(20).fillColor('#27353d').text('Registros por faixa glicêmica', margem, 70)
  doc.roundedRect(margem, 93, 58, 4, 2).fill('#21c979')
  doc.font('Helvetica').fontSize(9).fillColor('#66879a').text(
    `Os registros de glicose foram classificados por faixa glicêmica para facilitar a visualização de episódios de hipoglicemia, valores dentro da faixa alvo e períodos de hiperglicemia. Período calculado: ${inicio} a ${fim}.`,
    margem, 110, { width: largura, lineGap: 2 }
  )

  doc.roundedRect(margem, 165, largura, 130, 12).lineWidth(0.8).strokeColor('#d5e1e5').stroke()
  const graficoX = margem + 24
  const graficoLargura = largura - 48
  doc.font('Helvetica-Bold').fontSize(10).fillColor('#27353d').text('Distribuição dos registros', graficoX, 190)
  let segmentoX = graficoX
  for (const faixa of faixas) {
    // A largura usa a contagem exata, sem acumular erros dos percentuais arredondados.
    const segmentoLargura = graficoLargura * faixa.quantidade / relatorio.resumo.totalRegistros
    if (segmentoLargura === 0) continue
    doc.rect(segmentoX, 206, segmentoLargura, 38).fill(faixa.cor)
    const rotulo = percentual(faixa.percentual)
    doc.font('Helvetica-Bold').fontSize(8)
    if (segmentoLargura >= doc.widthOfString(rotulo) + 6) {
      doc.fillColor(faixa.classificacao === 'Alterado' ? '#27353d' : '#ffffff').text(rotulo, segmentoX, 220, {
        width: segmentoLargura, align: 'center', lineBreak: false
      })
    }
    segmentoX += segmentoLargura
  }
  for (let marca = 0; marca <= 100; marca += 20) {
    const x = graficoX + graficoLargura * marca / 100
    doc.strokeColor('#b9cbd3').lineWidth(0.5).moveTo(x, 245).lineTo(x, 250).stroke()
    doc.font('Helvetica').fontSize(6.5).fillColor('#66879a').text(String(marca), x - 10, 253, {
      width: 20, align: 'center', lineBreak: false
    })
  }
  doc.font('Helvetica').fontSize(7.5).fillColor('#66879a').text(
    `Percentual de registros manuais por faixa glicêmica - ${inicio} a ${fim}`,
    margem, 264, { width: largura, align: 'center' }
  )
  let legendaX = margem
  for (const faixa of faixas) {
    doc.roundedRect(legendaX, 305, 10, 10, 2).fill(faixa.cor)
    doc.font('Helvetica').fontSize(7.3).fillColor('#66879a').text(faixa.legenda, legendaX + 14, 308, { lineBreak: false })
    legendaX += 14 + doc.widthOfString(faixa.legenda) + 14
  }

  const colunas = [0, 0.245, 0.441, 0.598, 0.755, 1].map(fracao => margem + largura * fracao)
  const titulos = ['Faixa glicêmica', 'Critério', 'Quantidade', 'Percentual', 'Classificação']
  const tabelaY = 335
  const alturaLinha = 15.5
  doc.rect(margem, tabelaY, largura, alturaLinha).fill('#21c979')
  const linhas = [titulos, ...faixas.map(faixa => [faixa.descricao, faixa.criterio, String(faixa.quantidade), percentual(faixa.percentual), faixa.classificacao])]
  linhas.forEach((linha, indice) => {
    const y = tabelaY + indice * alturaLinha
    if (indice > 0) doc.rect(margem, y, largura, alturaLinha).fill(indice % 2 ? '#f7fafb' : '#ffffff')
    linha.forEach((texto, coluna) => {
      doc.rect(colunas[coluna], y, colunas[coluna + 1] - colunas[coluna], alturaLinha)
        .lineWidth(0.4).strokeColor(indice === 0 ? '#ffffff' : '#cbdbe2').stroke()
      doc.font(indice === 0 ? 'Helvetica-Bold' : 'Helvetica').fontSize(7.7)
        .fillColor(indice === 0 ? '#ffffff' : '#27353d').text(texto, colunas[coluna] + 5, y + 4, {
          width: colunas[coluna + 1] - colunas[coluna] - 10,
          align: coluna === 2 || coluna === 3 ? 'center' : 'left', lineBreak: false
        })
    })
  })

  const maiorQuantidade = Math.max(...faixas.map(faixa => faixa.quantidade))
  const predominantes = faixas.filter(faixa => faixa.quantidade === maiorQuantidade)
  const interpretacao = predominantes.length === 1
    ? `A faixa com maior quantidade de registros foi ${predominantes[0].descricao.toLowerCase()}, com ${percentual(predominantes[0].percentual)} dos registros.`
    : `As faixas com maior quantidade de registros foram: ${predominantes.map(faixa => faixa.descricao.toLowerCase()).join(', ')}, com ${percentual(predominantes[0].percentual)} cada.`
  const extremos = []
  const abaixo = faixas[0].quantidade + faixas[1].quantidade
  if (abaixo > 0) extremos.push(`${abaixo} registro(s) abaixo de 70 mg/dL`)
  if (faixas[4].quantidade > 0) extremos.push(`${faixas[4].quantidade} registro(s) acima de 250 mg/dL`)
  doc.font('Helvetica-Bold').fontSize(13).fillColor('#27353d').text('Interpretação automática', margem, 439)
  doc.font('Helvetica').fontSize(9).fillColor('#66879a').text(
    `${interpretacao}${extremos.length ? ` Também foram identificados ${extremos.join(' e ')}.` : ''} Os percentuais representam a proporção dos registros manuais, e não o tempo contínuo em faixa.`,
    margem, 459, { width: largura, lineGap: 2 }
  )

  doc.roundedRect(margem, 704, largura, 60, 9).lineWidth(0.7).fillAndStroke('#e9f8f0', '#c8ead8')
  doc.roundedRect(margem, 704, 5, 60, 2).fill('#21c979')
  desenharIconeIndicador(doc, margem + 6, 707, '#21c979', 'gota')
  doc.font('Helvetica-Bold').fontSize(10).fillColor('#27353d').text('Aviso sobre dados manuais', margem + 40, 716)
  doc.font('Helvetica').fontSize(8).fillColor('#66879a').text(
    'Este relatório foi gerado com base nos registros informados pelo paciente no Insulog. As informações têm finalidade de acompanhamento e apoio à consulta médica, não substituindo avaliação, diagnóstico ou prescrição profissional.',
    margem + 40, 735, { width: largura - 53, lineGap: 1 }
  )
  // Reserva espaço abaixo do aviso para manter o rodapé separado do conteúdo.
  doc.save().translate(0, 29)
  desenharRodape(doc, 3)
  doc.restore()
}

function desenharPadraoGlicose(doc, relatorio) {
  const margem = 45
  const largura = doc.page.width - margem * 2
  const padrao = calcularPadraoGlicose(relatorio)
  const inicio = formatarDataCurta(padrao.inicio)
  const fim = formatarDataCurta(padrao.fim)
  const verde = '#159257'
  const corPonto = glicose => glicose < 70 ? '#ef4e55' : glicose <= 180 ? '#21c979' : glicose <= 250 ? '#f5c640' : '#ff8a1f'

  doc.rect(0, 0, doc.page.width, 6).fill('#21c979')
  desenharLogo(doc, margem, 20, 105)
  doc.font('Helvetica-Bold').fontSize(9).fillColor('#547589').text('Padrão de glicose', margem, 24, { width: largura, align: 'right' })
  doc.strokeColor('#dbe5e9').lineWidth(0.7).moveTo(margem, 55).lineTo(margem + largura, 55).stroke()
  doc.font('Helvetica-Bold').fontSize(20).fillColor('#27353d').text('Padrão de glicose - últimos 14 dias', margem, 66)
  doc.roundedRect(margem, 90, 58, 4, 2).fill('#21c979')
  doc.font('Helvetica').fontSize(9).fillColor('#66879a').text(
    'Esta página apresenta a comparação por horário: cada ponto representa um registro manual, com data e horário. O objetivo é mostrar onde os registros se concentram ao longo do dia e quais datas tiveram os maiores desvios.',
    margem, 108, { width: largura, lineGap: 2 }
  )

  doc.roundedRect(margem, 160, largura, 300, 12).lineWidth(0.8).strokeColor('#d5e1e5').stroke()
  const x = margem + 49
  const y = 214
  const w = largura - 84
  const h = 156
  const maiorGlicose = padrao.pontos.reduce((maior, ponto) => Math.max(maior, ponto.glicose), 300)
  const maximo = Math.ceil((maiorGlicose + 15) / 50) * 50
  const px = hora => x + hora / 24 * w
  const py = glicose => y + h - glicose / maximo * h
  doc.font('Helvetica-Bold').fontSize(11).fillColor('#27353d').text('Padrão de glicose - últimos 14 dias', x, 200)
  for (const [min, max, cor] of [[0, 70, '#fce8eb'], [70, 180, '#e9f8f0'], [180, 250, '#fff5cf'], [250, maximo, '#fee9dc']]) {
    doc.rect(x, py(max), w, py(min) - py(max)).fill(cor)
  }
  const passo = maximo <= 400 ? 50 : Math.ceil(maximo / 6 / 50) * 50
  for (let valor = 0; valor <= maximo; valor += passo) {
    doc.strokeColor('#dbe5e9').lineWidth(0.4).moveTo(x, py(valor)).lineTo(x + w, py(valor)).stroke()
    doc.font('Helvetica').fontSize(6.5).fillColor('#66879a').text(String(valor), x - 29, py(valor) - 3, { width: 24, align: 'right', lineBreak: false })
  }
  for (let hora = 0; hora <= 24; hora += 3) {
    doc.save().dash(2, { space: 2 }).strokeColor('#dbe5e9').lineWidth(0.5).moveTo(px(hora), y).lineTo(px(hora), y + h).stroke().restore()
    doc.font('Helvetica').fontSize(6.5).fillColor('#66879a').text(`${String(hora).padStart(2, '0')}h`, px(hora) - 12, y + h + 7, { width: 24, align: 'center', lineBreak: false })
  }
  for (const [valor, rotulo, cor] of [[70, 'Hipoglicemia', '#ef4e55'], [180, 'Faixa alvo 70-180 mg/dL', verde], [250, 'Hiperglicemia importante', '#ff8a1f']]) {
    doc.strokeColor(cor).lineWidth(0.6).moveTo(x, py(valor)).lineTo(x + w, py(valor)).stroke()
    doc.font('Helvetica-Bold').fontSize(6.5).fillColor(cor).text(rotulo, x + 17, py(valor) + (valor === 70 ? 3 : -9), { lineBreak: false })
    doc.text(String(valor), x + w + 4, py(valor) - 3, { lineBreak: false })
  }
  doc.save().translate(margem + 20, y + h / 2 + 35).rotate(-90)
  doc.font('Helvetica').fontSize(7.5).fillColor('#66879a').text('Glicose (mg/dL)', 0, 0, { lineBreak: false })
  doc.restore()

  if (padrao.medias.length > 1) {
    doc.save().strokeColor(verde).lineWidth(2)
    padrao.medias.forEach((ponto, indice) => {
      if (indice === 0) doc.moveTo(px(ponto.horario), py(ponto.glicose))
      else doc.lineTo(px(ponto.horario), py(ponto.glicose))
    })
    doc.stroke().restore()
  }
  for (const ponto of padrao.medias) doc.circle(px(ponto.horario), py(ponto.glicose), 2.6).fill(verde)
  // Desenha os registros por último para preservar sua cor quando coincidem com a média.
  for (const ponto of padrao.pontos) doc.circle(px(ponto.horario), py(ponto.glicose), 1.8).fill(corPonto(ponto.glicose))

  // Anota até quatro extremos, evitando sobreposição dos rótulos de data.
  const rotulos = []
  const extremos = padrao.pontos.filter(ponto => ponto.glicose < 70 || ponto.glicose > 250)
    .sort((a, b) => Math.max(70 - b.glicose, b.glicose - 250) - Math.max(70 - a.glicose, a.glicose - 250))
  for (const ponto of extremos) {
    if (rotulos.length === 4) break
    const rx = Math.min(x + w - 28, px(ponto.horario) + 4)
    const ry = Math.max(y + 2, py(ponto.glicose) - 10)
    if (rotulos.some(rotulo => Math.abs(rotulo.x - rx) < 30 && Math.abs(rotulo.y - ry) < 10)) continue
    doc.font('Helvetica').fontSize(6).fillColor('#27353d').text(formatarDataCurta(ponto.data).slice(0, 5), rx, ry, { lineBreak: false })
    rotulos.push({ x: rx, y: ry })
  }
  if (!padrao.pontos.length) {
    doc.roundedRect(x + 35, y + 62, w - 70, 30, 5).fill('#ffffff')
    doc.font('Helvetica-Bold').fontSize(9).fillColor('#547589').text('Sem registros nesta janela de 14 dias.', x + 35, y + 72, { width: w - 70, align: 'center' })
  }
  doc.font('Helvetica').fontSize(7.5).fillColor('#66879a').text(`Horário do registro - pontos de ${inicio} a ${fim}`, margem, 389, { width: largura, align: 'center' })
  let legendaX = margem + 125
  for (const [rotulo, cor] of [['Baixo', '#ef4e55'], ['Alvo', '#21c979'], ['Alto', '#f5c640'], ['Muito alto', '#ff8a1f'], ['Média por hora', verde]]) {
    if (cor === verde) doc.strokeColor(cor).lineWidth(2).moveTo(legendaX - 6, 416).lineTo(legendaX + 6, 416).stroke()
    doc.circle(legendaX, 416, cor === verde ? 2.5 : 1.8).fill(cor)
    doc.font('Helvetica').fontSize(6.5).fillColor('#27353d').text(rotulo, legendaX + 10, 413, { lineBreak: false })
    legendaX += doc.widthOfString(rotulo) + 28
  }

  const cardLargura = (largura - 16) / 3
  const cards = [
    ['Janela exibida', `${inicio} a ${fim}`],
    ['Total no gráfico', `${padrao.pontos.length} registros manuais`],
    ['Leitura correta', 'ponto = data + horário + glicose']
  ]
  cards.forEach(([rotulo, valor], indice) => {
    const cx = margem + indice * (cardLargura + 8)
    doc.roundedRect(cx, 478, cardLargura, 56, 10).lineWidth(0.6).fillAndStroke('#e9f8f0', '#a5e5c6')
    doc.font('Helvetica').fontSize(7.5).fillColor('#66879a').text(rotulo, cx + 12, 491, { width: cardLargura - 24 })
    doc.font('Helvetica-Bold').fontSize(8.5).fillColor('#27353d').text(valor, cx + 12, 507, { width: cardLargura - 24 })
  })
  doc.font('Helvetica-Bold').fontSize(13).fillColor('#27353d').text('Interpretação do padrão', margem, 548)
  const baixos = padrao.pontos.filter(ponto => ponto.glicose < 70).length
  const altos = padrao.pontos.filter(ponto => ponto.glicose > 180).length
  const observacoes = [
    padrao.pontos.length ? `Na janela exibida, ${baixos} registro(s) ficaram abaixo de 70 mg/dL e ${altos} acima de 180 mg/dL.` : 'Não há registros na janela exibida; não é possível descrever um padrão neste intervalo.',
    'A linha une médias dos registros agrupados por hora do dia; não representa medições entre os pontos.',
    'As datas anotadas identificam até quatro registros extremos. Todos os pontos preservam o horário informado.',
    'Por se basear em registros manuais, este gráfico é uma adaptação visual e não um AGP de sensor contínuo.'
  ]
  let textoY = 570
  for (const texto of observacoes) {
    doc.circle(margem + 6, textoY + 4, 2).fill('#21c979')
    doc.font('Helvetica').fontSize(8.3).fillColor('#27353d').text(texto, margem + 16, textoY, { width: largura - 16, lineGap: 2 })
    textoY = doc.y + 5
  }
  doc.save().translate(0, 29)
  desenharRodape(doc, 4)
  doc.restore()
}

function desenharComparativoDatas(doc, relatorio) {
  const margem = 45
  const largura = doc.page.width - margem * 2
  const comparativo = calcularComparativoDatas(relatorio)
  const intervalo = `${formatarDataCurta(relatorio.periodo.dataInicio)} a ${formatarDataCurta(relatorio.periodo.dataFim)}`

  function cabecalho(continuacao) {
    doc.rect(0, 0, doc.page.width, 8).fill('#21c979')
    desenharLogo(doc, margem, 22, 105)
    doc.font('Helvetica-Bold').fontSize(9).fillColor('#547589').text('Comparativo por data', margem, 27, { width: largura, align: 'right' })
    doc.strokeColor('#dbe5e9').lineWidth(0.7).moveTo(margem, 58).lineTo(margem + largura, 58).stroke()
    doc.font('Helvetica-Bold').fontSize(20).fillColor('#27353d').text(continuacao ? 'Comparativo por data - continuação' : 'Comparativo por data do mês', margem, 70)
    doc.roundedRect(margem, 94, 58, 4, 2).fill('#21c979')
    doc.font('Helvetica').fontSize(9).fillColor('#66879a').text(
      'A matriz organiza os registros por data e período do dia, permitindo identificar em que dia ocorreu cada valor. O resumo diário considera todos os registros do período selecionado.',
      margem, 110, { width: largura, lineGap: 2 }
    )
  }

  function tabela(dias, x, y, w) {
    const colunas = [0, 0.28, 0.5, 0.81, 1].map(fracao => x + w * fracao)
    const linhas = [['Data', 'Média', 'Mín-Máx', 'Fora'], ...dias.map(dia => [
      formatarDataCurta(dia.data).slice(0, 6) + dia.data.slice(2, 4),
      dia.media === null ? '-' : formatarNumero(dia.media, 0),
      dia.media === null ? '-' : `${formatarNumero(dia.minimo, 0)}-${formatarNumero(dia.maximo, 0)}`,
      dia.quantidade ? String(dia.fora) : '-'
    ])]
    linhas.forEach((linha, indice) => {
      const ly = y + indice * 13.5
      doc.rect(x, ly, w, 13.5).fill(indice === 0 ? '#21c979' : indice % 2 ? '#f7fafb' : '#ffffff')
      linha.forEach((texto, coluna) => {
        doc.rect(colunas[coluna], ly, colunas[coluna + 1] - colunas[coluna], 13.5).lineWidth(0.4).strokeColor(indice === 0 ? '#ffffff' : '#cbdbe2').stroke()
        doc.font(indice === 0 ? 'Helvetica-Bold' : 'Helvetica').fontSize(6.5).fillColor(indice === 0 ? '#ffffff' : '#27353d')
          .text(texto, colunas[coluna] + 2, ly + 4, { width: colunas[coluna + 1] - colunas[coluna] - 4, align: 'center', lineBreak: false })
      })
    })
  }

  for (let inicio = 0; inicio < comparativo.dias.length; inicio += 32) {
    if (inicio > 0) doc.addPage()
    cabecalho(inicio > 0)
    if (inicio === 0) {
      doc.roundedRect(margem, 150, largura, 251, 12).lineWidth(0.8).strokeColor('#d5e1e5').stroke()
      doc.font('Helvetica-Bold').fontSize(10).fillColor('#27353d').text(
        `Comparativo por data e período - ${formatarDataCurta(comparativo.inicio)} a ${formatarDataCurta(comparativo.fim)}`,
        margem + 10, 173, { width: largura - 20, align: 'center' }
      )
      const mx = margem + 60
      const mw = largura - 80
      const linhaAltura = 12.5
      comparativo.matriz.forEach((dia, indice) => {
        const y = 190 + indice * linhaAltura
        doc.font('Helvetica').fontSize(6.5).fillColor('#27353d').text(formatarDataCurta(dia.data), margem + 5, y + 3.5, { width: 50, align: 'right', lineBreak: false })
        dia.celulas.forEach((celula, coluna) => {
          const valor = celula.media
          const fundo = valor === null ? '#f2f5f7' : valor < 70 ? '#ef4549' : valor <= 180 ? '#e9f8f0' : valor <= 250 ? '#f5c640' : '#ff8a1f'
          doc.rect(mx + coluna * mw / 4, y, mw / 4, linhaAltura).fill(fundo)
          doc.font('Helvetica').fontSize(6.5).fillColor(valor !== null && (valor < 70 || valor > 250) ? '#ffffff' : '#27353d')
            .text(valor === null ? '-' : `${formatarNumero(valor, 0)}${celula.quantidade > 1 ? '*' : ''}`, mx + coluna * mw / 4, y + 3.5, { width: mw / 4, align: 'center', lineBreak: false })
        })
      })
      const rotulosY = 190 + comparativo.matriz.length * linhaAltura + 5
      for (const [indice, rotulo] of ['Madrugada · 00–06h', 'Manhã · 06–12h', 'Tarde · 12–18h', 'Noite · 18–24h'].entries()) {
        doc.font('Helvetica').fontSize(6.8).fillColor('#27353d').text(rotulo, mx + indice * mw / 4, rotulosY, { width: mw / 4, align: 'center', lineBreak: false })
      }
      doc.font('Helvetica').fontSize(6.8).fillColor('#66879a').text('Valores em mg/dL · * média de vários registros · - sem registro', margem + 10, 385, { width: largura - 20, align: 'center' })
    }
    const tituloY = inicio === 0 ? 408 : 160
    doc.font('Helvetica-Bold').fontSize(12).fillColor('#27353d').text(`Resumo diário do período - ${intervalo}`, margem, tituloY, { width: largura })
    const dias = comparativo.dias.slice(inicio, inicio + 32)
    const divisao = Math.ceil(dias.length / 2)
    const tabelaLargura = 195
    tabela(dias.slice(0, divisao), margem, tituloY + 24, tabelaLargura)
    if (dias.length > divisao) tabela(dias.slice(divisao), margem + largura - tabelaLargura, tituloY + 24, tabelaLargura)

    doc.roundedRect(margem, 710, largura, 55, 9).lineWidth(0.7).fillAndStroke('#e9f8f0', '#c8ead8')
    doc.roundedRect(margem, 710, 5, 55, 2).fill('#21c979')
    desenharIconeIndicador(doc, margem + 6, 713, '#21c979', 'calendario')
    doc.font('Helvetica-Bold').fontSize(10).fillColor('#27353d').text('Leitura da tabela', margem + 40, 721)
    doc.font('Helvetica').fontSize(8).fillColor('#66879a').text(
      'A coluna "Fora" conta os registros abaixo de 70 ou acima de 180 mg/dL. Cores da matriz: vermelho <70; verde 70–180; amarelo >180–250; laranja >250. As médias podem ocultar valores extremos; consulte também Mín-Máx.',
      margem + 40, 739, { width: largura - 53, lineGap: 1 }
    )
    doc.save().translate(0, 29)
    desenharRodape(doc, 5 + inicio / 32)
    doc.restore()
  }
}

function desenharEvolucaoGlicose(doc, relatorio) {
  const margem = 45
  const largura = doc.page.width - 2 * margem
  const verde = '#159257'
  const { dias, semanas } = calcularEvolucaoGlicose(relatorio)
  // Mantém a leitura do gráfico e da tabela em períodos maiores que um mês.
  for (let inicio = 0; inicio < dias.length; inicio += 35) {
    if (inicio > 0) doc.addPage()
    const grupo = dias.slice(inicio, inicio + 35)
    const comDados = grupo.filter(dia => dia.quantidade)
    const intervalo = `${formatarDataCurta(grupo[0].data)} a ${formatarDataCurta(grupo.at(-1).data)}`
    doc.rect(0, 0, doc.page.width, 8).fill('#21c979')
    desenharLogo(doc, margem, 22, 105)
    doc.font('Helvetica-Bold').fontSize(9).fillColor('#547589').text('Evolução diária e semanal', margem, 28, { width: largura, align: 'right' })
    doc.strokeColor('#dbe5e9').lineWidth(0.7).moveTo(margem, 59).lineTo(margem + largura, 59).stroke()
    doc.font('Helvetica-Bold').fontSize(20).fillColor('#27353d').text('Evolução diária e semanal', margem, 71)
    doc.roundedRect(margem, 95, 58, 4, 2).fill('#21c979')
    doc.font('Helvetica').fontSize(9).fillColor('#66879a').text(
      'A evolução diária usa a média dos registros de cada data. Marcadores vermelhos indicam dias com glicose abaixo de 70 mg/dL; laranja, dias com valores acima de 250 mg/dL.',
      margem, 111, { width: largura, lineGap: 2 }
    )
    doc.roundedRect(margem, 151, largura, 239, 12).lineWidth(0.8).strokeColor('#d5e1e5').stroke()
    const x = margem + 54
    const y = 204
    const w = largura - 95
    const h = 133
    const maximo = Math.ceil((Math.max(270, ...comDados.map(dia => dia.media)) + 15) / 50) * 50
    const px = indice => grupo.length === 1 ? x + w / 2 : x + indice / (grupo.length - 1) * w
    const py = valor => y + h - valor / maximo * h
    doc.font('Helvetica-Bold').fontSize(10).fillColor('#27353d').text('Evolução diária - média dos registros de cada data', x, 178)
    for (const [lx, texto, cor] of [[x + 12, 'Dia com hipo', '#ef4549'], [x + 87, 'Dia com >250', '#ff8a1f']]) {
      doc.circle(lx, 198, 2.6).fill(cor)
      doc.font('Helvetica').fontSize(6.8).fillColor('#27353d').text(texto, lx + 10, 195, { lineBreak: false })
    }
    doc.rect(x, py(180), w, py(70) - py(180)).fill('#e9f8f0')
    const passo = Math.ceil(maximo / 6 / 50) * 50
    for (let valor = 0; valor <= maximo; valor += passo) {
      doc.strokeColor('#e5ecef').lineWidth(0.4).moveTo(x, py(valor)).lineTo(x + w, py(valor)).stroke()
      doc.font('Helvetica').fontSize(6.5).fillColor('#66879a').text(String(valor), x - 27, py(valor) - 3, { width: 21, align: 'right', lineBreak: false })
    }
    const marcas = [...new Set([0, ...grupo.map((_, indice) => indice).filter(indice => indice % Math.max(1, Math.ceil(grupo.length / 7)) === 0), grupo.length - 1])]
    for (const indice of marcas) {
      doc.strokeColor('#e5ecef').lineWidth(0.4).moveTo(px(indice), y).lineTo(px(indice), y + h).stroke()
      doc.font('Helvetica').fontSize(6.5).fillColor('#66879a').text(formatarDataCurta(grupo[indice].data).slice(0, 5), px(indice) - 15, y + h + 7, { width: 30, align: 'center', lineBreak: false })
    }
    for (const [valor, cor] of [[70, '#ef4549'], [180, '#159257'], [250, '#ff8a1f']]) {
      doc.save().dash(3, { space: 2 }).strokeColor(cor).lineWidth(0.7).moveTo(x, py(valor)).lineTo(x + w, py(valor)).stroke().restore()
      doc.font('Helvetica').fontSize(6.5).fillColor(cor).text(String(valor), x + w + 6, py(valor) - 3, { lineBreak: false })
    }
    doc.save().translate(margem + 23, y + h / 2 + 37).rotate(-90)
    doc.font('Helvetica').fontSize(7.5).fillColor('#66879a').text('Média diária (mg/dL)', 0, 0, { lineBreak: false })
    doc.restore()
    grupo.forEach((dia, indice) => {
      if (dia.media === null) return
      const anterior = grupo[indice - 1]
      // Não interpola lacunas sem medições.
      if (anterior && anterior.media !== null) doc.strokeColor(verde).lineWidth(1.8).moveTo(px(indice - 1), py(anterior.media)).lineTo(px(indice), py(dia.media)).stroke()
    })
    grupo.forEach((dia, indice) => {
      if (dia.media === null) return
      if (dia.hipo && dia.muitoAlto) doc.circle(px(indice), py(dia.media), 4.5).fill('#ff8a1f')
      doc.circle(px(indice), py(dia.media), dia.hipo || dia.muitoAlto ? 2.7 : 1.8).fill(dia.hipo ? '#ef4549' : dia.muitoAlto ? '#ff8a1f' : verde)
    })
    if (!comDados.length) {
      doc.font('Helvetica-Bold').fontSize(9).fillColor('#547589').text('Sem registros nesta janela.', x, y + 54, { width: w, align: 'center' })
    }
    doc.font('Helvetica').fontSize(7.5).fillColor('#66879a').text(`Data do registro - ${intervalo}`, margem, 360, { width: largura, align: 'center' })
    doc.font('Helvetica').fontSize(6.5).text('Lacunas = dias sem registros · Vermelho com borda laranja = ambos os alertas', margem, 374, { width: largura, align: 'center' })

    doc.font('Helvetica-Bold').fontSize(13).fillColor('#27353d').text('Padrões observados pelo Insulog', margem, 399)
    const observacoes = [
      `${comDados.length} de ${grupo.length} dias possuem registros; ${grupo.length - comDados.length} dia(s) sem medições informadas.`,
      `${comDados.filter(dia => dia.hipo).length} dia(s) com valores abaixo de 70 mg/dL e ${comDados.filter(dia => dia.muitoAlto).length} com valores acima de 250 mg/dL.`,
      comDados.length ? `Médias diárias entre ${formatarNumero(Math.min(...comDados.map(dia => dia.media)))} e ${formatarNumero(Math.max(...comDados.map(dia => dia.media)))} mg/dL; os marcadores refletem os registros individuais.` : 'Sem dados suficientes para calcular médias diárias nesta janela.'
    ]
    let textoY = 420
    for (const texto of observacoes) {
      doc.circle(margem + 6, textoY + 4, 2).fill('#21c979')
      doc.font('Helvetica').fontSize(8).fillColor('#27353d').text(texto, margem + 15, textoY, { width: largura - 15, lineGap: 1 })
      textoY = doc.y + 4
    }
    const tabelaY = Math.max(493, textoY + 23)
    doc.font('Helvetica-Bold').fontSize(13).fillColor('#27353d').text('Mini resumo semanal', margem, tabelaY - 22)
    const linhas = [['Semana', 'Datas', 'Média', 'Registros na faixa', 'Alertas'], ...semanas.slice(inicio / 7, inicio / 7 + 5).map(semana => [
      `Semana ${semana.numero}`,
      `${formatarDataCurta(semana.inicio).slice(0, 5)}–${formatarDataCurta(semana.fim).slice(0, 5)}`,
      semana.media === null ? '-' : `${formatarNumero(semana.media, 0)} mg/dL`,
      semana.percentualAlvo === null ? '-' : `${formatarNumero(semana.percentualAlvo, 0)}%`,
      semana.quantidade ? `${semana.hipo} hipo, ${semana.hiper} hiper` : 'Sem registros'
    ])]
    const colunas = [0, 0.16, 0.35, 0.53, 0.75, 1].map(fracao => margem + largura * fracao)
    linhas.forEach((linha, indice) => {
      const ly = tabelaY + indice * 14.5
      doc.rect(margem, ly, largura, 14.5).fill(indice === 0 ? '#21c979' : indice % 2 ? '#f7fafb' : '#ffffff')
      linha.forEach((texto, coluna) => {
        doc.rect(colunas[coluna], ly, colunas[coluna + 1] - colunas[coluna], 14.5).lineWidth(0.4).strokeColor(indice === 0 ? '#ffffff' : '#cbdbe2').stroke()
        doc.font(indice === 0 ? 'Helvetica-Bold' : 'Helvetica').fontSize(7).fillColor(indice === 0 ? '#ffffff' : '#27353d').text(texto, colunas[coluna] + 4, ly + 4, { width: colunas[coluna + 1] - colunas[coluna] - 8, align: coluna === 0 || coluna === 4 ? 'left' : 'center', lineBreak: false })
      })
    })
    doc.font('Helvetica').fontSize(7).fillColor('#66879a').text('Semanas: blocos de 7 dias desde o início do filtro. Alertas: registros <70 (hipo) e >180 (hiper).', margem, tabelaY + linhas.length * 14.5 + 7, { width: largura })
    doc.roundedRect(margem, 710, largura, 54, 9).lineWidth(0.7).fillAndStroke('#e9f8f0', '#c8ead8')
    doc.roundedRect(margem, 710, 5, 54, 2).fill('#21c979')
    desenharIconeIndicador(doc, margem + 6, 713, '#21c979', 'calendario')
    doc.font('Helvetica-Bold').fontSize(10).fillColor('#27353d').text('Nota de interpretação', margem + 40, 721)
    doc.font('Helvetica').fontSize(8).fillColor('#66879a').text('A análise de tendência depende da frequência e consistência dos registros. As médias semanais e os percentuais consideram cada registro informado pelo paciente.', margem + 40, 739, { width: largura - 53, lineGap: 1 })
    doc.save().translate(0, 29)
    desenharRodape(doc, doc.bufferedPageRange().count)
    doc.restore()
  }
}

function desenharAnaliseInsulina(doc, relatorio) {
  const margem = 45
  const largura = doc.page.width - margem * 2
  const analise = calcularAnaliseInsulina(relatorio)
  const { basal, rapida, outros } = analise.categorias
  const verde = '#159257'
  const laranja = '#ff8a1f'
  const numero = valor => formatarNumero(valor, Number.isInteger(valor) ? 0 : 1)
  doc.rect(0, 0, doc.page.width, 8).fill('#21c979')
  desenharLogo(doc, margem, 22, 105)
  doc.font('Helvetica-Bold').fontSize(9).fillColor('#547589').text('Análise de insulina', margem, 28, { width: largura, align: 'right' })
  doc.strokeColor('#dbe5e9').lineWidth(0.7).moveTo(margem, 58).lineTo(margem + largura, 58).stroke()
  doc.font('Helvetica-Bold').fontSize(20).fillColor('#27353d').text('Análise de insulina', margem, 70)
  doc.roundedRect(margem, 94, 58, 4, 2).fill('#21c979')
  doc.font('Helvetica').fontSize(9).fillColor('#66879a').text(
    `Esta seção apresenta um resumo das aplicações de insulina registradas de ${formatarDataCurta(relatorio.periodo.dataInicio)} a ${formatarDataCurta(relatorio.periodo.dataFim)}. A análise organiza os tipos e as quantidades informadas para apoiar a avaliação do profissional de saúde.`,
    margem, 110, { width: largura, lineGap: 2 }
  )
  const cards = [
    { rotulo: 'Total de aplicações registradas', valor: numero(analise.quantidade), cor: verde, icone: 'insulina' },
    { rotulo: 'Total de insulina no período', valor: `${numero(analise.total)} UI`, cor: verde, icone: 'insulina' },
    { rotulo: 'Média diária total', valor: `${numero(analise.media)} UI/dia`, cor: verde, icone: 'grafico' },
    { rotulo: 'Média diária basal', valor: `${numero(basal.media)} UI/dia`, cor: verde, icone: 'grafico' },
    { rotulo: 'Média diária rápida / ultrarrápida', valor: `${numero(rapida.media)} UI/dia`, cor: '#21c979', icone: 'grafico' },
    { rotulo: 'Média diária de correção', valor: 'Não disponível', cor: laranja, icone: 'grafico' },
    { rotulo: 'Dias com dados, sem basal registrada', valor: String(analise.diasSemBasal), cor: '#f4bb25', icone: 'calendario' },
    { rotulo: 'Correções registradas', valor: 'Não disponível', cor: laranja, icone: 'insulina' }
  ]
  const cardW = (largura - 24) / 4
  cards.forEach((card, indice) => {
    const x = margem + indice % 4 * (cardW + 8)
    const y = 164 + Math.floor(indice / 4) * 64
    doc.roundedRect(x, y, cardW, 55, 10).lineWidth(0.6).fillAndStroke('#e9f8f0', '#b9ead4')
    desenharIconeIndicador(doc, x + 4, y + 1, card.cor, card.icone)
    doc.font('Helvetica').fontSize(7).fillColor('#66879a').text(card.rotulo, x + 35, y + 8, { width: cardW - 41 })
    doc.font('Helvetica-Bold').fontSize(card.valor === 'Não disponível' ? 10 : 13).fillColor(card.cor).text(card.valor, x + 12, y + 33, { width: cardW - 20, lineBreak: false })
  })
  doc.font('Helvetica').fontSize(7.5).fillColor('#66879a').text(
    `Médias por dia com registros: ${analise.dias} dia(s), incluindo dias sem aplicação informada. A finalidade de correção não é identificada em campo próprio; não é inferida pelo tipo de insulina ou por texto livre.`,
    margem, 294, { width: largura, lineGap: 2 }
  )

  const graficoW = 237
  doc.roundedRect(margem, 347, graficoW, 190, 12).lineWidth(0.8).strokeColor('#d5e1e5').stroke()
  doc.font('Helvetica-Bold').fontSize(8.5).fillColor('#27353d').text('Média diária de insulina (UI/dia)', margem + 12, 368, { width: graficoW - 24, align: 'center' })
  const categorias = [basal, rapida, ...(outros.quantidade ? [outros] : [])]
  const gx = margem + 33
  const gy = 399
  const gw = graficoW - 47
  const gh = 93
  const teto = Math.max(1, Math.ceil(Math.max(...categorias.map(item => item.media)) * 1.2))
  for (let indice = 0; indice <= 4; indice += 1) {
    const y = gy + gh - gh * indice / 4
    doc.strokeColor('#e5ecef').lineWidth(0.5).moveTo(gx, y).lineTo(gx + gw, y).stroke()
    doc.font('Helvetica').fontSize(6).fillColor('#66879a').text(numero(teto * indice / 4), gx - 28, y - 3, { width: 23, align: 'right', lineBreak: false })
  }
  categorias.forEach((categoria, indice) => {
    const slot = gw / categorias.length
    const x = gx + indice * slot + slot * 0.2
    const altura = categoria.media / teto * gh
    if (altura > 0) doc.rect(x, gy + gh - altura, slot * 0.6, altura).fill(categoria.cor)
    doc.font('Helvetica-Bold').fontSize(7).fillColor('#27353d').text(numero(categoria.media), gx + indice * slot, gy + gh - altura - 12, { width: slot, align: 'center', lineBreak: false })
    doc.font('Helvetica').fontSize(6.5).text(categoria === basal ? 'Basal / lenta' : categoria === rapida ? 'Rápida / ultra' : 'Outros', gx + indice * slot, gy + gh + 8, { width: slot, align: 'center' })
  })
  if (!analise.quantidade) doc.font('Helvetica').fontSize(7.5).fillColor('#66879a').text('Sem aplicações registradas.', margem + 10, 520, { width: graficoW - 20, align: 'center' })

  const tx = margem + graficoW + 15
  const tw = largura - graficoW - 15
  const colunas = [0, 0.29, 0.52, 0.75, 1].map(fracao => tx + tw * fracao)
  const linhas = [
    ['Tipo de insulina', 'Total no período', 'Média diária', 'Observação'],
    ...categorias.map(item => [item.rotulo, `${numero(item.total)} UI`, `${numero(item.media)} UI/dia`, `${item.quantidade} aplicação(ões)`]),
    ['Correção', 'N/D', 'N/D', 'Finalidade não identificada'],
    ['Total', `${numero(analise.total)} UI`, `${numero(analise.media)} UI/dia`, 'Tipos registrados']
  ]
  linhas.forEach((linha, indice) => {
    const y = 347 + indice * 29
    doc.rect(tx, y, tw, 29).fill(indice === 0 ? '#21c979' : indice % 2 ? '#f7fafb' : '#ffffff')
    linha.forEach((texto, coluna) => {
      doc.rect(colunas[coluna], y, colunas[coluna + 1] - colunas[coluna], 29).lineWidth(0.4).strokeColor(indice === 0 ? '#ffffff' : '#cbdbe2').stroke()
      doc.font(indice === 0 ? 'Helvetica-Bold' : 'Helvetica').fontSize(6.5).fillColor(indice === 0 ? '#ffffff' : '#27353d').text(texto, colunas[coluna] + 4, y + 6, { width: colunas[coluna + 1] - colunas[coluna] - 8, align: coluna === 1 || coluna === 2 ? 'center' : 'left' })
    })
  })
  doc.font('Helvetica-Bold').fontSize(13).fillColor('#27353d').text('Relação entre glicose e insulina', margem, 548)
  const observacoes = [
    `${analise.altosComInsulina} registro(s) acima de 180 mg/dL têm aplicação de insulina associada; ${analise.altosSemInsulina} não têm aplicação associada.`,
    `${analise.diasSemBasal} dos ${analise.dias} dias com dados não possuem basal registrada. Ausência de registro não comprova ausência de aplicação.`,
    'A associação no mesmo registro não determina a ordem entre medição e aplicação, nem permite avaliar o efeito da dose.'
  ]
  let textoY = 570
  for (const texto of observacoes) {
    doc.circle(margem + 6, textoY + 4, 2).fill('#21c979')
    doc.font('Helvetica').fontSize(8.2).fillColor('#27353d').text(texto, margem + 15, textoY, { width: largura - 15, lineGap: 1 })
    textoY = doc.y + 5
  }
  doc.roundedRect(margem, 708, largura, 55, 9).lineWidth(0.7).fillAndStroke('#fff9e6', '#d5e1e5')
  doc.roundedRect(margem, 708, 5, 55, 2).fill('#f5c640')
  desenharIconeIndicador(doc, margem + 6, 711, '#f5c640', 'insulina')
  doc.font('Helvetica-Bold').fontSize(10).fillColor('#27353d').text('Alerta obrigatório', margem + 40, 720)
  doc.font('Helvetica').fontSize(8).fillColor('#66879a').text('O Insulog não realiza recomendação de dose. A análise apresentada apenas organiza os dados registrados para avaliação do profissional de saúde.', margem + 40, 738, { width: largura - 53, lineGap: 1 })
  doc.save().translate(0, 29)
  desenharRodape(doc, doc.bufferedPageRange().count)
  doc.restore()
}

function desenharEventosRelevantes(doc, relatorio) {
  const margem = 45
  const largura = doc.page.width - margem * 2
  const analise = calcularEventosRelevantes(relatorio)
  const colunas = [0, 0.12, 0.215, 0.415, 0.545, 0.725, 1].map(fracao => margem + largura * fracao)
  let y = 116
  function cabecalho(continuacao = false) {
    doc.rect(0, 0, doc.page.width, 8).fill('#21c979')
    desenharLogo(doc, margem, 22, 105)
    doc.font('Helvetica-Bold').fontSize(9).fillColor('#547589').text('Eventos relevantes', margem, 27, { width: largura, align: 'right' })
    doc.strokeColor('#dbe5e9').lineWidth(0.7).moveTo(margem, 58).lineTo(margem + largura, 58).stroke()
    doc.font('Helvetica-Bold').fontSize(19).fillColor('#27353d').text('Eventos relevantes e padrões detectados', margem, 70, { width: largura })
    doc.roundedRect(margem, 94, 58, 4, 2).fill('#21c979')
    if (continuacao) doc.font('Helvetica').fontSize(7).fillColor('#66879a').text('Continuação', margem + 70, 94)
    y = 116
  }
  function rodape() {
    doc.save().translate(0, 29)
    desenharRodape(doc, doc.bufferedPageRange().count)
    doc.restore()
  }
  function novaPagina() {
    rodape()
    doc.addPage()
    cabecalho(true)
  }
  function linha(celulas, altura, titulo = false, alternada = false) {
    doc.rect(margem, y, largura, altura).fill(titulo ? '#21c979' : alternada ? '#f7fafb' : '#ffffff')
    celulas.forEach((texto, coluna) => {
      const w = colunas[coluna + 1] - colunas[coluna]
      doc.rect(colunas[coluna], y, w, altura).lineWidth(0.4).strokeColor(titulo ? '#ffffff' : '#cbdbe2').stroke()
      doc.font(titulo ? 'Helvetica-Bold' : 'Helvetica').fontSize(6.5).fillColor(titulo ? '#ffffff' : '#27353d').text(texto, colunas[coluna] + 5, y + 4, { width: w - 10, lineGap: 1 })
    })
    y += altura
  }
  const titulos = ['Data', 'Horário', 'Evento', 'Valor', 'Contexto', 'Observação']
  // Divide textos extensos em linhas e permite continuar a mesma observação na página seguinte.
  function quebrarTexto(texto, larguraCelula) {
    doc.font('Helvetica').fontSize(6.5)
    const linhas = []
    for (const paragrafo of String(texto).split(/\r?\n/)) {
      let atual = ''
      for (const caractere of paragrafo) {
        if (atual && doc.widthOfString(atual + caractere) > larguraCelula) {
          const espaco = atual.lastIndexOf(' ')
          if (espaco > 0) {
            linhas.push(atual.slice(0, espaco))
            atual = atual.slice(espaco + 1)
          } else {
            linhas.push(atual)
            atual = ''
          }
        }
        atual += caractere
      }
      linhas.push(atual)
    }
    return linhas
  }
  cabecalho()
  linha(titulos, 16, true)
  if (!analise.eventos.length) {
    doc.font('Helvetica').fontSize(9).fillColor('#66879a').text('Nenhum registro abaixo de 70 ou acima de 180 mg/dL no período.', margem + 8, y + 14, { width: largura - 16 })
    y += 48
  }
  analise.eventos.forEach((evento, indice) => {
    const textos = [formatarDataCurta(evento.data), evento.horario, evento.evento, `${formatarNumero(evento.glicose, Number.isInteger(evento.glicose) ? 0 : 1)} mg/dL`, evento.periodo || '-', evento.observacao || '-']
    const linhas = textos.map((texto, coluna) => quebrarTexto(texto, colunas[coluna + 1] - colunas[coluna] - 11))
    let restante = Math.max(...linhas.map(celula => celula.length))
    while (restante > 0) {
      if (y + 26 > 758) {
        novaPagina()
        linha(titulos, 16, true)
      }
      const quantidade = Math.min(restante, Math.floor((758 - y - 8) / 9))
      const celulas = linhas.map(celula => celula.splice(0, quantidade).join('\n'))
      if (!celulas[0]) celulas[0] = `${formatarDataCurta(evento.data)}\n(cont.)`
      linha(celulas, Math.max(quantidade, celulas[0].includes('(cont.)') ? 2 : 1) * 9 + 8, false, indice % 2 === 0)
      restante = Math.max(...linhas.map(celula => celula.length))
    }
  })
  if (y > 450) novaPagina()
  y += 12
  doc.font('Helvetica-Bold').fontSize(13).fillColor('#27353d').text('Padrões identificados pelo Insulog', margem, y)
  const cardsY = y + 28
  const concentracao = analise.concentracao.length === 1
    ? `Maior contagem na ${analise.concentracao[0].nome}: ${analise.concentracao[0].quantidade} registro(s). O horário não identifica a refeição.`
    : analise.altos ? 'Há empate entre períodos do dia na contagem de registros elevados; não há um único período predominante.' : 'Não foram encontrados registros acima de 180 mg/dL no período.'
  const cards = [
    { titulo: 'Registros elevados por horário', texto: concentracao, cor: '#ff8a1f', icone: 'grafico' },
    { titulo: 'Episódios de hipoglicemia', texto: `Foram observados ${analise.baixos} registro(s) abaixo de 70 mg/dL em ${analise.diasBaixos} data(s) diferente(s).`, cor: '#ef4549', icone: 'gota' },
    { titulo: 'Distribuição dos registros', texto: `${analise.alvo} de ${analise.total} registros estão na faixa de 70–180 mg/dL. Há ${analise.altos} acima de 180 mg/dL, incluindo ${analise.muitoAltos} acima de 250 mg/dL.`, cor: '#f5c640', icone: 'grafico' },
    { titulo: 'Período dos dados analisados', texto: `Eventos de ${formatarDataCurta(relatorio.periodo.dataInicio)} a ${formatarDataCurta(relatorio.periodo.dataFim)}. Gráfico por horário e matriz usam até os últimos 14 dias desse intervalo.`, cor: '#159257', icone: 'calendario' }
  ]
  const cardW = (largura - 12) / 2
  cards.forEach((card, indice) => {
    const x = margem + indice % 2 * (cardW + 12)
    const cy = cardsY + Math.floor(indice / 2) * 83
    doc.roundedRect(x, cy, cardW, 72, 9).lineWidth(0.7).strokeColor('#d5e1e5').stroke()
    doc.roundedRect(x, cy, 5, 72, 2).fill(card.cor)
    desenharIconeIndicador(doc, x + 6, cy + 3, card.cor, card.icone)
    doc.font('Helvetica-Bold').fontSize(8.5).fillColor('#27353d').text(card.titulo, x + 38, cy + 10, { width: cardW - 49 })
    doc.font('Helvetica').fontSize(8).fillColor('#66879a').text(card.texto, x + 15, cy + 34, { width: cardW - 29, lineGap: 1 })
  })
  const recomendacaoY = cardsY + 175
  doc.font('Helvetica-Bold').fontSize(12).fillColor('#27353d').text('Recomendação neutra', margem, recomendacaoY)
  doc.font('Helvetica').fontSize(9).fillColor('#66879a').text('Discuta esses registros com o profissional de saúde responsável, considerando alimentação, horários de aplicação, atividade física, sono e tratamento. Esta análise descreve os dados informados e não determina causas nem recomenda ajustes de dose.', margem, recomendacaoY + 20, { width: largura, lineGap: 2 })
  rodape()
}

function desenharRegistrosCompletos(doc, relatorio) {
  const margem = 45
  const largura = doc.page.width - margem * 2
  const colunas = [0, 0.175, 0.29, 0.43, 0.57, 0.67, 0.79, 1].map(fracao => margem + largura * fracao)
  const titulos = ['Data/hora', 'Glicose', 'Classificação', 'Período', 'Insulina', 'Tipo', 'Observação']
  let y
  function cabecalho(continuacao = false) {
    doc.rect(0, 0, doc.page.width, 8).fill('#21c979')
    desenharLogo(doc, margem, 22, 105)
    doc.font('Helvetica-Bold').fontSize(9).fillColor('#547589').text('Registros completos', margem, 27, { width: largura, align: 'right' })
    doc.strokeColor('#dbe5e9').lineWidth(0.7).moveTo(margem, 58).lineTo(margem + largura, 58).stroke()
    doc.font('Helvetica-Bold').fontSize(19).fillColor('#27353d').text('Registros completos de glicose e insulina', margem, 70, { width: largura })
    doc.roundedRect(margem, 94, 58, 4, 2).fill('#21c979')
    doc.font('Helvetica').fontSize(9).fillColor('#66879a').text(
      `${continuacao ? 'Continuação da tabela. ' : ''}Todos os registros do período são apresentados em ordem cronológica. Aplicações adicionais ocupam linhas separadas para preservar a relação entre a dose e o tipo de insulina.`,
      margem, 110, { width: largura, lineGap: 2 }
    )
    y = 153
  }
  function rodape() {
    doc.save().translate(0, 29)
    desenharRodape(doc, doc.bufferedPageRange().count)
    doc.restore()
  }
  function novaPagina() {
    rodape()
    doc.addPage()
    cabecalho(true)
  }
  function desenharLinha(celulas, altura, cab = false, alternada = false) {
    doc.rect(margem, y, largura, altura).fill(cab ? '#21c979' : alternada ? '#f7fafb' : '#ffffff')
    celulas.forEach((linhas, coluna) => {
      const x = colunas[coluna]
      const w = colunas[coluna + 1] - x
      doc.rect(x, y, w, altura).lineWidth(0.4).strokeColor(cab ? '#ffffff' : '#cbdbe2').stroke()
      doc.font(cab ? 'Helvetica-Bold' : 'Helvetica').fontSize(6.5).fillColor(cab ? '#ffffff' : '#27353d')
      linhas.forEach((texto, indice) => doc.text(texto, x + 4, y + 4 + indice * 9, { width: w - 8, lineBreak: false }))
    })
    y += altura
  }
  function cabecalhoTabela() {
    desenharLinha(titulos.map(titulo => [titulo]), 16, true)
  }
  function quebrar(texto, w) {
    doc.font('Helvetica').fontSize(6.5)
    const linhas = []
    for (const paragrafo of String(texto || '-').split(/\r?\n/)) {
      let atual = ''
      for (const caractere of paragrafo) {
        if (atual && doc.widthOfString(atual + caractere) > w) {
          const espaco = atual.lastIndexOf(' ')
          linhas.push(espaco > 0 ? atual.slice(0, espaco) : atual)
          atual = espaco > 0 ? atual.slice(espaco + 1) : ''
        }
        atual += caractere
      }
      linhas.push(atual)
    }
    return linhas
  }
  cabecalho()
  cabecalhoTabela()
  prepararRegistrosCompletos(relatorio).forEach((celulas, indice) => {
    const linhas = celulas.map((texto, coluna) => quebrar(texto, colunas[coluna + 1] - colunas[coluna] - 9))
    let restantes = Math.max(...linhas.map(linha => linha.length))
    // Move uma linha inteira para a próxima página sempre que ela couber nela.
    if (restantes * 9 + 8 <= 570 && y + restantes * 9 + 8 > 748) {
      novaPagina()
      cabecalhoTabela()
    }
    let continuacao = false
    while (restantes > 0) {
      if (y + 35 > 748) {
        novaPagina()
        cabecalhoTabela()
      }
      const quantidade = Math.min(restantes, Math.floor((748 - y - 8) / 9))
      const trecho = linhas.map(linha => linha.splice(0, quantidade))
      if (continuacao) trecho[0] = [...quebrar(celulas[0], colunas[1] - colunas[0] - 9), '(continuação)']
      desenharLinha(trecho, Math.max(quantidade, trecho[0].length) * 9 + 8, false, indice % 2 === 0)
      restantes = Math.max(...linhas.map(linha => linha.length))
      continuacao = true
    }
  })
  if (y + 190 > 730) novaPagina()
  const topo = y + 18
  doc.roundedRect(margem, topo, largura, 730 - topo, 12).lineWidth(0.7).fillAndStroke('#e9f8f0', '#b9ead4')
  doc.font('Helvetica-Bold').fontSize(13).fillColor('#27353d').text('Conclusão final', margem + 18, topo + 13)
  const analise = calcularEventosRelevantes(relatorio)
  const percentual = analise.total ? analise.alvo / analise.total * 100 : 0
  doc.font('Helvetica').fontSize(9).fillColor('#66879a').text(
    `No período de ${formatarDataCurta(relatorio.periodo.dataInicio)} a ${formatarDataCurta(relatorio.periodo.dataFim)}, foram analisados ${analise.total} registros de glicose. Destes, ${analise.alvo} (${formatarNumero(percentual)}%) ficaram na faixa de 70–180 mg/dL, ${analise.baixos} abaixo de 70 mg/dL e ${analise.altos} acima de 180 mg/dL. Foram registradas ${contarAplicacoes(relatorio)} aplicações de insulina. As linhas adicionais de aplicação não aumentam a contagem de medições de glicose.`,
    margem + 18, topo + 37, { width: largura - 36, lineGap: 2 }
  )
  doc.moveDown(0.8).text('O Insulog organiza os registros informados para apoiar o acompanhamento e a consulta com o profissional de saúde. Os dados manuais não representam monitoramento contínuo, e este relatório não determina causas nem recomenda ajustes de tratamento.', { width: largura - 36, lineGap: 2 })
  if (relatorio.periodo.source === 'fixture') {
    doc.font('Helvetica-Oblique').fontSize(7.5).fillColor('#66879a').text('Dados fictícios para demonstração. Uso exclusivo como exemplo visual da exportação.', margem, 750, { width: largura, align: 'center' })
  }
  rodape()
}

function gerarPdf(relatorio) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 45, bufferPages: true })
    const partes = []
    doc.on('data', parte => partes.push(parte))
    doc.on('end', () => resolve(Buffer.concat(partes)))
    doc.on('error', reject)

    desenharCapa(doc, relatorio)

    doc.addPage()
    desenharResumoClinico(doc, relatorio)

    doc.addPage()
    desenharFaixasGlicemicas(doc, relatorio)

    doc.addPage()
    desenharPadraoGlicose(doc, relatorio)

    doc.addPage()
    desenharComparativoDatas(doc, relatorio)

    doc.addPage()
    desenharEvolucaoGlicose(doc, relatorio)

    doc.addPage()
    desenharAnaliseInsulina(doc, relatorio)

    doc.addPage()
    desenharEventosRelevantes(doc, relatorio)

    doc.addPage()
    desenharRegistrosCompletos(doc, relatorio)
    doc.end()
  })
}

module.exports = { gerarPdf }
