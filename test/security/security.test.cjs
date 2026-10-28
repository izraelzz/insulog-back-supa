const test = require('node:test')
const assert = require('node:assert/strict')
const crypto = require('node:crypto')
const http = require('node:http')

process.env.AUTH_TOKEN_SECRET ||= crypto.randomBytes(32).toString('hex')

const app = require('../../src/app')
const { pool } = require('../../src/config/database')
const userRepository = require('../../src/repositories/userRepository')
const doctorRepository = require('../../src/repositories/doctorRepository')
const userService = require('../../src/services/userService')
const doctorService = require('../../src/services/doctorService')
const exportacaoService = require('../../src/services/exportacaoService')
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

test('injeção em quantidade de registros de insulina é rejeitada antes do banco', async t => {
  const execute = t.mock.method(pool, 'execute', async () => [[], {}])
  const payload = encodeURIComponent('1; DROP TABLE usuario; --')

  const response = await request(
    'GET',
    `/registros-insulina/usuario/42?quantidade=${payload}`,
    undefined,
    bearer(42)
  )

  assert.equal(response.statusCode, 400)
  assert.equal(execute.mock.callCount(), 0)
})

test('injeção no identificador do relatório é rejeitada antes do banco', async t => {
  const execute = t.mock.method(pool, 'execute', async () => [[], {}])

  const response = await request(
    'GET',
    `/exportacoes/relatorio?id_usuario=${encodeURIComponent('42 OR 1=1')}&dataInicio=2026-01-01&dataFim=2026-01-02`,
    undefined,
    bearer(42)
  )

  assert.equal(response.statusCode, 403)
  assert.equal(execute.mock.callCount(), 0)
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

for (const endpoint of ['cadastro', 'relatório']) {
  test(`tentativas automatizadas no ${endpoint} são limitadas`, async t => {
    t.mock.method(console, 'log', () => {})

    if (endpoint === 'cadastro') {
      t.mock.method(userService, 'createUser', async () => ({
        id: 100,
        nome: 'Usuário de teste',
        email: 'bot@example.test'
      }))
    } else {
      t.mock.method(exportacaoService, 'gerarRelatorio', async () => ({
        buffer: Buffer.from('relatorio-de-teste'),
        nomeArquivo: 'relatorio-teste.pdf',
        contentType: 'application/pdf'
      }))
    }

    const responses = []
    for (let attempt = 0; attempt < 16; attempt += 1) {
      responses.push(endpoint === 'cadastro'
        ? await request('POST', '/usuarios', {
            nome: 'Bot de teste',
            email: `bot-${attempt}@example.test`,
            senha: 'senha-ficticia',
            tipo_login: 'email',
            tipo_usuario: 'paciente'
          })
        : await request(
            'GET',
            '/exportacoes/relatorio?id_usuario=42&dataInicio=2026-01-01&dataFim=2026-01-02'
          ))
    }

    assert.ok(
      responses.some(response => response.statusCode === 429),
      `esperava bloqueio HTTP 429 em tentativas repetidas de ${endpoint}`
    )
  })
}
