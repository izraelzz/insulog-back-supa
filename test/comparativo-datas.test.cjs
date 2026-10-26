const assert = require('node:assert/strict')
const test = require('node:test')
const { calcularComparativoDatas } = require('../src/reports/comparativoDatas')

test('consolida múltiplos registros sem ocultar extremos na contagem Fora', () => {
  const resultado = calcularComparativoDatas({
    periodo: { dataInicio: '2026-08-01', dataFim: '2026-08-31' },
    registros: [
      { dataHora: '2026-08-31 06:00:00', glicose: 60 },
      { dataHora: '2026-08-31 11:59:00', glicose: 200 },
      { dataHora: '2026-08-31 12:00:00', glicose: 180 },
      { dataHora: '2026-08-31 18:00:00', glicose: 70 }
    ]
  })
  assert.equal(resultado.dias.length, 31)
  assert.equal(resultado.matriz.length, 14)
  assert.equal(resultado.matriz[0].data, '2026-08-18')
  const dia = resultado.dias.at(-1)
  assert.equal(dia.media, 127.5)
  assert.equal(dia.minimo, 60)
  assert.equal(dia.maximo, 200)
  assert.equal(dia.fora, 2)
  assert.deepEqual(dia.celulas, [
    { quantidade: 0, media: null }, { quantidade: 2, media: 130 },
    { quantidade: 1, media: 180 }, { quantidade: 1, media: 70 }
  ])
  assert.equal(resultado.dias[0].media, null)
  assert.equal(resultado.dias[0].quantidade, 0)
})

test('agrupa pelo dia local e mantém todos os dias em intervalos maiores que um mês', () => {
  const resultado = calcularComparativoDatas({
    periodo: { dataInicio: '2026-01-01', dataFim: '2026-02-28' },
    registros: [
      { dataHora: '2026-02-01T01:00:00Z', glicose: 123 },
      { dataHora: '2026-03-01T04:00:00Z', glicose: 999 }
    ]
  })
  assert.equal(resultado.dias.length, 59)
  assert.equal(resultado.dias[30].data, '2026-01-31')
  assert.equal(resultado.dias[30].celulas[3].media, 123)
  assert.equal(resultado.dias.reduce((soma, dia) => soma + dia.quantidade, 0), 1)
  assert.equal(resultado.matriz[0].data, '2026-02-15')
})
