const crypto = require('node:crypto')

const tokenLifetimeSeconds = 60 * 60 * 12
const developmentSecret = crypto.randomBytes(32)

if (process.env.NODE_ENV === 'production' && !process.env.AUTH_TOKEN_SECRET) {
  throw new Error('AUTH_TOKEN_SECRET deve estar configurado em producao.')
}

function getSecret() {
  if (process.env.AUTH_TOKEN_SECRET) {
    return process.env.AUTH_TOKEN_SECRET
  }

  if (process.env.NODE_ENV === 'production') {
    throw new Error('AUTH_TOKEN_SECRET deve estar configurado em producao.')
  }

  return developmentSecret
}

function encode(value) {
  return Buffer.from(JSON.stringify(value)).toString('base64url')
}

function issueToken(user, now = Date.now()) {
  const issuedAt = Math.floor(now / 1000)
  const header = encode({ alg: 'HS256', typ: 'JWT' })
  const payload = encode({
    sub: Number(user.id_usuario),
    role: String(user.tipo_usuario).toLowerCase(),
    iat: issuedAt,
    exp: issuedAt + tokenLifetimeSeconds
  })
  const unsignedToken = `${header}.${payload}`
  const signature = crypto.createHmac('sha256', getSecret()).update(unsignedToken).digest('base64url')

  return `${unsignedToken}.${signature}`
}

function verifyToken(token, now = Date.now()) {
  if (typeof token !== 'string') return null

  const parts = token.split('.')
  if (parts.length !== 3) return null

  const [headerPart, payloadPart, signature] = parts
  const unsignedToken = `${headerPart}.${payloadPart}`
  const expectedSignature = crypto.createHmac('sha256', getSecret()).update(unsignedToken).digest()
  const providedSignature = Buffer.from(signature, 'base64url')

  if (providedSignature.length !== expectedSignature.length ||
      !crypto.timingSafeEqual(providedSignature, expectedSignature)) {
    return null
  }

  try {
    const header = JSON.parse(Buffer.from(headerPart, 'base64url').toString('utf8'))
    const payload = JSON.parse(Buffer.from(payloadPart, 'base64url').toString('utf8'))
    const nowSeconds = Math.floor(now / 1000)

    if (header.alg !== 'HS256' || header.typ !== 'JWT') return null
    if (!Number.isSafeInteger(payload.sub) || payload.sub <= 0) return null
    if (!['medico', 'paciente'].includes(payload.role)) return null
    if (!Number.isInteger(payload.exp) || payload.exp <= nowSeconds) return null
    if (!Number.isInteger(payload.iat) || payload.iat > nowSeconds) return null

    return { userId: payload.sub, role: payload.role }
  } catch {
    return null
  }
}

module.exports = { issueToken, verifyToken }
