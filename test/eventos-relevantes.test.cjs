const assert = require('node:assert/strict')
const test = require('node:test')
const { calcularEventosRelevantes } = require('../src/reports/eventosRelevantes')

test('seleciona limites corretos e mantém contexto, observação e ordem cronológica local', () => {
  const resultado = calcularEventosRelevantes({
    periodo: { dataInicio: '2026-08-01', dataFim: '2026-08-02' },
    registros: [
      { glicose: 251, dataHora: '2026-08-03T01:30:00Z', periodo: 'Noturno', observacao: 'Texto original' },
      { glicose: 250, dataHora: '2026-08-01 18:00:00' },
      { glicose: 69, dataHora: '2026-08-01 06:00:00' },
      { glicose: 54, dataHora: '2026-08-01 07:00:00' },
      { glicose: 70, dataHora: '2026-08-01 08:00:00' },
      { glicose: 180, dataHora: '2026-08-01 09:00:00' },
      { glicose: 400, dataHora: '2026-08-03T04:00:00Z' }
    ]
  })
  assert.deepEqual(resultado.eventos.map(item => item.glicose), [69, 54, 250, 251])
  assert.equal(resultado.eventos[2].evento, 'Hiperglicemia')
  assert.equal(resultado.eventos[3].evento, 'Hiperglicemia importante')
  assert.equal(resultado.eventos[3].data, '2026-08-02')
  assert.equal(resultado.eventos[3].horario, '22:30')
  assert.equal(resultado.eventos[3].observacao, 'Texto original')
  assert.equal(resultado.eventos[3].periodo, 'Noturno')
  assert.equal(resultado.diasBaixos, 1)
  assert.equal(resultado.alvo, 2)
  assert.equal(resultado.total, 6)
  assert.equal(resultado.concentracao[0].quantidade, 2)
})

test('não inventa predominância quando há empate ou nenhum evento', () => {
  const periodo = { dataInicio: '2026-08-01', dataFim: '2026-08-01' }
  const empate = calcularEventosRelevantes({ periodo, registros: [
    { glicose: 190, dataHora: '2026-08-01 06:00:00' },
    { glicose: 190, dataHora: '2026-08-01 18:00:00' }
  ] })
  assert.equal(empate.concentracao.length, 2)
  const vazio = calcularEventosRelevantes({ periodo, registros: [{ glicose: 100, dataHora: '2026-08-01 06:00:00' }] })
  assert.deepEqual(vazio.eventos, [])
  assert.deepEqual(vazio.concentracao, [])
})
