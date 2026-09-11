const { readFile } = require('node:fs/promises')
const path = require('node:path')
const { connectTestDatabase, waitForDatabase } = require('./system-database.cjs')

async function main() {
  const pool = connectTestDatabase()
  try {
    await waitForDatabase(pool)
    const client = await pool.connect()
    try {
      await client.query('BEGIN')
      await client.query(await readFile(path.join(__dirname, '../test/fixtures/base-schema.sql'), 'utf8'))
      await client.query(await readFile(path.join(__dirname, '../src/config/registro-glicose-schema.sql'), 'utf8'))
      await client.query('COMMIT')
      console.log('Schema de teste preparado em insulog_test')
    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    } finally {
      client.release()
    }
  } finally {
    await pool.end()
  }
}

main().catch(error => { console.error(error.message); process.exitCode = 1 })
