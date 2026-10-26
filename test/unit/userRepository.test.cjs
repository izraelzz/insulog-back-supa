const { test } = require('node:test')
const assert = require('node:assert/strict')

function loadRepository(t, rows) {
  const databasePath = require.resolve('../../src/config/database')
  const repositoryPath = require.resolve('../../src/repositories/userRepository')
  const previousDatabase = require.cache[databasePath]
  const previousRepository = require.cache[repositoryPath]
  let query
  require.cache[databasePath] = {
    id: databasePath,
    filename: databasePath,
    loaded: true,
    exports: {
      pool: {
        execute: async (text, values) => {
          query = { text, values }
          return [rows]
        }
      }
    }
  }
  delete require.cache[repositoryPath]
  const repository = require(repositoryPath)

  t.after(() => {
    if (previousDatabase) require.cache[databasePath] = previousDatabase
    else delete require.cache[databasePath]
    if (previousRepository) require.cache[repositoryPath] = previousRepository
    else delete require.cache[repositoryPath]
  })

  return { repository, getQuery: () => query }
}

test('login por primeiro nome procura nome completo e primeiro segmento no PostgreSQL', async t => {
  const row = { id_usuario: 9, nome: 'Ana Silva', email: 'ana@example.com', senha: 'hash' }
  const { repository, getQuery } = loadRepository(t, [row])

  assert.equal(await repository.findByLogin(' Ana '), row)
  assert.match(getQuery().text, /split_part\(btrim\(nome\), ' ', 1\)/)
  assert.deepEqual(getQuery().values, ['Ana', 'Ana'])
})

test('login com nome duplicado exige e-mail em vez de escolher uma conta', async t => {
  const { repository } = loadRepository(t, [
    { id_usuario: 9, nome: 'Ana Silva' },
    { id_usuario: 10, nome: 'Ana Souza' }
  ])

  await assert.rejects(repository.findByLogin('Ana'), {
    statusCode: 400,
    message: 'Use seu e-mail para entrar com este nome.'
  })
})

test('login por e-mail consulta somente o e-mail e não a primeira parte do nome', async t => {
  const row = { id_usuario: 9, nome: 'Ana Silva', email: 'ana@example.com', senha: 'hash' }
  const { repository, getQuery } = loadRepository(t, [row])

  assert.equal(await repository.findByLogin(' ANA@example.com '), row)
  assert.match(getQuery().text, /LOWER\(email\) = LOWER\(\?\)/)
  assert.deepEqual(getQuery().values, ['ANA@example.com'])
})

test('consulta de e-mail para cadastro segue comparação sem distinção de caixa', async t => {
  const row = { id_usuario: 9, nome: 'Ana Silva', email: 'ana@example.com' }
  const { repository, getQuery } = loadRepository(t, [row])

  assert.equal(await repository.findByEmail('ANA@example.com'), row)
  assert.match(getQuery().text, /LOWER\(email\) = LOWER\(\?\)/)
  assert.deepEqual(getQuery().values, ['ANA@example.com'])
})
