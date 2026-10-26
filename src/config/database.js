const { Pool } = require('pg')
const path = require('path')

require('dotenv').config({
  path: path.resolve(__dirname, '../../.env')
})

const connectionString = process.env.DATABASE_URL || process.env.SUPABASE_DB_URL

const pgPool = new Pool({
  ...(connectionString
    ? { connectionString }
    : {
        host: process.env.DB_HOST,
        port: Number(process.env.DB_PORT || 5432),
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME
      }),
  ssl: process.env.DB_SSL === 'false' ? false : { rejectUnauthorized: false }
})

function assertDatabaseConfiguration(config = process.env) {
  if (config.DATABASE_URL || config.SUPABASE_DB_URL) return

  const missing = ['DB_HOST', 'DB_USER', 'DB_PASSWORD', 'DB_NAME']
    .filter(name => !config[name])

  if (missing.length > 0) {
    throw new Error(
      `Configure DATABASE_URL ou SUPABASE_DB_URL, ou preencha as variaveis PostgreSQL: ${missing.join(', ')}.`
    )
  }
}

function toPostgresQuery(sql, values = []) {
  let index = 0
  const text = sql.replace(/\?/g, () => `$${++index}`)

  return { text, values }
}

async function execute(sql, values = []) {
  const client = await pgPool.connect()

  try {
    const result = await client.query(toPostgresQuery(sql, values))

    return [result.rows, { affectedRows: result.rowCount }]
  } finally {
    client.release()
  }
}

const pool = {
  execute,
  async getConnection() {
    const client = await pgPool.connect()

    return {
      execute: async (sql, values = []) => {
        const result = await client.query(toPostgresQuery(sql, values))

        return [result.rows, { affectedRows: result.rowCount }]
      },
      beginTransaction: () => client.query('BEGIN'),
      commit: () => client.query('COMMIT'),
      rollback: () => client.query('ROLLBACK'),
      release: () => client.release()
    }
  }
}

async function testDatabaseConnection() {
  assertDatabaseConfiguration()
  const conn = await pool.getConnection()

  try {
    await conn.execute('SELECT 1')
    console.log('Banco conectado com sucesso!')
  } finally {
    conn.release()
  }
}

module.exports = {
  pool,
  testDatabaseConnection,
  assertDatabaseConfiguration
};
