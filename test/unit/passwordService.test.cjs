const { test } = require('node:test')
const assert = require('node:assert/strict')
const { hashPassword, verifyPassword } = require('../../src/services/passwordService')

test('senha gera hash scrypt com salt aleatorio e aceita somente a senha correta', () => {
  const first = hashPassword('senha-ficticia')
  const second = hashPassword('senha-ficticia')
  assert.match(first, /^scrypt:[a-f0-9]{32}:[a-f0-9]{128}$/)
  assert.notEqual(first, second)
  assert.equal(verifyPassword('senha-ficticia', first), true)
  assert.equal(verifyPassword('senha-errada', first), false)
  assert.equal(verifyPassword('senha-ficticia', second), true)
})

test('senhas legadas em texto simples continuam sendo comparadas', () => {
  assert.equal(verifyPassword('legada', 'legada'), true)
  assert.equal(verifyPassword('outra', 'legada'), false)
})

test('hash ausente, incompleto ou de tamanho incorreto nao autentica', () => {
  for (const stored of [undefined, null, '', 'scrypt:', 'scrypt:salt:', 'scrypt::abcd', 'scrypt:salt:abcd', 'scrypt:salt:zz']) {
    assert.equal(verifyPassword('senha-ficticia', stored), false, String(stored))
  }
})
