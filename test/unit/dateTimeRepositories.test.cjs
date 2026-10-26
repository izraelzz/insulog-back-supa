const { test } = require('node:test')
const assert = require('node:assert/strict')

function loadRepository(t, path, results = []) {
  const databasePath = require.resolve('../../src/config/database')
  const repositoryPath = require.resolve(path)
  const previousDatabase = require.cache[databasePath]
  const previousRepository = require.cache[repositoryPath]
  const queries = []
  const pool = {
    execute: async (sql, values = []) => {
      queries.push({ sql, values })
      return [results.shift() || []]
    }
  }
  require.cache[databasePath] = {
    id: databasePath,
    filename: databasePath,
    loaded: true,
    exports: { pool }
  }
  delete require.cache[repositoryPath]
  const repository = require(repositoryPath)

  t.after(() => {
    if (previousDatabase) require.cache[databasePath] = previousDatabase
    else delete require.cache[databasePath]
    if (previousRepository) require.cache[repositoryPath] = previousRepository
    else delete require.cache[repositoryPath]
  })

  return { repository, queries }
}

const timestampSql = /to_char\([^)]*data_hora, 'YYYY-MM-DD HH24:MI:SS'\)/

test('registros de glicose retornam horário local no formato usado pela API MySQL', async t => {
  const { repository, queries } = loadRepository(t, '../../src/repositories/registroGlicoseRepository')

  await repository.findAll()
  await repository.findById(1)
  await repository.findDetalhadoById(1)
  await repository.findByUserId(1)
  await repository.findByUserIdAndPeriod(1, '2026-08-01 00:00:00', '2026-08-01 23:59:59')

  assert.equal(queries.length, 5)
  for (const { sql } of queries) assert.match(sql, timestampSql)
  assert.match(queries[2].sql, /to_char\(a\.data_hora, 'YYYY-MM-DD HH24:MI:SS'\) AS lembrete_data_hora/)
  assert.deepEqual(queries[4].values, [1, '2026-08-01 00:00:00', '2026-08-01 23:59:59'])
})

test('registros de insulina e alarmes retornam horários sem conversão UTC', async t => {
  const insulin = loadRepository(t, '../../src/repositories/registroInsulinaRepository')
  await insulin.repository.findByUserId(1)
  assert.match(insulin.queries[0].sql, timestampSql)

  const alarms = loadRepository(t, '../../src/repositories/alarmeRepository')
  await alarms.repository.findAll(1)
  await alarms.repository.findByUsuarioId(1)
  await alarms.repository.findById(1)
  assert.equal(alarms.queries.length, 3)
  for (const { sql } of alarms.queries) assert.match(sql, timestampSql)
})

test('resumos e registros de pacientes vinculados preservam timestamps e janela de sete dias', async t => {
  const { repository, queries } = loadRepository(t, '../../src/repositories/doctorRepository')

  await repository.findPatientsByDoctor(7)
  await repository.findPatientByDoctor(7, 19)
  await repository.findPatientRecordsByDoctor(7, 19)

  assert.equal(queries.length, 3)
  for (const { sql } of queries) {
    assert.match(sql, timestampSql)
    assert.doesNotMatch(sql, /NOW\(\)/)
  }
  assert.match(queries[0].sql, /LOCALTIMESTAMP - INTERVAL '7 days'/)
  assert.match(queries[1].sql, /LOCALTIMESTAMP - INTERVAL '7 days'/)
})

test('exportação usa o mesmo formato de data/hora e o fim exclusivo do dia seguinte', async t => {
  const { repository, queries } = loadRepository(
    t,
    '../../src/repositories/exportacaoRepository',
    [[{ id_usuario: 19 }], []]
  )

  await repository.findDadosRelatorio(19, '2026-08-01 00:00:00', '2026-08-31')

  assert.equal(queries.length, 2)
  assert.match(queries[1].sql, timestampSql)
  assert.match(queries[1].sql, /rg\.data_hora >= \?\:\:timestamp/)
  assert.match(queries[1].sql, /rg\.data_hora < \(\?\:\:date \+ INTERVAL '1 day'\)/)
  assert.deepEqual(queries[1].values, [19, '2026-08-01 00:00:00', '2026-08-31'])
})
