const { decomporData } = require('./padraoGlicose')

function calcularAnaliseInsulina(relatorio) {
  const categorias = {
    basal: { rotulo: 'Basal / lenta', total: 0, quantidade: 0, cor: '#159257' },
    rapida: { rotulo: 'Rápida / ultrarrápida', total: 0, quantidade: 0, cor: '#21c979' },
    outros: { rotulo: 'Outros / não identificado', total: 0, quantidade: 0, cor: '#66879a' }
  }
  const dias = new Set()
  const diasBasal = new Set()
  let altosComInsulina = 0
  let altosSemInsulina = 0
  let quantidade = 0
  let total = 0
  for (const registro of relatorio.registros) {
    const { data } = decomporData(registro.dataHora)
    if (data < relatorio.periodo.dataInicio || data > relatorio.periodo.dataFim) continue
    dias.add(data)
    if (registro.glicose > 180) {
      if (registro.insulinas.length) altosComInsulina += 1
      else altosSemInsulina += 1
    }
    for (const insulina of registro.insulinas) {
      const tipo = String(insulina.tipo).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim()
      const chave = ['basal', 'lenta', 'basal / lenta'].includes(tipo) ? 'basal'
        : ['rapida', 'ultrarrapida', 'ultra-rapida', 'ultra rapida', 'bolus', 'bolus/rapida', 'rapida / bolus'].includes(tipo) ? 'rapida' : 'outros'
      categorias[chave].total += insulina.unidades
      categorias[chave].quantidade += 1
      total += insulina.unidades
      quantidade += 1
      if (chave === 'basal') diasBasal.add(data)
    }
  }
  for (const categoria of Object.values(categorias)) categoria.media = dias.size ? categoria.total / dias.size : 0
  return {
    categorias, quantidade, total, dias: dias.size,
    media: dias.size ? total / dias.size : 0,
    diasSemBasal: dias.size - diasBasal.size,
    altosComInsulina, altosSemInsulina
  }
}

module.exports = { calcularAnaliseInsulina }
