const test = require('node:test')
const assert = require('node:assert/strict')
const http = require('node:http')

const app = require('../../src/app')
const userRepository = require('../../src/repositories/userRepository')
const passwordService = require('../../src/services/passwordService')

function request(method, path, body) {
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
          'Content-Length': Buffer.byteLength(payload)
        } : undefined
      }, response => {
        let responseBody = ''
        response.setEncoding('utf8')
        response.on('data', chunk => { responseBody += chunk })
        response.on('end', () => {
          server.close(() => resolve({
            statusCode: response.statusCode,
            headers: response.headers,
            body: responseBody ? JSON.parse(responseBody) : null
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

test('API responde e conclui o fluxo de login', async t => {
  const findByLoginOriginal = userRepository.findByLogin
  t.after(() => { userRepository.findByLogin = findByLoginOriginal })

  let receivedUsername
  userRepository.findByLogin = async username => {
    receivedUsername = username
    return {
      id_usuario: 42,
      nome: 'Ana',
      email: username,
      senha: passwordService.hashPassword('segredo'),
      tipo_usuario: 'paciente'
    }
  }

  const healthResponse = await request('GET', '/')
  assert.equal(healthResponse.statusCode, 200)
  assert.deepEqual(healthResponse.body, { mensagem: 'API rodando' })

  const loginResponse = await request('POST', '/login', {
    username: 'ana@example.com',
    password: 'segredo'
  })

  assert.equal(loginResponse.statusCode, 200)
  assert.deepEqual(loginResponse.body, {
    user: {
      id: 42,
      username: 'Ana',
      email: 'ana@example.com',
      tipo_usuario: 'paciente'
    }
  })
  assert.equal(receivedUsername, 'ana@example.com')
})

test('API responde ao preflight CORS', async () => {
  const response = await request('OPTIONS', '/login')

  assert.equal(response.statusCode, 204)
  assert.equal(response.headers['access-control-allow-methods'], 'GET,POST,PUT,DELETE,OPTIONS')
})