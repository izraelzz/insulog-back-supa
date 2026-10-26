const horarioLocal = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/Araguaina', year: 'numeric', month: '2-digit', day: '2-digit',
  hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
})

function decomporData(valor) {
  // Datas sem fuso do MySQL representam o horário local informado pelo paciente.
  const texto = String(valor)
  const local = texto.match(/^(\d{4}-\d{2}-\d{2})[ T](\d{2}):(\d{2})(?::\d{2}(?:\.\d+)?)?$/)
  if (local) return { data: local[1], hora: Number(local[2]), minuto: Number(local[3]) }
  const partes = Object.fromEntries(horarioLocal.formatToParts(new Date(valor)).map(item => [item.type, item.value]))
  return { data: `${partes.year}-${partes.month}-${partes.day}`, hora: Number(partes.hour), minuto: Number(partes.minute) }
}

function calcularPadraoGlicose(relatorio) {
  const fim = relatorio.periodo.dataFim
  const limite = new Date(`${fim}T00:00:00Z`)
  limite.setUTCDate(limite.getUTCDate() - 13)
  const inicio = [relatorio.periodo.dataInicio, limite.toISOString().slice(0, 10)].sort().at(-1)
  const pontos = relatorio.registros.map(registro => {
    const local = decomporData(registro.dataHora)
    return { ...local, glicose: registro.glicose, horario: local.hora + local.minuto / 60 }
  }).filter(ponto => ponto.data >= inicio && ponto.data <= fim).sort((a, b) => a.horario - b.horario)
  const grupos = new Map()
  for (const ponto of pontos) {
    const grupo = grupos.get(ponto.hora) || []
    grupo.push(ponto)
    grupos.set(ponto.hora, grupo)
  }
  const medias = [...grupos.values()].map(grupo => ({
    horario: grupo.reduce((soma, ponto) => soma + ponto.horario, 0) / grupo.length,
    glicose: grupo.reduce((soma, ponto) => soma + ponto.glicose, 0) / grupo.length
  }))
  return { inicio, fim, pontos, medias }
}

module.exports = { calcularPadraoGlicose, decomporData }
