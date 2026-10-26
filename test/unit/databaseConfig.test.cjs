const { test } = require('node:test')
const assert = require('node:assert/strict')
const { assertDatabaseConfiguration } = require('../../src/config/database')

test('configuracao PostgreSQL exige URL ou todos os campos de conexao', () => {
  assert.throws(
    () => assertDatabaseConfiguration({}),
    /DATABASE_URL ou SUPABASE_DB_URL.*DB_HOST, DB_USER, DB_PASSWORD, DB_NAME/
  )
  assert.doesNotThrow(() => assertDatabaseConfiguration({
    DATABASE_URL: 'postgresql://placeholder'
  }))
  assert.doesNotThrow(() => assertDatabaseConfiguration({
    DB_HOST: 'localhost',
    DB_USER: 'user',
    DB_PASSWORD: 'password',
    DB_NAME: 'database'
  }))
})
