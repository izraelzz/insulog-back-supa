const assert = require('node:assert/strict')
const test = require('node:test')
const { calcularPadraoGlicose } = require('../src/reports/padraoGlicose')

function calcular(registros, dataInicio = '2026-08-01', dataFim = '2026-08-31') {
  return calcularPadraoGlicose({ periodo: { dataInicio, dataFim }, registros })
}

test('janela contém exatamente os últimos 14 dias inclusive, sem depender da data atual', () => {
  const padrao = calcular([
    { dataHora: '2026-08-17 23:59:00', glicose: 40 },
    { dataHora: '2026-08-18 00:00:00', glicose: 100 },
    { dataHora: '2026-08-31 23:59:00', glicose: 200 },
    { dataHora: '2026-09-01 00:00:00', glicose: 300 }
  ])
  assert.equal(padrao.inicio, '2026-08-18')
  assert.deepEqual(padrao.pontos.map(ponto => ponto.glicose), [100, 200])
})

test('respeita períodos menores e janela vazia sem inventar registros ou médias', () => {
  const padrao = calcular([{ dataHora: '2026-08-19 12:00:00', glicose: 100 }], '2026-08-20', '2026-08-22')
  assert.equal(padrao.inicio, '2026-08-20')
  assert.deepEqual(padrao.pontos, [])
  assert.deepEqual(padrao.medias, [])
})

test('preserva horários locais e converte timestamps com fuso antes de filtrar e agrupar', () => {
  const padrao = calcular([
    { dataHora: '2026-08-18T02:59:00Z', glicose: 300 },
    { dataHora: '2026-08-19T00:30:00Z', glicose: 100 },
    { dataHora: '2026-08-20 21:00:00', glicose: 200 },
    { dataHora: '2026-08-20T09:15:00-03:00', glicose: 90 }
  ])
  assert.equal(padrao.pontos.length, 3)
  assert.equal(padrao.pontos[2].data, '2026-08-18')
  assert.deepEqual(padrao.medias, [{ horario: 9.25, glicose: 90 }, { horario: 21.25, glicose: 150 }])
})

test('janela atravessa mês e ano corretamente', () => {
  assert.equal(calcular([], '2025-12-01', '2026-01-05').inicio, '2025-12-23')
})
