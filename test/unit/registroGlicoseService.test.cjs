const { test } = require('node:test')
const assert = require('node:assert/strict')
const loadService = require('../helpers/load-service.cjs')
const valid = { id_usuario: 42, nivel_glicose: 100, id_periodo: 1, data_hora: '2026-09-11 08:00:00', observacao: 'Teste' }
const setup = (t, repository = {}, users = {}) => loadService(t, 'registroGlicoseService', {
  '../repositories/registroGlicoseRepository': repository,
  '../repositories/userRepository': users
})
const row = (id, value, date = '2026-09-11 08:00:00') => ({ id_registro: id, nivel_glicose: value, data_hora: date, periodo: 'Jejum' })

test('historico classifica limites 70/125, converte decimais e calcula totais e media', async t => {
  const records = [row(1, '69'), row(2, '70'), row(3, '125'), row(4, '126'), row(5, '100.5')]
  const find = t.mock.fn(async () => records)
  const service = setup(t, { findByUserIdAndPeriod: find })
  const result = await service.getHistorico(42, '2026-09-01', '2026-09-30')
  assert.deepEqual(result, {
    media: 98, totalBaixos: 1, totalNormais: 3, totalAlertas: 1,
    statusMedia: 1, statusMediaDescricao: 'Normal',
    registros: [
      { id: 1, horaDoRegistro: valid.data_hora, periodo: 'Jejum', nivelGlicose: 69, status: 0, statusDescricao: 'Baixa' },
      { id: 2, horaDoRegistro: valid.data_hora, periodo: 'Jejum', nivelGlicose: 70, status: 1, statusDescricao: 'Normal' },
      { id: 3, horaDoRegistro: valid.data_hora, periodo: 'Jejum', nivelGlicose: 125, status: 1, statusDescricao: 'Normal' },
      { id: 4, horaDoRegistro: valid.data_hora, periodo: 'Jejum', nivelGlicose: 126, status: 2, statusDescricao: 'Alta' },
      { id: 5, horaDoRegistro: valid.data_hora, periodo: 'Jejum', nivelGlicose: 101, status: 1, statusDescricao: 'Normal' }
    ]
  })
  assert.deepEqual(find.mock.calls[0].arguments, [42, '2026-09-01', '2026-09-30', 'ASC'])
  assert.equal(records[4].nivel_glicose, '100.5', 'nao modifica os dados recebidos')
})

test('historico vazio retorna totais zerados sem NaN', async t => {
  const service = setup(t, { findByUserIdAndPeriod: async () => [] })
  assert.deepEqual(await service.getHistorico(42, '2026-09-11', '2026-09-11'), {
    media: 0, totalBaixos: 0, totalNormais: 0, totalAlertas: 0,
    statusMedia: 1, statusMediaDescricao: 'Normal', registros: []
  })
})

test('historico rejeita usuario ausente e intervalo ausente, invalido ou invertido', async t => {
  const service = setup(t)
  for (const args of [
    [null, '2026-09-01', '2026-09-30'], [42, '', '2026-09-30'],
    [42, '2026-09-01', ''], [42, 'invalida', '2026-09-30'],
    [42, '2026-09-01', 'invalida'], [42, '2026-09-30', '2026-09-01']
  ]) {
    await assert.rejects(service.getHistorico(...args), { statusCode: 400 })
  }
})

test('dashboard calcula media somente do dia atual, com relogio controlado', async t => {
  t.mock.timers.enable({ apis: ['Date'], now: new Date(2026, 8, 11, 12).getTime() })
  const service = setup(t, { findByUserIdAndPeriod: async () => [
    row(1, '100', '2026-09-11 08:00:00'),
    row(2, '151', new Date(2026, 8, 11, 10)),
    row(3, '300', '2026-09-10T08:00:00')
  ] })
  const result = await service.getDashboardDados(42, '2026-09-01', '2026-09-30')
  assert.equal(result.mediaDiaria, 126)
  assert.equal(result.statusMediaDiaria, 2)
  assert.equal(result.statusMediaDiariaDescricao, 'Alta')
  assert.equal(result.registros.length, 3)
})

test('consulta por login resolve usuario, normaliza limite e formata resultado', async t => {
  const findUser = t.mock.fn(async () => ({ id_usuario: 42 }))
  const findRecords = t.mock.fn(async () => [row(1, '100')])
  const service = setup(t, { findByUserId: findRecords }, { findByLogin: findUser })
  const result = await service.getRegistrosGlicoseByUserId('ana@example.com', '2')
  assert.deepEqual(findUser.mock.calls[0].arguments, ['ana@example.com'])
  assert.deepEqual(findRecords.mock.calls[0].arguments, [42, 2])
  assert.equal(result[0].nivelGlicose, 100)
})

test('consulta por ID dispensa busca de usuario e aceita limite omitido', async t => {
  const find = t.mock.fn(async () => [row(1, 100)])
  const service = setup(t, { findByUserId: find })
  for (const limit of [undefined, null, '']) {
    await service.getRegistrosGlicoseByUserId('42', limit)
  }
  for (const call of find.mock.calls) assert.deepEqual(call.arguments, [42, undefined])
})

test('consulta rejeita limites invalidos antes de consultar registros', async t => {
  const service = setup(t)
  for (const limit of [0, -1, 1.5, 'abc']) {
    await assert.rejects(service.getRegistrosGlicoseByUserId(42, limit), {
      statusCode: 400, message: 'Quantidade deve ser um numero inteiro maior que zero'
    })
  }
})

test('consulta por login inexistente retorna 400', async t => {
  const service = setup(t, {}, { findByLogin: async () => null })
  await assert.rejects(service.getRegistrosGlicoseByUserId('ausente'), { statusCode: 400, message: 'Usuario nao encontrado' })
})

test('consulta sem registros retorna 404', async t => {
  const service = setup(t, { findByUserId: async () => [] })
  await assert.rejects(service.getRegistrosGlicoseByUserId(42), { statusCode: 404 })
})

test('criacao simples ignora insulina zerada e lembrete desabilitado', async t => {
  const create = t.mock.fn(async () => ({ id_registro: 7 }))
  const detail = { ...valid, id_registro: 7 }
  const find = t.mock.fn(async () => detail)
  const service = setup(t, { create, findDetalhadoById: find })
  const result = await service.createRegistroGlicose({
    ...valid, insulina: { id_tipo_insulina: 0, unidade_insulina: 0 }, lembrete: { criar: false }
  })
  assert.equal(result, detail)
  assert.deepEqual(create.mock.calls[0].arguments, [valid])
  assert.deepEqual(find.mock.calls[0].arguments, [7])
})

test('criacao completa prepara insulina e padroes de lembrete', async t => {
  const create = t.mock.fn(async data => data)
  const service = setup(t, { createCompleto: create })
  const insulina = { id_tipo_insulina: 2, unidade_insulina: 5 }
  const result = await service.createRegistroGlicose({
    ...valid, insulina, lembrete: { criar: true, data_hora: '2026-09-11 10:00:00' }
  })
  assert.deepEqual(result, {
    glicose: valid, insulina,
    lembrete: { data_hora: '2026-09-11 10:00:00', id_periodo: 1,
      dias_semana: ['SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SAB', 'DOM'], tem_som: false, tem_vibracao: true }
  })
  assert.equal(create.mock.callCount(), 1)
})

test('criacao rejeita glicose, insulina ou lembrete incompletos sem persistir', async t => {
  const service = setup(t)
  for (const data of [
    { ...valid, id_usuario: null }, { ...valid, nivel_glicose: undefined }, { ...valid, id_periodo: 0 },
    { ...valid, insulina: { id_tipo_insulina: 2 } },
    { ...valid, insulina: { unidade_insulina: 5 } },
    { ...valid, lembrete: { criar: true } }
  ]) {
    await assert.rejects(service.createRegistroGlicose(data), { statusCode: 400 })
  }
})

test('edicao parcial preserva glicose anterior e distingue remover de omitir insulina/lembrete', async t => {
  const update = t.mock.fn(async (id, data) => data)
  const service = setup(t, { findById: async () => valid, updateCompleto: update })
  assert.deepEqual(await service.updateRegistroGlicose(7, { nivel_glicose: 120 }), {
    glicose: { ...valid, nivel_glicose: 120 }, insulina: undefined, lembrete: undefined
  })
  assert.deepEqual(await service.updateRegistroGlicose(7, { insulina: null, lembrete: null }), {
    glicose: valid, insulina: null, lembrete: null
  })
  assert.equal(update.mock.calls[0].arguments[0], 7)
  assert.equal(valid.nivel_glicose, 100)
})

test('registro inexistente impede edicao e exclusao', async t => {
  const service = setup(t, { findById: async () => null })
  await assert.rejects(service.updateRegistroGlicose(7, valid), { statusCode: 404 })
  await assert.rejects(service.deleteById(7), { statusCode: 404 })
})
