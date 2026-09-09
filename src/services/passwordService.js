const crypto = require('crypto')

const KEY_LENGTH = 64
const PASSWORD_PREFIX = 'scrypt'

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex')
  const hash = crypto.scryptSync(password, salt, KEY_LENGTH).toString('hex')
  return `${PASSWORD_PREFIX}:${salt}:${hash}`
}

function isHashedPassword(value) {
  return typeof value === 'string' && value.startsWith(`${PASSWORD_PREFIX}:`)
}

function verifyHashedPassword(password, storedPassword) {
  if (!isHashedPassword(storedPassword)) {
    return false
  }

  const [, salt, storedHash] = storedPassword.split(':')

  if (!salt || !storedHash) {
    return false
  }

  const hashBuffer = crypto.scryptSync(password, salt, KEY_LENGTH)
  const storedHashBuffer = Buffer.from(storedHash, 'hex')

  if (hashBuffer.length !== storedHashBuffer.length) {
    return false
  }

  return crypto.timingSafeEqual(hashBuffer, storedHashBuffer)
}

function verifyPassword(password, storedPassword) {
  if (!storedPassword) {
    return false
  }

  if (isHashedPassword(storedPassword)) {
    return verifyHashedPassword(password, storedPassword)
  }

  // Compatibilidade temporaria com usuarios antigos salvos em texto puro.
  return storedPassword === password
}

module.exports = {
  hashPassword,
  verifyPassword
}
