const { calcularComparativoDatas } = require('./comparativoDatas')

function calcularEvolucaoGlicose(relatorio) {
  const { dias } = calcularComparativoDatas(relatorio)
  const semanas = []
  // Blocos consecutivos de sete dias a partir do início do filtro, incluindo dias sem dados.
  for (let indice = 0; indice < dias.length; indice += 7) {
    const grupo = dias.slice(indice, indice + 7)
    const quantidade = grupo.reduce((total, dia) => total + dia.quantidade, 0)
    const hipo = grupo.reduce((total, dia) => total + dia.hipo, 0)
    const hiper = grupo.reduce((total, dia) => total + dia.hiper, 0)
    semanas.push({
      numero: semanas.length + 1, inicio: grupo[0].data, fim: grupo.at(-1).data,
      quantidade, hipo, hiper,
      media: quantidade ? grupo.reduce((total, dia) => total + (dia.media || 0) * dia.quantidade, 0) / quantidade : null,
      percentualAlvo: quantidade ? (quantidade - hipo - hiper) / quantidade * 100 : null
    })
  }
  return { dias, semanas }
}

module.exports = { calcularEvolucaoGlicose }
