const test = require('node:test')
const assert = require('node:assert/strict')
const crypto = require('node:crypto')
const http = require('node:http')

process.env.AUTH_TOKEN_SECRET ||= crypto.randomBytes(32).toString('hex')

const app = require('../../src/app')
const userRepository = require('../../src/repositories/userRepository')
const passwordService = require('../../src/services/passwordService')
const userService = require('../../src/services/userService')
const doctorService = require('../../src/services/doctorService')
const patientService = require('../../src/services/patientService')
const exportacaoService = require('../../src/services/exportacaoService')
const { issueToken, verifyToken } = require('../../src/services/authTokenService')

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
        } : Object.keys(headers).length ? headers : undefined
      }, response => {
        let responseBody = ''
        response.setEncoding('utf8')
        response.on('data', chunk => { responseBody += chunk })
        response.on('end', () => {
          const decodedBody = responseBodyForTest(response.headers, responseBody)
          server.close(() => resolve({
            statusCode: response.statusCode,
            headers: response.headers,
            body: decodedBody
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

function responseBodyForTest(headers, body) {
  if (!body) return null
  return String(headers['content-type'] || '').includes('application/json')
    ? JSON.parse(body)
    : body
}

test('API responde e conclui o fluxo de login', async t => {
  const findByLoginOriginal = userRepository.findByLogin
  t.after(() => { userRepository.findByLogin = findByLoginOriginal })

  let receivedUsername
  const logged = []
  t.mock.method(console, 'log', (...args) => logged.push(args))
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
      tipo_usuario: 'paciente',
      token: loginResponse.body.user.token
    }
  })
  assert.deepEqual(verifyToken(loginResponse.body.user.token), {
    userId: 42,
    role: 'paciente'
  })
  const output = JSON.stringify(logged)
  assert.equal(output.includes('segredo'), false)
  assert.equal(output.includes(loginResponse.body.user.token), false)
  assert.equal(receivedUsername, 'ana@example.com')
})

test('API responde ao preflight CORS e permite o cabeçalho Bearer', async () => {
  const response = await request('OPTIONS', '/login')

  assert.equal(response.statusCode, 204)
  assert.equal(response.headers['access-control-allow-methods'], 'GET,POST,PUT,DELETE,OPTIONS')
  assert.equal(response.headers['access-control-allow-headers'], 'Content-Type, Authorization')
})

test('rotas públicas de saúde, login e cadastro não exigem Bearer', async t => {
  const createOriginal = userService.createUser
  t.after(() => { userService.createUser = createOriginal })
  userService.createUser = async data => ({ id: 8, nome: data.nome, email: data.email })

  const healthResponse = await request('GET', '/')
  assert.equal(healthResponse.statusCode, 200)

  const registrationResponse = await request('POST', '/usuarios', {
    nome: 'Ana',
    email: 'ana@example.com',
    senha: 'senha',
    tipo_login: 'email',
    tipo_usuario: 'paciente'
  })
  assert.equal(registrationResponse.statusCode, 201)
  assert.deepEqual(registrationResponse.body, {
    id: 8,
    nome: 'Ana',
    email: 'ana@example.com'
  })
})

test('rotas protegidas rejeitam ausencia de token, token invalido e ids de outros usuarios', async () => {
  const missing = await request('GET', '/registros-glicose/usuario/42')
  assert.equal(missing.statusCode, 401)

  const invalid = await request('GET', '/registros-glicose/usuario/42', undefined, {
    Authorization: 'Bearer invalid'
  })
  assert.equal(invalid.statusCode, 401)

  const token = issueToken({ id_usuario: 42, tipo_usuario: 'paciente' })
  const otherUser = await request('GET', '/registros-glicose/usuario/43', undefined, {
    Authorization: `Bearer ${token}`
  })
  assert.equal(otherUser.statusCode, 403)

  const otherProfile = await request('GET', '/usuarios/43', undefined, {
    Authorization: `Bearer ${token}`
  })
  assert.equal(otherProfile.statusCode, 403)
})

test('leituras globais de registros por médico aguardam autorização por vínculo', async () => {
  const token = issueToken({ id_usuario: 7, tipo_usuario: 'medico' })
  const response = await request('GET', '/registros-glicose', undefined, {
    Authorization: `Bearer ${token}`
  })

  assert.equal(response.statusCode, 403)
  assert.match(response.body.message, /vinculo medico-paciente/)
})

test('rotas de vínculo exigem papel correto e usam a identidade assinada no JWT', async t => {
  const original = {
    createInvite: doctorService.createInvite,
    listPatients: doctorService.listPatients,
    getPatient: doctorService.getPatient,
    getPatientRecords: doctorService.getPatientRecords,
    getDoctorLink: patientService.getDoctorLink,
    redeemDoctorInvite: patientService.redeemDoctorInvite
  }
  t.after(() => {
    Object.assign(doctorService, {
      createInvite: original.createInvite,
      listPatients: original.listPatients,
      getPatient: original.getPatient,
      getPatientRecords: original.getPatientRecords
    })
    Object.assign(patientService, {
      getDoctorLink: original.getDoctorLink,
      redeemDoctorInvite: original.redeemDoctorInvite
    })
  })

  doctorService.createInvite = async doctorId => ({ doctorId, codigo: 'INSU-ABCD2345' })
  doctorService.listPatients = async doctorId => [{ id_medico_consultado: doctorId }]
  doctorService.getPatient = async (doctorId, patientId) => ({ doctorId, patientId })
  doctorService.getPatientRecords = async (doctorId, patientId) => [{ doctorId, patientId }]
  patientService.getDoctorLink = async patientId => ({ patientId, vinculado: false, medico: null })
  patientService.redeemDoctorInvite = async (patientId, code) => ({ patientId, code })

  const patientToken = issueToken({ id_usuario: 42, tipo_usuario: 'paciente' })
  const doctorToken = issueToken({ id_usuario: 7, tipo_usuario: 'medico' })

  assert.equal((await request('POST', '/medicos/vinculos')).statusCode, 401)
  assert.equal((await request('POST', '/medicos/vinculos', undefined, {
    Authorization: `Bearer ${patientToken}`
  })).statusCode, 403)
  assert.equal((await request('GET', '/pacientes/vinculo', undefined, {
    Authorization: `Bearer ${doctorToken}`
  })).statusCode, 403)

  const invite = await request('POST', '/medicos/vinculos', undefined, {
    Authorization: `Bearer ${doctorToken}`
  })
  assert.equal(invite.statusCode, 201)
  assert.deepEqual(invite.body, { doctorId: 7, codigo: 'INSU-ABCD2345' })

  const patients = await request('GET', '/medicos/pacientes', undefined, {
    Authorization: `Bearer ${doctorToken}`
  })
  assert.equal(patients.statusCode, 200)
  assert.deepEqual(patients.body, [{ id_medico_consultado: 7 }])

  const records = await request('GET', '/medicos/pacientes/42/registros', undefined, {
    Authorization: `Bearer ${doctorToken}`
  })
  assert.deepEqual(records.body, [{ doctorId: 7, patientId: '42' }])

  const linked = await request('GET', '/pacientes/vinculo', undefined, {
    Authorization: `Bearer ${patientToken}`
  })
  assert.deepEqual(linked.body, { patientId: 42, vinculado: false, medico: null })

  const redeemed = await request('POST', '/pacientes/vinculo', {
    codigo_vinculo: 'INSU-ABCD2345'
  }, { Authorization: `Bearer ${patientToken}` })
  assert.deepEqual(redeemed.body, { patientId: 42, code: 'INSU-ABCD2345' })
})

test('exportação de relatório permanece pública temporariamente', async t => {
  const original = exportacaoService.gerarRelatorio
  t.after(() => { exportacaoService.gerarRelatorio = original })
  exportacaoService.gerarRelatorio = async () => ({
    buffer: Buffer.from('fixture-report'),
    nomeArquivo: 'fixture.pdf',
    contentType: 'application/pdf'
  })

  const response = await request(
    'GET',
    '/exportacoes/relatorio?id_usuario=42&dataInicio=2026-01-01&dataFim=2026-01-02'
  )
  assert.equal(response.statusCode, 200)
  assert.equal(response.body, 'fixture-report')
  assert.equal(response.headers['content-type'], 'application/pdf')
})