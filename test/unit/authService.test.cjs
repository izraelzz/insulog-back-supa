const { test } = require('node:test')
const assert = require('node:assert/strict')
const loadService = require('../helpers/load-service.cjs')

function setup(t, repository = {}, password = {}) {
  return loadService(t, 'authService', {
    '../repositories/userRepository': repository,
    './passwordService': password
  })
}

test('login exige usuario e senha antes de consultar o repositorio', async t => {
  const service = setup(t)
  for (const credentials of [{}, { username: 'ana' }, { password: 'senha' }, { username: '', password: 'senha' }]) {
    await assert.rejects(service.login(credentials), {
      statusCode: 400, message: 'Username e password sao obrigatorios.'
    })
  }
})

test('usuario inexistente retorna 401 sem verificar senha', async t => {
  const service = setup(t, { findByLogin: async () => null })
  await assert.rejects(service.login({ username: 'ana', password: 'senha' }), {
    statusCode: 401, message: 'Usuario ou senha invalidos.'
  })
})

test('senha incorreta retorna 401', async t => {
  const verify = t.mock.fn(() => false)
  const service = setup(t, { findByLogin: async () => ({ senha: 'hash-ficticio' }) }, { verifyPassword: verify })
  await assert.rejects(service.login({ username: 'ana', password: 'errada' }), { statusCode: 401 })
  assert.deepEqual(verify.mock.calls[0].arguments, ['errada', 'hash-ficticio'])
})

test('login valido retorna apenas dados publicos do usuario', async t => {
  const find = t.mock.fn(async () => ({
    id_usuario: 42, nome: 'Ana', email: 'ana@example.com', tipo_usuario: 'paciente', senha: 'hash-ficticio', crm: 'privado'
  }))
  const verify = t.mock.fn(() => true)
  const service = setup(t, { findByLogin: find }, { verifyPassword: verify })
  const result = await service.login({ username: 'ana@example.com', password: 'senha' })
  assert.deepEqual(result, { user: { id: 42, username: 'Ana', email: 'ana@example.com', tipo_usuario: 'paciente' } })
  assert.deepEqual(find.mock.calls[0].arguments, ['ana@example.com'])
  assert.deepEqual(verify.mock.calls[0].arguments, ['senha', 'hash-ficticio'])
  assert.equal(find.mock.callCount(), 1)
  assert.equal(verify.mock.callCount(), 1)
})

test('falha de consulta nao e transformada em login bem-sucedido', async t => {
  const failure = new Error('Falha simulada')
  const service = setup(t, { findByLogin: async () => { throw failure } })
  await assert.rejects(service.login({ username: 'ana', password: 'senha' }), error => error === failure)
})
