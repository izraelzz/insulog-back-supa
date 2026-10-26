const { calcularPadraoGlicose, decomporData } = require('./padraoGlicose')

function listarDatas(inicio, fim) {
  const datas = []
  const cursor = new Date(`${inicio}T00:00:00Z`)
  while (cursor.toISOString().slice(0, 10) <= fim) {
    datas.push(cursor.toISOString().slice(0, 10))
    cursor.setUTCDate(cursor.getUTCDate() + 1)
  }
  return datas
}

function calcularComparativoDatas(relatorio) {
  const grupos = new Map()
  for (const registro of relatorio.registros) {
    const { data, hora } = decomporData(registro.dataHora)
    if (data < relatorio.periodo.dataInicio || data > relatorio.periodo.dataFim) continue
    if (!grupos.has(data)) grupos.set(data, [])
    grupos.get(data).push({ glicose: registro.glicose, periodo: Math.floor(hora / 6) })
  }
  const dias = listarDatas(relatorio.periodo.dataInicio, relatorio.periodo.dataFim).map(data => {
    const registros = grupos.get(data) || []
    const valores = registros.map(item => item.glicose)
    return {
      data,
      media: valores.length ? valores.reduce((soma, valor) => soma + valor, 0) / valores.length : null,
      minimo: valores.length ? Math.min(...valores) : null,
      maximo: valores.length ? Math.max(...valores) : null,
      fora: valores.filter(valor => valor < 70 || valor > 180).length,
      hipo: valores.filter(valor => valor < 70).length,
      hiper: valores.filter(valor => valor > 180).length,
      muitoAlto: valores.filter(valor => valor > 250).length,
      quantidade: valores.length,
      celulas: Array.from({ length: 4 }, (_, periodo) => {
        const grupo = registros.filter(item => item.periodo === periodo)
        return { quantidade: grupo.length, media: grupo.length ? grupo.reduce((soma, item) => soma + item.glicose, 0) / grupo.length : null }
      })
    }
  })
  const { inicio, fim } = calcularPadraoGlicose(relatorio)
  return { inicio, fim, dias, matriz: dias.filter(dia => dia.data >= inicio) }
}

module.exports = { calcularComparativoDatas }
