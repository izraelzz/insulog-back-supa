const test = require('node:test')
const assert = require('node:assert/strict')
const { fork } = require('node:child_process')
const { once } = require('node:events')
const { randomBytes, randomUUID } = require('node:crypto')
const { setTimeout: delay } = require('node:timers/promises')
const path = require('node:path')
const { testDatabaseUrl, connectTestDatabase, waitForDatabase } = require('../../scripts/system-database.cjs')

const authSecret = randomBytes(32).toString('hex')
process.env.AUTH_TOKEN_SECRET = authSecret
const { issueToken } = require('../../src/services/authTokenService')
const { hashInviteCode } = require('../../src/services/doctorService')

async function createUser(pool, type, name) {
  const email = `${randomUUID()}@example.invalid`
  const result = await pool.query(
    'INSERT INTO usuario (nome, email, senha, tipo_login, tipo_usuario) VALUES ($1, $2, $3, $4, $5) RETURNING id_usuario',
    [name, email, 'system-test-no-login', 'email', type]
  )
  return result.rows[0].id_usuario
}

async function waitForPort(child) {
  let output = ''
  for (const stream of [child.stdout, child.stderr]) {
    stream.on('data', chunk => { output = (output + chunk).slice(-12000) })
  }
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => finish(new Error(`API nao iniciou em 15s: ${output}`)), 15000)
    function finish(error, port) {
      clearTimeout(timer)
      child.off('error', onError)
      child.off('exit', onExit)
      child.off('message', onMessage)
      if (error) reject(error)
      else resolve(`http://127.0.0.1:${port}`)
    }
    const onError = error => finish(error)
    const onExit = code => finish(new Error(`API encerrou (${code}): ${output}`))
    const onMessage = message => {
      if (message.type === 'listening') finish(null, message.port)
    }
    child.on('error', onError)
    child.on('exit', onExit)
    child.on('message', onMessage)
  })
}

async function request(base, method, route, token, body) {
  const response = await fetch(`${base}${route}`, {
    method,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(body ? { 'Content-Type': 'application/json' } : {})
    },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(5000)
  })
  const text = await response.text()
  return { status: response.status, body: text ? JSON.parse(text) : null }
}

test('system: convites de medico vinculam paciente uma vez e protegem consultas', {
  timeout: 90000
}, async t => {
  const connectionString = testDatabaseUrl()
  const pool = connectTestDatabase()
  let child
  let doctorId
  let otherDoctorId
  const patientIds = []
  let periodId
  t.after(async () => {
    try {
      if (child && child.pid && child.exitCode === null && child.signalCode === null) {
        const exited = once(child, 'exit', { signal: AbortSignal.timeout(5000) })
        child.kill('SIGTERM')
        await exited
      }
    } finally {
      try {
        if (patientIds.length) {
          await pool.query('DELETE FROM registroglicose WHERE id_usuario = ANY($1::integer[])', [patientIds])
        }
        const userIds = [doctorId, otherDoctorId, ...patientIds].filter(Number.isInteger)
        if (userIds.length) await pool.query('DELETE FROM usuario WHERE id_usuario = ANY($1::integer[])', [userIds])
        if (periodId !== undefined) await pool.query('DELETE FROM periodo WHERE id_periodo = $1', [periodId])
      } finally {
        await pool.end()
      }
    }
  })

  await waitForDatabase(pool)
  const schema = await pool.query(
    "SELECT to_regclass('codigo_vinculo_medico') AS convites, to_regclass('paciente') AS pacientes"
  )
  assert.ok(schema.rows[0].convites, 'Prepare o schema com npm run test:db:prepare')
  assert.ok(schema.rows[0].pacientes)

  doctorId = await createUser(pool, 'medico', 'Medico system')
  otherDoctorId = await createUser(pool, 'medico', 'Outro medico system')
  await pool.query('INSERT INTO medico (id_usuario, crm) VALUES ($1, $2), ($3, $4)', [
    doctorId, `CRM-${randomUUID()}`, otherDoctorId, `CRM-${randomUUID()}`
  ])

  for (let index = 0; index < 4; index++) {
    const patientId = await createUser(pool, 'paciente', `Paciente system ${index}`)
    patientIds.push(patientId)
    await pool.query('INSERT INTO paciente (id_usuario, id_medico) VALUES ($1, NULL)', [patientId])
  }

  periodId = (await pool.query(
    'INSERT INTO periodo (descricao) VALUES ($1) RETURNING id_periodo',
    [`Periodo ${randomUUID()}`]
  )).rows[0].id_periodo

  const secret = authSecret
  const doctorToken = issueToken({ id_usuario: doctorId, tipo_usuario: 'medico' })
  const secondDoctorToken = issueToken({ id_usuario: otherDoctorId, tipo_usuario: 'medico' })
  const patientTokens = patientIds.map(id => issueToken({ id_usuario: id, tipo_usuario: 'paciente' }))

  child = fork(path.join(__dirname, '../../src/server.js'), [], {
    env: {
      ...process.env,
      NODE_ENV: 'test',
      TZ: 'UTC',
      PORT: '0',
      DATABASE_URL: connectionString,
      SUPABASE_DB_URL: '',
      DB_SSL: 'false',
      AUTH_TOKEN_SECRET: secret
    },
    stdio: ['ignore', 'pipe', 'pipe', 'ipc']
  })
  const base = await waitForPort(child)

  const unauthenticated = await request(base, 'POST', '/medicos/vinculos')
  assert.equal(unauthenticated.status, 401)
  assert.equal((await request(base, 'POST', '/medicos/vinculos', patientTokens[0])).status, 403)
  assert.equal((await request(base, 'GET', '/pacientes/vinculo', doctorToken)).status, 403)

  const unlinked = await request(base, 'GET', '/pacientes/vinculo', patientTokens[0])
  assert.deepEqual(unlinked.body, { vinculado: false, medico: null })
  assert.equal((await request(base, 'POST', '/pacientes/vinculo', patientTokens[0], {
    codigo_vinculo: 'INVALIDO'
  })).status, 400)

  const inviteResponse = await request(base, 'POST', '/medicos/vinculos', doctorToken)
  assert.equal(inviteResponse.status, 201)
  assert.match(inviteResponse.body.codigo, /^INSU-[A-HJ-NP-Z2-9]{8}$/)
  assert.ok(inviteResponse.body.expira_em)
  const inviteHash = hashInviteCode(inviteResponse.body.codigo)
  const storedInvite = await pool.query(
    'SELECT codigo_hash FROM codigo_vinculo_medico WHERE codigo_hash = $1',
    [inviteHash]
  )
  assert.equal(storedInvite.rows[0].codigo_hash.trim(), inviteHash)

  const linked = await request(base, 'POST', '/pacientes/vinculo', patientTokens[0], {
    codigo_vinculo: inviteResponse.body.codigo.toLowerCase()
  })
  assert.equal(linked.status, 200)
  assert.deepEqual(linked.body, { id_paciente: patientIds[0], id_medico: doctorId })

  const doctorLink = await request(base, 'GET', '/pacientes/vinculo', patientTokens[0])
  assert.equal(doctorLink.body.vinculado, true)
  assert.equal(doctorLink.body.medico.id, doctorId)

  const reused = await request(base, 'POST', '/pacientes/vinculo', patientTokens[1], {
    codigo_vinculo: inviteResponse.body.codigo
  })
  assert.equal(reused.status, 400)

  await pool.query(
    'INSERT INTO registroglicose (id_usuario, nivel_glicose, data_hora, id_periodo) VALUES ($1, 105, NOW(), $2)',
    [patientIds[0], periodId]
  )
  const patientList = await request(base, 'GET', '/medicos/pacientes', doctorToken)
  assert.equal(patientList.status, 200)
  assert.equal(patientList.body.length, 1)
  assert.equal(patientList.body[0].id, patientIds[0])

  const records = await request(
    base, 'GET', `/medicos/pacientes/${patientIds[0]}/registros`, doctorToken
  )
  assert.equal(records.status, 200)
  assert.equal(records.body.length, 1)
  assert.equal(records.body[0].nivel_glicose, 105)

  const otherDoctorRecords = await request(
    base, 'GET', `/medicos/pacientes/${patientIds[0]}/registros`, secondDoctorToken
  )
  assert.equal(otherDoctorRecords.status, 404)

  const expiringInvite = await request(base, 'POST', '/medicos/vinculos', doctorToken)
  await pool.query(
    'UPDATE codigo_vinculo_medico SET expira_em = NOW() - INTERVAL \'1 minute\' WHERE codigo_hash = $1',
    [hashInviteCode(expiringInvite.body.codigo)]
  )
  const expired = await request(base, 'POST', '/pacientes/vinculo', patientTokens[1], {
    codigo_vinculo: expiringInvite.body.codigo
  })
  assert.equal(expired.status, 400)

  const concurrentInvite = await request(base, 'POST', '/medicos/vinculos', doctorToken)
  const concurrentResults = await Promise.all([
    request(base, 'POST', '/pacientes/vinculo', patientTokens[2], {
      codigo_vinculo: concurrentInvite.body.codigo
    }),
    request(base, 'POST', '/pacientes/vinculo', patientTokens[3], {
      codigo_vinculo: concurrentInvite.body.codigo
    })
  ])
  assert.deepEqual(concurrentResults.map(result => result.status).sort(), [200, 400])

  const patientDetailFromOtherDoctor = await request(
    base, 'GET', `/medicos/pacientes/${patientIds[0]}`, secondDoctorToken
  )
  assert.equal(patientDetailFromOtherDoctor.status, 404)
})
