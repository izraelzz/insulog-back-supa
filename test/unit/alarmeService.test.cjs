const { test } = require('node:test')
const assert = require('node:assert/strict')
const loadService = require('../helpers/load-service.cjs')
const valid = { id_usuario: 42, data_hora: '2026-09-11 08:00:00', dias_semana: ['SEG'] }
const setup = (t, repository = {}) => loadService(t, 'alarmeService', { '../repositories/alarmeRepository': repository })

test('alarme normaliza, ordena e remove dias repetidos e aplica padroes booleanos', async t => {
  const create = t.mock.fn(async data => ({ id_alarme: 1, ...data }))
  const service = setup(t, { create })
  for (const days of [[' sex ', 'seg', 'SEX', ''], ' sex, seg, SEX, ']) {
    const result = await service.createAlarme({ ...valid, dias_semana: days })
    assert.deepEqual(result, {
      ...valid, id_alarme: 1, id_periodo: undefined, id_registro: undefined,
      dias_semana: ['SEG', 'SEX'], ativo: true, tem_som: true, tem_vibracao: true
    })
  }
  assert.equal(create.mock.callCount(), 2)
})

test('alarme rejeita campos obrigatorios ausentes e dias invalidos sem persistir', async t => {
  const service = setup(t)
  for (const data of [{ ...valid, id_usuario: null }, { ...valid, data_hora: '' }]) {
    await assert.rejects(service.createAlarme(data), { statusCode: 400, message: 'Todos os campos sao obrigatorios' })
  }
  for (const days of [undefined, null, [], '', ['SEG', 'INVALIDO'], 123]) {
    await assert.rejects(service.createAlarme({ ...valid, dias_semana: days }), {
      statusCode: 400, message: /dias_semana deve conter/
    })
  }
})

test('alarme converte representacoes booleanas sem confundir false com ausencia', async t => {
  const service = setup(t, { create: async data => data })
  for (const [input, expected] of [[true, true], [1, true], ['1', true], ['true', true], [false, false], [0, false], ['0', false], ['false', false]]) {
    const result = await service.createAlarme({ ...valid, ativo: input, tem_som: input, tem_vibracao: input })
    assert.equal(result.ativo, expected)
    assert.equal(result.tem_som, expected)
    assert.equal(result.tem_vibracao, expected)
  }
})

test('alarme rejeita booleanos invalidos antes de persistir', async t => {
  const service = setup(t)
  for (const field of ['ativo', 'tem_som', 'tem_vibracao']) {
    await assert.rejects(service.createAlarme({ ...valid, [field]: 'talvez' }), {
      statusCode: 400, message: `${field} deve ser um valor booleano`
    })
  }
})

test('edicao preserva dias e opcoes omitidos, mas permite desativar explicitamente', async t => {
  const existing = { dias_semana: ['TER'], ativo: true, tem_som: false, tem_vibracao: true }
  const update = t.mock.fn(async (id, data) => ({ id_alarme: id, ...data }))
  const service = setup(t, { findById: async () => existing, update })
  const { dias_semana, ...data } = valid
  const result = await service.updateAlarme(5, { ...data, ativo: false })
  assert.deepEqual(result.dias_semana, ['TER'])
  assert.equal(result.ativo, false)
  assert.equal(result.tem_som, false)
  assert.equal(result.tem_vibracao, true)
  assert.equal(update.mock.calls[0].arguments[0], 5)
})

test('consulta exige ID inteiro positivo e converte ID textual', async t => {
  const find = t.mock.fn(async () => [])
  const service = setup(t, { findByUsuarioId: find })
  for (const id of [0, -1, 1.5, 'abc', undefined]) {
    await assert.rejects(service.getAlarmesByUsuarioId(id), { statusCode: 400 })
  }
  assert.equal(find.mock.callCount(), 0)
  assert.deepEqual(await service.getAlarmesByUsuarioId('42'), [])
  assert.deepEqual(find.mock.calls[0].arguments, [42])
})

test('alarme inexistente retorna 404 em consulta, edicao e exclusao', async t => {
  const service = setup(t, { findById: async () => null })
  for (const action of [() => service.getAlarmeById(5), () => service.updateAlarme(5, valid), () => service.deleteById(5)]) {
    await assert.rejects(action(), { statusCode: 404, message: 'Alarme nao encontrado' })
  }
})
