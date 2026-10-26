const { test } = require('node:test')
const assert = require('node:assert/strict')
const crypto = require('node:crypto')
const { issueToken, verifyToken } = require('../../src/services/authTokenService')

test('emite token JWT assinado com identidade, papel e expiracao', () => {
  const now = Date.UTC(2026, 9, 26)
  const token = issueToken({ id_usuario: 42, tipo_usuario: 'PACIENTE' }, now)
  const [headerPart, payloadPart, signature] = token.split('.')
  const header = JSON.parse(Buffer.from(headerPart, 'base64url').toString('utf8'))
  const payload = JSON.parse(Buffer.from(payloadPart, 'base64url').toString('utf8'))

  assert.deepEqual(header, { alg: 'HS256', typ: 'JWT' })
  assert.equal(payload.sub, 42)
  assert.equal(payload.role, 'paciente')
  assert.equal(payload.exp - payload.iat, 12 * 60 * 60)
  assert.equal(typeof signature, 'string')
  assert.deepEqual(verifyToken(token, now), { userId: 42, role: 'paciente' })
})

test('rejeita tokens expirados, adulterados e malformados', () => {
  const now = Date.UTC(2026, 9, 26)
  const token = issueToken({ id_usuario: 42, tipo_usuario: 'medico' }, now)
  const [header, payload, signature] = token.split('.')
  const altered = `${header}.${payload}.${`${signature[0] === 'A' ? 'B' : 'A'}${signature.slice(1)}`}`

  assert.equal(verifyToken(token, now + 13 * 60 * 60 * 1000), null)
  assert.equal(verifyToken(altered, now), null)
  assert.equal(verifyToken('not-a-jwt', now), null)
  assert.equal(verifyToken(null, now), null)
})

test('exige AUTH_TOKEN_SECRET em producao', () => {
  const previousNodeEnv = process.env.NODE_ENV
  const previousSecret = process.env.AUTH_TOKEN_SECRET
  process.env.NODE_ENV = 'production'
  delete process.env.AUTH_TOKEN_SECRET

  try {
    assert.throws(
      () => issueToken({ id_usuario: 1, tipo_usuario: 'paciente' }),
      /AUTH_TOKEN_SECRET/
    )
  } finally {
    if (previousNodeEnv === undefined) delete process.env.NODE_ENV
    else process.env.NODE_ENV = previousNodeEnv
    if (previousSecret === undefined) delete process.env.AUTH_TOKEN_SECRET
    else process.env.AUTH_TOKEN_SECRET = previousSecret
  }
})

test('a assinatura usa HMAC SHA-256 sobre cabecalho e payload', () => {
  const previousSecret = process.env.AUTH_TOKEN_SECRET
  process.env.AUTH_TOKEN_SECRET = crypto.randomBytes(32).toString('hex')
  const token = issueToken({ id_usuario: 9, tipo_usuario: 'paciente' }, 1000)
  const [header, payload, signature] = token.split('.')
  const expected = crypto.createHmac('sha256', process.env.AUTH_TOKEN_SECRET)
    .update(`${header}.${payload}`)
    .digest('base64url')

  assert.equal(signature, expected)
  if (previousSecret === undefined) delete process.env.AUTH_TOKEN_SECRET
  else process.env.AUTH_TOKEN_SECRET = previousSecret
})
