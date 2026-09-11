const { Pool } = require('pg')
const { setTimeout: delay } = require('node:timers/promises')

function testDatabaseUrl() {
  const value = process.env.TEST_DATABASE_URL
  if (!value) throw new Error('TEST_DATABASE_URL obrigatória: use PostgreSQL local descartável com banco insulog_test')
  const url = new URL(value)
  if (!['postgres:', 'postgresql:'].includes(url.protocol) ||
      !['localhost', '127.0.0.1', '[::1]'].includes(url.hostname) ||
      url.pathname !== '/insulog_test' || url.search || url.hash) {
    throw new Error('TEST_DATABASE_URL deve usar host local, banco insulog_test e nenhum parâmetro extra')
  }
  return value
}

function connectTestDatabase() {
  return new Pool({ connectionString: testDatabaseUrl(), ssl: false,
    connectionTimeoutMillis: 1000, query_timeout: 2000 })
}

async function waitForDatabase(pool) {
  let lastError
  for (let attempt = 0; attempt < 10; attempt++) {
    try {
      await pool.query('SELECT 1')
      return
    } catch (error) {
      lastError = error
      if (attempt < 9) await delay(300)
    }
  }
  throw new Error('PostgreSQL de teste indisponível após 10 tentativas', { cause: lastError })
}

module.exports = { testDatabaseUrl, connectTestDatabase, waitForDatabase }
