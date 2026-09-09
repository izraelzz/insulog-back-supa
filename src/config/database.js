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
  try {
    const conn = await pool.getConnection()
    await conn.execute('SELECT 1')
    console.log("Banco conectado com sucesso!");
    conn.release()
  } catch (error) {
    console.error("Erro ao conectar no banco:", error.message)
  }
}

module.exports = {
  pool,
  testDatabaseConnection,
};
