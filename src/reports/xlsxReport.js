const ExcelJS = require('exceljs')
const { decomporData } = require('./padraoGlicose')

const cores = { menta: 'FF21C979', verde: 'FF168052', escuro: 'FF153F30', texto: 'FF294638', suave: 'FF718578', linha: 'FFDFE9E3', claro: 'FFEAF7EF', branco: 'FFFFFFFF' }
const preencher = cor => ({ type: 'pattern', pattern: 'solid', fgColor: { argb: cor } })
const dataCurta = valor => String(valor).slice(0, 10).split('-').reverse().join('/')

function faixaCor(valor) {
  return valor < 54 ? ['FFAA2D44', 'FFFBECEF'] : valor < 70 ? ['FFCB3E4A', 'FFFFF0F1'] : valor <= 180 ? ['FF168052', 'FFEAF7EF'] : valor <= 250 ? ['FF916900', 'FFFFF6D6'] : ['FFBB5A14', 'FFFFF0E3']
}

function prepararFolha(folha, colunas) {
  folha.properties.defaultRowHeight = 24
  folha.properties.tabColor = { argb: cores.verde }
  folha.columns = colunas
  folha.views = [{ showGridLines: false, zoomScale: 85 }]
  folha.pageSetup = { paperSize: 9, orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0, margins: { left: 0.3, right: 0.3, top: 0.4, bottom: 0.4, header: 0.2, footer: 0.2 } }
  folha.headerFooter.oddFooter = '&LInsulog · Dados informados pelo paciente&R Página &P de &N'
}

function mesclar(folha, faixa, valor, options = {}) {
  folha.mergeCells(faixa)
  const celula = folha.getCell(faixa.split(':')[0])
  celula.value = valor
  celula.font = { name: 'Aptos', size: 11, color: { argb: cores.texto }, ...options.font }
  celula.alignment = { vertical: 'middle', indent: 1, wrapText: true, ...options.alignment }
  if (options.cor) celula.fill = preencher(options.cor)
  if (options.numFmt) celula.numFmt = options.numFmt
}

function cabecalho(folha, fim, titulo, relatorio) {
  folha.getRow(1).height = 6
  mesclar(folha, `A1:${fim}1`, '', { cor: cores.menta })
  folha.getRow(2).height = 48
  mesclar(folha, `A2:${fim}2`, titulo, { cor: cores.escuro, font: { size: 24, bold: true, color: { argb: cores.branco } } })
  folha.getRow(3).height = 28
  mesclar(folha, `A3:${fim}3`, `${relatorio.usuario.nome}  |  ${dataCurta(relatorio.periodo.dataInicio)} a ${dataCurta(relatorio.periodo.dataFim)}`, { cor: cores.escuro, font: { size: 11, color: { argb: 'FFC2EAD5' } } })
}

function estilizarTabela(folha, inicio, fim, colunas) {
  for (let linha = inicio; linha <= fim; linha += 1) {
    const cab = linha === inicio
    folha.getRow(linha).height = cab ? 29 : 27
    for (let coluna = 1; coluna <= colunas; coluna += 1) {
      const celula = folha.getCell(linha, coluna)
      celula.font = { name: 'Aptos', size: 10, bold: cab, color: { argb: cab ? cores.branco : cores.texto } }
      celula.fill = preencher(cab ? cores.escuro : (linha - inicio) % 2 ? 'FFF7FAF8' : cores.branco)
      celula.alignment = { vertical: 'middle', wrapText: true, indent: 1 }
      celula.border = { bottom: { style: 'hair', color: { argb: cores.linha } } }
    }
  }
}

async function gerarXlsx(relatorio) {
  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'Insulog'
  workbook.created = relatorio.geradoEm
  workbook.title = 'Relatório de glicose e insulina'
  // Abre diretamente na lista; o resumo continua disponível na primeira aba.
  workbook.views = [{ activeTab: 1, firstSheet: 0 }]
  const resumo = workbook.addWorksheet('Resumo')
  prepararFolha(resumo, Array.from({ length: 8 }, () => ({ width: 16 })))
  cabecalho(resumo, 'H', 'INSULOG  /  Resumo do período', relatorio)
  mesclar(resumo, 'A4:H4', { text: 'VER LISTA COMPLETA DE REGISTROS  →', hyperlink: "#'Registros'!A10" }, { font: { size: 10, bold: true, underline: true, color: { argb: cores.verde } } })
  const r = relatorio.resumo
  const cards = [
    ['A', 'B', 'GLICOSE MÉDIA', r.media, '0.0" mg/dL"'],
    ['C', 'D', 'REGISTROS NA FAIXA', r.percentualAlvo / 100, '0.0%'],
    ['E', 'F', 'INSULINA REGISTRADA', r.totalInsulina, '0.0" UI"'],
    ['G', 'H', 'DIAS COM REGISTROS', r.totalDias, '0" dias"']
  ]
  resumo.getRow(5).height = 26
  resumo.getRow(6).height = 40
  cards.forEach(([a, b, rotulo, valor, numFmt], indice) => {
    const cor = indice === 0 ? cores.escuro : cores.claro
    const texto = indice === 0 ? cores.branco : cores.verde
    mesclar(resumo, `${a}5:${b}5`, rotulo, { cor, font: { size: 9, bold: true, color: { argb: texto } } })
    mesclar(resumo, `${a}6:${b}6`, valor, { cor, numFmt, font: { size: 23, bold: true, color: { argb: texto } } })
  })
  mesclar(resumo, 'A8:H8', 'DISTRIBUIÇÃO GLICÊMICA', { font: { bold: true, size: 12 } })
  const linhas = [['Faixa glicêmica', 'Critério', 'Registros', 'Percentual'], ...r.faixas.map((f, i) => [f.descricao, ['<54 mg/dL', '54–69 mg/dL', '70–180 mg/dL', '181–250 mg/dL', '>250 mg/dL'][i], f.quantidade, f.percentual / 100])]
  linhas.forEach((valores, indice) => {
    const linha = 9 + indice
    resumo.getRow(linha).height = 28
    valores.forEach((valor, coluna) => {
      const letras = [['A', 'B'], ['C', 'D'], ['E', 'F'], ['G', 'H']][coluna]
      mesclar(resumo, `${letras[0]}${linha}:${letras[1]}${linha}`, valor, {
        cor: indice === 0 ? cores.escuro : faixaCor([40, 60, 100, 200, 300][indice - 1])[1],
        font: { bold: indice === 0, color: { argb: indice === 0 ? cores.branco : cores.texto } },
        alignment: { horizontal: coluna >= 2 ? 'center' : 'left' },
        ...(coluna === 3 && indice > 0 ? { numFmt: '0.0%' } : {})
      })
    })
    if (indice > 0) resumo.getCell(`A${linha}`).font = { name: 'Aptos', size: 11, bold: true, color: { argb: faixaCor([40, 60, 100, 200, 300][indice - 1])[0] } }
  })
  mesclar(resumo, 'A16:H16', 'OUTROS INDICADORES', { font: { bold: true, size: 12 } })
  const indicadores = [
    ['Total de registros', r.totalRegistros, '0'], ['Menor glicose', r.minimo, '0" mg/dL"'],
    ['Maior glicose', r.maximo, '0" mg/dL"'], ['Variabilidade (CV)', r.cv / 100, '0.0%'],
    ['GMI estimado', r.gmi / 100, '0.00%'], ['Insulina média diária', r.mediaDiariaInsulina, '0.0" UI/dia"']
  ]
  indicadores.forEach(([rotulo, valor, numFmt], indice) => {
    const linha = 17 + indice
    const cor = indice % 2 ? cores.branco : 'FFF7FAF8'
    mesclar(resumo, `A${linha}:D${linha}`, rotulo, { cor })
    mesclar(resumo, `E${linha}:H${linha}`, valor, { cor, numFmt, font: { bold: true }, alignment: { horizontal: 'right' } })
  })
  resumo.getRow(24).height = 42
  mesclar(resumo, 'A24:H24', 'Percentuais calculados sobre registros manuais, não sobre tempo contínuo em faixa. A média diária de insulina considera os dias com registros. Este documento não substitui avaliação profissional.', { cor: cores.claro, font: { size: 10, color: { argb: cores.suave } } })
  resumo.pageSetup.printArea = 'A1:H24'

  const registros = workbook.addWorksheet('Registros')
  prepararFolha(registros, [{ width: 23 }, { width: 18 }, { width: 20 }, { width: 23 }, { width: 17 }, { width: 36 }, { width: 52 }])
  cabecalho(registros, 'G', 'INSULOG  /  Registros completos', relatorio)
  mesclar(registros, 'A4:G4', 'DIÁRIO DE GLICOSE E INSULINA  /  Todas as medições do período', { font: { size: 10, bold: true, color: { argb: cores.verde } } })
  const destaques = [
    ['A', 'B', 'MEDIÇÕES REGISTRADAS', r.totalRegistros, '0'],
    ['C', 'D', 'NA FAIXA DE 70–180 mg/dL', r.percentualAlvo / 100, '0.0%'],
    ['E', 'G', 'INSULINA NO PERÍODO', r.totalInsulina, '0.0" UI"']
  ]
  registros.getRow(5).height = 25
  registros.getRow(6).height = 38
  destaques.forEach(([a, b, rotulo, valor, numFmt]) => {
    mesclar(registros, `${a}5:${b}5`, rotulo, { cor: cores.claro, font: { size: 10, bold: true, color: { argb: cores.verde } } })
    mesclar(registros, `${a}6:${b}6`, valor, { cor: cores.claro, numFmt, font: { size: 25, bold: true, color: { argb: cores.escuro } } })
  })
  mesclar(registros, 'A8:D8', 'Filtre por data, faixa ou período nas setas da tabela.', { font: { size: 10, color: { argb: cores.suave } } })
  mesclar(registros, 'E8:G8', { text: 'VER RESUMO DO PERÍODO  →', hyperlink: "#'Resumo'!A1" }, { font: { size: 10, bold: true, underline: true, color: { argb: cores.verde } } })
  const ordenados = relatorio.registros.map(registro => ({ registro, local: decomporData(registro.dataHora) }))
    .sort((a, b) => a.local.data.localeCompare(b.local.data) || a.local.hora - b.local.hora || a.local.minuto - b.local.minuto)
  const linhasRegistros = ordenados.map(({ registro, local }) => {
    // Excel não armazena fuso: grava os componentes do horário local para exibição estável.
    const data = new Date(`${local.data}T${String(local.hora).padStart(2, '0')}:${String(local.minuto).padStart(2, '0')}:00Z`)
    return [data, registro.glicose, registro.classificacao, registro.periodo,
      registro.insulinas.length ? registro.totalInsulina : null,
      registro.insulinas.map(item => `${item.tipo}: ${item.unidades} UI`).join('\n') || '—', registro.observacao || '—']
  })
  registros.addTable({
    name: 'RegistrosInsulog', ref: 'A10', headerRow: true,
    style: { theme: 'TableStyleMedium4', showRowStripes: true },
    columns: ['Data/hora', 'Glicose (mg/dL)', 'Classificação', 'Período', 'Insulina (UI)', 'Tipos de insulina', 'Observação']
      .map(name => ({ name, filterButton: true })),
    rows: linhasRegistros
  })
  const ultimaLinha = 10 + ordenados.length
  estilizarTabela(registros, 10, ultimaLinha, 7)
  ordenados.forEach(({ registro, local }, indice) => {
    const linha = 11 + indice
    const [cor, fundo] = faixaCor(registro.glicose)
    registros.getCell(linha, 1).numFmt = 'dd/mm/yyyy hh:mm'
    registros.getCell(linha, 2).numFmt = '0.##'
    registros.getCell(linha, 5).numFmt = '0.##'
    for (const coluna of [2, 3]) {
      registros.getCell(linha, coluna).fill = preencher(fundo)
      registros.getCell(linha, coluna).font = { name: 'Aptos', size: coluna === 2 ? 14 : 10, bold: true, color: { argb: cor } }
    }
    registros.getCell(linha, 1).border = {
      ...registros.getCell(linha, 1).border, left: { style: 'medium', color: { argb: cor } }
    }
    // Separadores discretos marcam a passagem de um dia para o próximo.
    if (indice > 0 && local.data !== ordenados[indice - 1].local.data) {
      for (let coluna = 1; coluna <= 7; coluna += 1) {
        const celula = registros.getCell(linha, coluna)
        celula.border = { ...celula.border, top: { style: 'thin', color: { argb: 'FFB2CDBE' } } }
      }
    }
    for (const coluna of [2, 5]) registros.getCell(linha, coluna).alignment = { vertical: 'middle', horizontal: 'center' }
    const linhasObservacao = String(registro.observacao || '').split('\n').reduce((soma, texto) => soma + Math.max(1, Math.ceil(texto.length / 48)), 0)
    registros.getRow(linha).height = Math.min(409, Math.max(38, Math.max(linhasObservacao, registro.insulinas.length) * 15 + 12))
  })
  registros.views = [{ state: 'frozen', ySplit: 10, xSplit: 1, showGridLines: false, topLeftCell: 'B11', zoomScale: 85 }]
  registros.pageSetup.printTitlesRow = '1:10'
  registros.pageSetup.printArea = `A1:G${ultimaLinha}`
  return Buffer.from(await workbook.xlsx.writeBuffer())
}

module.exports = { gerarXlsx }
