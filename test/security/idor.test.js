const test = require('node:test')
const assert = require('node:assert/strict')

const { request, bearer } = require('./test-utils.cjs')
const { pool } = require('../../src/config/database')
const userRepository = require('../../src/repositories/userRepository')
const doctorRepository = require('../../src/repositories/doctorRepository')
const exportacaoService = require('../../src/services/exportacaoService')

test('IDOR: usuário não acessa perfil de outro usuário', async () => {
  const response = await request('GET', '/usuarios/43', undefined, bearer(42))

  assert.equal(response.statusCode, 403)
})

test('IDOR: usuário não acessa registro pertencente a outro usuário', async t => {
  const execute = t.mock.method(pool, 'execute', async () => [[{ id_usuario: 43 }], {}])

  const response = await request('GET', '/registros-glicose/777', undefined, bearer(42))

  assert.equal(response.statusCode, 404)
  assert.equal(execute.mock.callCount(), 1)
})

const userOwnedResources = [
  {
    name: 'alarme',
    path: '/alarmes/501',
    collectionPath: '/alarmes',
    createBody: { id_usuario: 43, data_hora: '2026-01-01 10:00:00' },
    updateBody: { id_usuario: 43, data_hora: '2026-01-01 10:00:00' }
  },
  {
    name: 'configuração',
    path: '/configuracoes/502',
    collectionPath: '/configuracoes',
    createBody: { id_usuario: 43 },
    updateBody: { id_usuario: 43 }
  },
  {
    name: 'exportação',
    path: '/exportacoes/503',
    collectionPath: '/exportacoes',
    createBody: { id_usuario: 43 },
    updateBody: { id_usuario: 43 }
  }
]

for (const resource of userOwnedResources) {
  test(`IDOR: usuário não lê ${resource.name} de outro usuário`, async t => {
    const execute = t.mock.method(pool, 'execute', async () => [[{ id_usuario: 43 }], {}])

    const response = await request('GET', resource.path, undefined, bearer(42))

    assert.equal(response.statusCode, 404)
    assert.equal(execute.mock.callCount(), 1)
  })

  test(`IDOR: usuário não cria ${resource.name} para outra conta`, async t => {
    const execute = t.mock.method(pool, 'execute', async () => [[], {}])

    const response = await request('POST', resource.collectionPath, resource.createBody, bearer(42))

    assert.equal(response.statusCode, 403)
    assert.equal(execute.mock.callCount(), 0)
  })

  test(`IDOR: usuário não transfere ${resource.name} para outra conta`, async t => {
    const execute = t.mock.method(pool, 'execute', async () => [[{ id_usuario: 42 }], {}])

    const response = await request('PUT', resource.path, resource.updateBody, bearer(42))

    assert.equal(response.statusCode, 403)
    assert.equal(execute.mock.callCount(), 1)
  })

  test(`IDOR: usuário não exclui ${resource.name} de outra conta`, async t => {
    const execute = t.mock.method(pool, 'execute', async () => [[{ id_usuario: 43 }], {}])

    const response = await request('DELETE', resource.path, undefined, bearer(42))

    assert.equal(response.statusCode, 404)
    assert.equal(execute.mock.callCount(), 1)
  })
}

test('IDOR: glicemia não pode ser criada nem transferida para outra conta', async t => {
  const execute = t.mock.method(pool, 'execute', async () => [[{ id_usuario: 42 }], {}])

  const create = await request('POST', '/registros-glicose', {
    id_usuario: 43,
    nivel_glicose: 100,
    id_periodo: 1
  }, bearer(42))
  assert.equal(create.statusCode, 403)
  assert.equal(execute.mock.callCount(), 0)

  const update = await request('PUT', '/registros-glicose/777', {
    id_usuario: 43
  }, bearer(42))
  assert.equal(update.statusCode, 403)
  assert.equal(execute.mock.callCount(), 1)
})

test('IDOR: insulina não pode referenciar glicemia pertencente a outro usuário', async t => {
  const execute = t.mock.method(pool, 'execute', async () => [[{ id_usuario: 43 }], {}])

  const response = await request('POST', '/registros-insulina', {
    id_registro: 777,
    id_tipo_insulina: 1,
    unidade_insulina: 2
  }, bearer(42))

  assert.equal(response.statusCode, 404)
  assert.equal(execute.mock.callCount(), 1)
})

test('IDOR: médico não consulta paciente fora de seus vínculos', async t => {
  const findPatient = t.mock.method(doctorRepository, 'findPatientByDoctor', async () => undefined)
  const doctorToken = bearer(7, 'medico')

  const profile = await request('GET', '/medicos/pacientes/99', undefined, doctorToken)
  const records = await request('GET', '/medicos/pacientes/99/registros', undefined, doctorToken)

  assert.equal(profile.statusCode, 404)
  assert.equal(records.statusCode, 404)
  assert.deepEqual(findPatient.mock.calls.map(call => call.arguments), [[7, 99], [7, 99]])
})

test('IDOR: relatório não é disponibilizado sem autenticação', async t => {
  t.mock.method(exportacaoService, 'gerarRelatorio', async () => ({
    buffer: Buffer.from('dados-medicos-de-teste'),
    nomeArquivo: 'relatorio-teste.pdf',
    contentType: 'application/pdf'
  }))

  const response = await request(
    'GET',
    '/exportacoes/relatorio?id_usuario=42&dataInicio=2026-01-01&dataFim=2026-01-02'
  )

  assert.equal(response.statusCode, 401)
})

test('IDOR: usuário não gera relatório de outra conta', async t => {
  const generate = t.mock.method(exportacaoService, 'gerarRelatorio', async () => {
    throw new Error('relatório de outro usuário não deveria ser gerado')
  })

  const response = await request(
    'GET',
    '/exportacoes/relatorio?id_usuario=43&dataInicio=2026-01-01&dataFim=2026-01-02',
    undefined,
    bearer(42)
  )

  assert.equal(response.statusCode, 403)
  assert.equal(generate.mock.callCount(), 0)
})
