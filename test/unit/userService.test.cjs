const { test } = require('node:test')
const assert = require('node:assert/strict')
const loadService = require('../helpers/load-service.cjs')

const valid = { nome: 'Ana', email: 'ana@example.com', senha: 'ficticia', tipo_login: 'email', tipo_usuario: 'paciente' }
function setup(t, repository = {}, password = {}) {
  t.mock.method(console, 'log', () => {})
  return loadService(t, 'userService', {
    '../repositories/userRepository': repository, './passwordService': password
  })
}

test('cadastro exige todos os campos obrigatorios antes de acessar o banco', async t => {
  const service = setup(t)
  for (const field of Object.keys(valid)) {
    await assert.rejects(service.createUser({ ...valid, [field]: '' }), {
      statusCode: 400, message: 'Todos os campos sao obrigatorios'
    })
  }
})

test('cadastro rejeita tipo de usuario desconhecido e medico sem CRM', async t => {
  const service = setup(t)
  await assert.rejects(service.createUser({ ...valid, tipo_usuario: 'admin' }), {
    statusCode: 400, message: 'tipo_usuario invalido'
  })
  await assert.rejects(service.createUser({ ...valid, tipo_usuario: 'MEDICO' }), {
    statusCode: 400, message: 'crm e obrigatorio para usuarios do tipo medico'
  })
})

test('email duplicado retorna 409 antes de gerar hash ou salvar', async t => {
  const find = t.mock.fn(async () => ({ id_usuario: 7 }))
  const service = setup(t, { findByEmail: find })
  await assert.rejects(service.createUser(valid), { statusCode: 409 })
  assert.deepEqual(find.mock.calls[0].arguments, ['ana@example.com'])
})

for (const type of ['paciente', 'MEDICO']) {
  test(`cadastro ${type} envia senha protegida e tipo normalizado ao repositorio`, async t => {
    const created = { id_usuario: 42 }
    const create = t.mock.fn(async () => created)
    const hash = t.mock.fn(() => 'hash-ficticio')
    const service = setup(t, { findByEmail: async () => null, create }, { hashPassword: hash })
    const data = { ...valid, tipo_usuario: type, crm: type === 'MEDICO' ? '12345' : undefined }
    assert.equal(await service.createUser(data), created)
    assert.deepEqual(hash.mock.calls[0].arguments, ['ficticia'])
    assert.deepEqual(create.mock.calls[0].arguments, [
      { ...data, senha: 'hash-ficticio', id_medico: undefined }, type.toLowerCase()
    ])
    assert.equal(create.mock.callCount(), 1)
    assert.equal(data.senha, 'ficticia')
  })
}
