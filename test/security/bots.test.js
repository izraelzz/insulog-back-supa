const test = require('node:test')
const assert = require('node:assert/strict')

const { request } = require('./test-utils.cjs')
const userRepository = require('../../src/repositories/userRepository')
const userService = require('../../src/services/userService')
const exportacaoService = require('../../src/services/exportacaoService')

test('tentativas automatizadas de login são limitadas', async t => {
  const originalFindByLogin = userRepository.findByLogin
  t.after(() => { userRepository.findByLogin = originalFindByLogin })
  userRepository.findByLogin = async () => undefined
  t.mock.method(console, 'log', () => {})

  const responses = []
  for (let attempt = 0; attempt < 16; attempt += 1) {
    responses.push(await request('POST', '/login', {
      username: 'bot@example.test',
      password: 'senha-incorreta'
    }))
  }

  assert.ok(
    responses.some(response => response.statusCode === 429),
    'esperava bloqueio HTTP 429 após tentativas repetidas de login'
  )
  const blockedResponse = responses.find(response => response.statusCode === 429)
  assert.ok(Number(blockedResponse.headers['retry-after']) > 0)
})

for (const endpoint of ['cadastro', 'relatório']) {
  test(`tentativas automatizadas no ${endpoint} são limitadas`, async t => {
    t.mock.method(console, 'log', () => {})

    if (endpoint === 'cadastro') {
      t.mock.method(userService, 'createUser', async () => ({
        id: 100,
        nome: 'Usuário de teste',
        email: 'bot@example.test'
      }))
    } else {
      t.mock.method(exportacaoService, 'gerarRelatorio', async () => ({
        buffer: Buffer.from('relatorio-de-teste'),
        nomeArquivo: 'relatorio-teste.pdf',
        contentType: 'application/pdf'
      }))
    }

    const responses = []
    for (let attempt = 0; attempt < 16; attempt += 1) {
      responses.push(endpoint === 'cadastro'
        ? await request('POST', '/usuarios', {
            nome: 'Bot de teste',
            email: `bot-${attempt}@example.test`,
            senha: 'senha-ficticia',
            tipo_login: 'email',
            tipo_usuario: 'paciente'
          })
        : await request(
            'GET',
            '/exportacoes/relatorio?id_usuario=42&dataInicio=2026-01-01&dataFim=2026-01-02'
          ))
    }

    assert.ok(
      responses.some(response => response.statusCode === 429),
      `esperava bloqueio HTTP 429 em tentativas repetidas de ${endpoint}`
    )
  })
}
