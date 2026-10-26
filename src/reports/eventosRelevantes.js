const { decomporData } = require('./padraoGlicose')

function calcularEventosRelevantes(relatorio) {
  const registros = relatorio.registros.map(registro => ({ ...registro, ...decomporData(registro.dataHora) }))
    .filter(registro => registro.data >= relatorio.periodo.dataInicio && registro.data <= relatorio.periodo.dataFim)
  const eventos = registros.filter(registro => registro.glicose < 70 || registro.glicose > 180)
    .map(registro => ({
      ...registro,
      horario: `${String(registro.hora).padStart(2, '0')}:${String(registro.minuto).padStart(2, '0')}`,
      evento: registro.glicose < 70 ? 'Hipoglicemia' : registro.glicose > 250 ? 'Hiperglicemia importante' : 'Hiperglicemia'
    }))
    .sort((a, b) => a.data.localeCompare(b.data) || a.hora - b.hora || a.minuto - b.minuto)
  const baixos = eventos.filter(evento => evento.glicose < 70)
  const altos = eventos.filter(evento => evento.glicose > 180)
  const periodos = [
    { nome: 'madrugada (00–06h)', quantidade: 0 }, { nome: 'manhã (06–12h)', quantidade: 0 },
    { nome: 'tarde (12–18h)', quantidade: 0 }, { nome: 'noite (18–24h)', quantidade: 0 }
  ]
  for (const evento of altos) periodos[Math.floor(evento.hora / 6)].quantidade += 1
  const maior = Math.max(...periodos.map(periodo => periodo.quantidade))
  const concentracao = periodos.filter(periodo => maior > 0 && periodo.quantidade === maior)
  return {
    eventos, baixos: baixos.length, diasBaixos: new Set(baixos.map(evento => evento.data)).size,
    altos: altos.length, muitoAltos: altos.filter(evento => evento.glicose > 250).length,
    concentracao, total: registros.length,
    alvo: registros.filter(registro => registro.glicose >= 70 && registro.glicose <= 180).length
  }
}

module.exports = { calcularEventosRelevantes }
