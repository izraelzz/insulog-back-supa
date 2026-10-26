const assert = require('node:assert/strict')
const test = require('node:test')
const { prepararRegistrosCompletos } = require('../src/reports/registrosCompletos')
const { montarDadosRelatorio } = require('../src/reports/relatorioData')

test('exporta todas as medições e preserva cada par dose/tipo das aplicações', () => {
  const report = montarDadosRelatorio(require('./fixtures/relatorio-exemplo.json'), { dataInicio: '2026-08-01', dataFim: '2026-08-31' })
  const linhas = prepararRegistrosCompletos(report)
  assert.equal(linhas.length, 11)
  const aplicacoes = linhas.filter(linha => linha[0] === '02/08/2026 21:08')
  assert.deepEqual(aplicacoes.map(linha => linha.slice(4, 6)), [['4 UI', 'Rápida'], ['18 UI', 'Basal']])
  assert.equal(aplicacoes[0][6], 'Jantar com maior quantidade de carboidratos')
  assert.equal(aplicacoes[1][6], 'Aplicação adicional do mesmo registro.')
  assert.equal(linhas[0][4], '-')
  assert.equal(linhas[0][6], 'Acordou com tremor e suor frio')
  assert.equal(report.registros.length, 10)
})

test('ordena horários locais sem alterar registros e preserva observações longas', () => {
  const texto = 'Observação completa. '.repeat(1000)
  const registros = [
    { dataHora: '2026-08-02T01:00:00Z', glicose: 200, classificacao: 'Alto', insulinas: [], observacao: texto },
    { dataHora: '2026-08-01 06:00:00', glicose: 100, classificacao: 'Faixa alvo', insulinas: [] }
  ]
  const linhas = prepararRegistrosCompletos({ registros })
  assert.equal(linhas[0][0], '01/08/2026 06:00')
  assert.equal(linhas[1][0], '01/08/2026 22:00')
  assert.equal(linhas[1][6], texto)
  assert.equal(registros[0].glicose, 200)
})
