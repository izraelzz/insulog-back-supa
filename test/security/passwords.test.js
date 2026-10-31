const test = require('node:test')
const assert = require('node:assert/strict')

const { request } = require('./test-utils.cjs')
const userRepository = require('../../src/repositories/userRepository')
const userService = require('../../src/services/userService')
const { hashPassword, verifyPassword } = require('../../src/services/passwordService')

test('senhas são armazenadas com hash e salt individual', () => {
  const password = 'senha-de-teste-nao-real'
  const firstHash = hashPassword(password)
  const secondHash = hashPassword(password)

  assert.match(firstHash, /^scrypt:[a-f0-9]{32}:[a-f0-9]{128}$/)
  assert.notEqual(firstHash, password)
  assert.notEqual(firstHash, secondHash)
  assert.equal(verifyPassword(password, firstHash), true)
  assert.equal(verifyPassword('senha-incorreta', firstHash), false)
})

test('senhas em texto puro não são aceitas como credenciais válidas', () => {
  assert.equal(verifyPassword('senha-legada', 'senha-legada'), false)
})

test('cadastro e alteração de usuário persistem somente hash da senha', async t => {
  const password = 'senha-cadastro-ficticia'
  const hashPasswordFn = t.mock.method(
    require('../../src/services/passwordService'),
    'hashPassword',
    () => 'scrypt:salt:hash-ficticio'
  )
  const create = t.mock.method(userRepository, 'create', async user => user)
  t.mock.method(userRepository, 'findByEmail', async () => undefined)

  await userService.createUser({
    nome: 'Paciente de teste',
    email: 'novo@example.test',
    senha: password,
    tipo_login: 'email',
    tipo_usuario: 'paciente'
  })

  assert.equal(create.mock.calls[0].arguments[0].senha, 'scrypt:salt:hash-ficticio')
  assert.notEqual(create.mock.calls[0].arguments[0].senha, password)

  const update = t.mock.method(userRepository, 'update', async (id, user) => user)
  await userService.updateUser(42, {
    nome: 'Paciente de teste',
    email: 'novo@example.test',
    senha: password,
    tipo_login: 'email',
    tipo_usuario: 'paciente'
  })

  assert.equal(update.mock.calls[0].arguments[1].senha, 'scrypt:salt:hash-ficticio')
  assert.notEqual(update.mock.calls[0].arguments[1].senha, password)
  assert.equal(hashPasswordFn.mock.callCount(), 2)
})

test('respostas de login não expõem senha ou hash', async t => {
  const originalFindByLogin = userRepository.findByLogin
  t.after(() => { userRepository.findByLogin = originalFindByLogin })
  userRepository.findByLogin = async username => ({
    id_usuario: 42,
    nome: 'Paciente de teste',
    email: username,
    senha: hashPassword('senha-de-teste-nao-real'),
    tipo_usuario: 'paciente'
  })
  t.mock.method(console, 'log', () => {})

  const response = await request('POST', '/login', {
    username: 'paciente@example.test',
    password: 'senha-de-teste-nao-real'
  })

  assert.equal(response.statusCode, 200)
  assert.equal(response.body.includes('senha-de-teste-nao-real'), false)
  assert.equal(response.body.includes('scrypt:'), false)
})
