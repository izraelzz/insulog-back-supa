const test = require('node:test')
const assert = require('node:assert/strict')
const { fork } = require('node:child_process')
const { once } = require('node:events')
const { randomUUID } = require('node:crypto')
const { setTimeout: delay } = require('node:timers/promises')
const path = require('node:path')
const { testDatabaseUrl, connectTestDatabase, waitForDatabase } = require('../../scripts/system-database.cjs')

function waitForPort(child) {
  let output = ''
  for (const stream of [child.stdout, child.stderr]) {
    stream.on('data', chunk => { output = (output + chunk).slice(-12000) })
  }
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => finish(new Error(`API não iniciou em 15s: ${output}`)), 15000)
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

async function waitForApi(base) {
  for (let attempt = 0; attempt < 10; attempt++) {
    try {
      const response = await fetch(base, { signal: AbortSignal.timeout(1000) })
      const body = await response.json()
      if (response.status === 200 && body.mensagem === 'API rodando') return
    } catch { /* Tentar novamente dentro do limite. */ }
    if (attempt < 9) await delay(200)
  }
  throw new Error('API indisponível após 10 tentativas HTTP')
}

test('sistema: registra glicose e consulta histórico persistido com média 100', { timeout: 60000 }, async t => {
  const connectionString = testDatabaseUrl()
  const pool = connectTestDatabase()
  let child
  let usuarioId
  let periodoId
  t.after(async () => {
    try {
      if (child && child.pid && child.exitCode === null && child.signalCode === null) {
        const exited = once(child, 'exit', { signal: AbortSignal.timeout(5000) })
        child.kill('SIGKILL')
        await exited
      }
    } finally {
      try {
        if (usuarioId !== undefined) {
          await pool.query('DELETE FROM alarme WHERE id_usuario = $1', [usuarioId])
          await pool.query('DELETE FROM registroinsulina WHERE id_registro IN (SELECT id_registro FROM registroglicose WHERE id_usuario = $1)', [usuarioId])
          await pool.query('DELETE FROM registroglicose WHERE id_usuario = $1', [usuarioId])
          await pool.query('DELETE FROM usuario WHERE id_usuario = $1', [usuarioId])
        }
        if (periodoId !== undefined) await pool.query('DELETE FROM periodo WHERE id_periodo = $1', [periodoId])
      } finally {
        await pool.end()
      }
    }
  })

  await waitForDatabase(pool)
  const schema = await pool.query("SELECT to_regclass('registroglicose') AS tabela")
  assert.ok(schema.rows[0].tabela, 'Prepare o schema com npm run test:db:prepare')
  usuarioId = (await pool.query(
    'INSERT INTO usuario (nome, email, senha, tipo_login, tipo_usuario) VALUES ($1, $2, $3, $4, $5) RETURNING id_usuario',
    ['Fixture sistema', `${randomUUID()}@example.invalid`, 'fixture-sem-login', 'email', 'paciente']
  )).rows[0].id_usuario
  periodoId = (await pool.query('INSERT INTO periodo (descricao) VALUES ($1) RETURNING id_periodo', ['Período sistema'])).rows[0].id_periodo
  child = fork(path.join(__dirname, '../../src/server.js'), [], {
    env: { ...process.env, NODE_ENV: 'test', TZ: 'UTC', PORT: '0',
      DATABASE_URL: connectionString, SUPABASE_DB_URL: '', DB_SSL: 'false' },
    stdio: ['ignore', 'pipe', 'pipe', 'ipc']
  })
  const base = await waitForPort(child)
  await waitForApi(base)
  const response = await fetch(`${base}/registros-glicose`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id_usuario: usuarioId, id_periodo: periodoId,
      nivel_glicose: 100, data_hora: '2026-01-15 12:00:00', observacao: 'Fixture sistema' }),
    signal: AbortSignal.timeout(5000)
  })
  const created = await response.json()
  assert.equal(response.status, 201, JSON.stringify(created))
  assert.ok(Number.isInteger(created.id_registro) && created.id_registro > 0)
  assert.deepEqual(created, {
    id_registro: created.id_registro,
    glicose: { nivel: 100, unidade: 'mg/dL', data_hora: '2026-01-15T12:00:00.000Z' },
    periodo: { id_periodo: periodoId, descricao: 'Período sistema' },
    observacao: 'Fixture sistema', insulina: null, lembrete: null
  })

  // Usuário exclusivo desta execução: o intervalo contém somente a medição criada.
  const query = new URLSearchParams({ dataInicio: '2026-01-15 00:00:00', dataFim: '2026-01-15 23:59:59' })
  const historyResponse = await fetch(`${base}/registros-glicose/usuario/${usuarioId}/historico?${query}`, {
    signal: AbortSignal.timeout(5000)
  })
  const history = await historyResponse.json()
  assert.equal(historyResponse.status, 200, JSON.stringify(history))
  assert.deepEqual(history, {
    media: 100, totalBaixos: 0, totalNormais: 1, totalAlertas: 0,
    statusMedia: 1, statusMediaDescricao: 'Normal',
    registros: [{ id: created.id_registro, horaDoRegistro: '2026-01-15T12:00:00.000Z',
      periodo: 'Período sistema', nivelGlicose: 100, status: 1, statusDescricao: 'Normal' }]
  })
})
