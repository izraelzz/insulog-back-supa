const { test } = require('node:test')
const assert = require('node:assert/strict')

function loadRepository(t, execute) {
  const databasePath = require.resolve('../../src/config/database')
  const repositoryPath = require.resolve('../../src/repositories/patientRepository')
  const previousDatabase = require.cache[databasePath]
  const previousRepository = require.cache[repositoryPath]
  const connection = {
    beginTransaction: async () => execute('BEGIN'),
    execute,
    commit: async () => execute('COMMIT'),
    rollback: async () => execute('ROLLBACK'),
    release: () => execute('RELEASE')
  }
  require.cache[databasePath] = {
    id: databasePath,
    filename: databasePath,
    loaded: true,
    exports: { pool: { getConnection: async () => connection, execute } }
  }
  delete require.cache[repositoryPath]
  const repository = require(repositoryPath)
  t.after(() => {
    if (previousDatabase) require.cache[databasePath] = previousDatabase
    else delete require.cache[databasePath]
    if (previousRepository) require.cache[repositoryPath] = previousRepository
    else delete require.cache[repositoryPath]
  })
  return repository
}

test('resgate bloqueia paciente e convite, atualiza ambos e confirma uma transacao', async t => {
  const queries = []
  const repository = loadRepository(t, async (sql, values = []) => {
    queries.push({ sql, values })
    if (sql.startsWith('SELECT id_medico')) return [[{ id_medico: null }]]
    if (sql.startsWith('SELECT id_codigo')) return [[{ id_codigo: 5, id_medico: 23 }]]
    if (sql.startsWith('UPDATE paciente')) return [[], { affectedRows: 1 }]
    if (sql.startsWith('UPDATE codigo_vinculo_medico')) return [[], { affectedRows: 1 }]
    return [[], { affectedRows: 0 }]
  })

  assert.deepEqual(await repository.redeemPatientInvite(41, 'hashed-code'), {
    id_paciente: 41,
    id_medico: 23
  })
  assert.match(queries.find(query => query.sql.startsWith('SELECT id_medico')).sql, /FOR UPDATE/)
  const lookupInvite = queries.find(query => query.sql.startsWith('SELECT id_codigo'))
  assert.match(lookupInvite.sql, /resgatado_em IS NULL AND expira_em > NOW\(\)[\s\S]*FOR UPDATE/)
  const consumeInvite = queries.find(query => query.sql.startsWith('UPDATE codigo_vinculo_medico'))
  assert.match(consumeInvite.sql, /WHERE id_codigo = \? AND resgatado_em IS NULL$/)
  assert.doesNotMatch(consumeInvite.sql, /expira_em/)
  assert.equal(queries.at(-2).sql, 'COMMIT')
  assert.equal(queries.at(-1).sql, 'RELEASE')
})

test('codigo reutilizado e expirado são rejeitados e a transacao sofre rollback', async t => {
  let inviteQueryCount = 0
  const queries = []
  const repository = loadRepository(t, async sql => {
    queries.push(sql)
    if (sql.startsWith('SELECT id_medico')) return [[{ id_medico: null }]]
    if (sql.startsWith('SELECT id_codigo')) {
      inviteQueryCount += 1
      return [[]]
    }
    return [[], { affectedRows: 0 }]
  })

  await assert.rejects(repository.redeemPatientInvite(41, 'used-code'), {
    statusCode: 400
  })
  assert.equal(inviteQueryCount, 1)
  assert.ok(queries.includes('ROLLBACK'))
})

test('paciente já vinculado não pode resgatar outro convite', async t => {
  const queries = []
  const repository = loadRepository(t, async sql => {
    queries.push(sql)
    if (sql.startsWith('SELECT id_medico')) return [[{ id_medico: 17 }]]
    return [[], { affectedRows: 0 }]
  })

  await assert.rejects(repository.redeemPatientInvite(41, 'another-code'), {
    statusCode: 409
  })
  assert.equal(queries.some(sql => sql.startsWith('SELECT id_codigo')), false)
  assert.ok(queries.includes('ROLLBACK'))
})
