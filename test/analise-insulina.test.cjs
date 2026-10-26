const assert = require('node:assert/strict')
const test = require('node:test')
const { calcularAnaliseInsulina } = require('../src/reports/analiseInsulina')
const { montarDadosRelatorio } = require('../src/reports/relatorioData')

test('soma aplicações da fixture e usa dias com dados inclusive sem aplicação', () => {
  const report = montarDadosRelatorio(require('./fixtures/relatorio-exemplo.json'), { dataInicio: '2026-08-01', dataFim: '2026-08-31' })
  const analise = calcularAnaliseInsulina(report)
  assert.equal(analise.quantidade, 7)
  assert.equal(analise.total, 48.5)
  assert.equal(analise.dias, 8)
  assert.equal(analise.media, 48.5 / 8)
  assert.equal(analise.categorias.basal.total, 18)
  assert.equal(analise.categorias.rapida.total, 30.5)
  assert.equal(analise.diasSemBasal, 7)
  assert.equal(analise.altosComInsulina, 3)
  assert.equal(analise.altosSemInsulina, 0)
})

test('preserva tipos desconhecidos, não infere correção e usa o dia local', () => {
  const analise = calcularAnaliseInsulina({
    periodo: { dataInicio: '2026-08-01', dataFim: '2026-08-01' },
    registros: [
      { dataHora: '2026-08-02T01:00:00Z', glicose: 220, observacao: 'Correção aplicada', insulinas: [{ tipo: 'Desconhecido', unidades: 2.5 }, { tipo: 'Ultrarrápida', unidades: 3 }] },
      { dataHora: '2026-08-01 12:00:00', glicose: 181, insulinas: [] },
      { dataHora: '2026-08-02T04:00:00Z', glicose: 250, insulinas: [{ tipo: 'Basal', unidades: 99 }] }
    ]
  })
  assert.equal(analise.total, 5.5)
  assert.equal(analise.categorias.outros.total, 2.5)
  assert.equal(analise.categorias.rapida.total, 3)
  assert.equal(analise.diasSemBasal, 1)
  assert.equal(analise.altosSemInsulina, 1)
})

test('sem aplicações produz indicadores zerados sem divisão por zero', () => {
  const analise = calcularAnaliseInsulina({ periodo: { dataInicio: '2026-08-01', dataFim: '2026-08-31' }, registros: [] })
  assert.equal(analise.total, 0)
  assert.equal(analise.media, 0)
  assert.equal(analise.categorias.basal.media, 0)
  assert.equal(analise.quantidade, 0)
})
