const assert = require('node:assert/strict')
const test = require('node:test')
const { calcularEvolucaoGlicose } = require('../src/reports/evolucaoGlicose')

test('média semanal pondera registros e preserva ambos os alertas em dia de média na faixa', () => {
  const resultado = calcularEvolucaoGlicose({
    periodo: { dataInicio: '2026-08-01', dataFim: '2026-08-07' },
    registros: [
      { dataHora: '2026-08-01 06:00:00', glicose: 50 },
      { dataHora: '2026-08-01 12:00:00', glicose: 270 },
      { dataHora: '2026-08-02 06:00:00', glicose: 70 },
      { dataHora: '2026-08-02 12:00:00', glicose: 180 },
      { dataHora: '2026-08-02 18:00:00', glicose: 180 }
    ]
  })
  assert.equal(resultado.dias[0].media, 160)
  assert.equal(resultado.dias[0].hipo, 1)
  assert.equal(resultado.dias[0].muitoAlto, 1)
  assert.equal(resultado.semanas[0].media, 150)
  assert.equal(resultado.semanas[0].percentualAlvo, 60)
  assert.equal(resultado.semanas[0].hipo, 1)
  assert.equal(resultado.semanas[0].hiper, 1)
  assert.equal(resultado.dias[2].media, null)
})

test('semanas incluem lacunas, semana vazia e último bloco parcial desde o início do filtro', () => {
  const resultado = calcularEvolucaoGlicose({
    periodo: { dataInicio: '2026-08-03', dataFim: '2026-08-18' },
    registros: [{ dataHora: '2026-08-18 23:00:00', glicose: 250 }]
  })
  assert.equal(resultado.semanas.length, 3)
  assert.equal(resultado.semanas[0].inicio, '2026-08-03')
  assert.equal(resultado.semanas[0].fim, '2026-08-09')
  assert.equal(resultado.semanas[0].media, null)
  assert.equal(resultado.semanas[0].percentualAlvo, null)
  assert.equal(resultado.semanas[2].inicio, '2026-08-17')
  assert.equal(resultado.semanas[2].fim, '2026-08-18')
  assert.equal(resultado.semanas[2].hiper, 1)
  assert.equal(resultado.dias.at(-1).muitoAlto, 0)
})
