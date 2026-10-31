const test = require('node:test')
const assert = require('node:assert/strict')

const { request, bearer } = require('./test-utils.cjs')
const { pool } = require('../../src/config/database')

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
