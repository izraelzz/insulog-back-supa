const test = require('node:test')
const assert = require('node:assert/strict')
const crypto = require('node:crypto')
const http = require('node:http')

process.env.AUTH_TOKEN_SECRET ||= crypto.randomBytes(32).toString('hex')

const app = require('../../src/app')
const { pool } = require('../../src/config/database')
const userRepository = require('../../src/repositories/userRepository')
const { hashPassword, verifyPassword } = require('../../src/services/passwordService')
const { issueToken } = require('../../src/services/authTokenService')

function request(method, path, body, headers = {}) {
  return new Promise((resolve, reject) => {
    const server = app.listen(0, '127.0.0.1', () => {
      const address = server.address()
      const payload = body === undefined ? undefined : JSON.stringify(body)
      const clientRequest = http.request({
        host: address.address,
        port: address.port,
        path,
        method,
        headers: payload ? {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(payload),
          ...headers
        } : headers
      }, response => {
        let responseBody = ''
        response.setEncoding('utf8')
        response.on('data', chunk => { responseBody += chunk })
        response.on('end', () => {
          server.close(() => resolve({
            statusCode: response.statusCode,
            headers: response.headers,
            body: responseBody
          }))
        })
      })

      clientRequest.on('error', error => server.close(() => reject(error)))
      if (payload) clientRequest.write(payload)
      clientRequest.end()
    })

    server.on('error', reject)
  })
}

function bearer(userId, role = 'paciente') {
  return { Authorization: `Bearer ${issueToken({ id_usuario: userId, tipo_usuario: role })}` }
}

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

test('injeção de SQL no login é tratada como dado e não autentica', async t => {
  const payload = "' OR 1=1 --"
  const execute = t.mock.method(pool, 'execute', async () => [[], {}])
  t.mock.method(console, 'log', () => {})

  const response = await request('POST', '/login', {
    username: payload,
    password: 'senha-qualquer'
  })

  assert.equal(response.statusCode, 401)
  assert.equal(execute.mock.callCount(), 1)
  const [sql, values] = execute.mock.calls[0].arguments
  assert.equal(sql.includes(payload), false)
  assert.deepEqual(values, [payload, payload])
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

test('tentativas automatizadas de login são limitadas', async t => {
  const originalFindByLogin = userRepository.findByLogin
  t.after(() => { userRepository.findByLogin = originalFindByLogin })
  userRepository.findByLogin = async () => undefined
  t.mock.method(console, 'log', () => {})

  const responses = []
  for (let attempt = 0; attempt < 16; attempt += 1) {
    responses.push(await request('POST', '/login', {
      username: 'bot@example.test',
      password: 'senha-incorreta'
    }))
  }

  assert.ok(
    responses.some(response => response.statusCode === 429),
    'esperava bloqueio HTTP 429 após tentativas repetidas de login'
  )
  const blockedResponse = responses.find(response => response.statusCode === 429)
  assert.ok(Number(blockedResponse.headers['retry-after']) > 0)
})
