const WINDOW_MS = 15 * 60 * 1000
const MAX_ATTEMPTS = 15
const MAX_TRACKED_ADDRESSES = 10_000
const attemptsByAddress = new Map()

const cleanupTimer = setInterval(() => {
  const now = Date.now()
  for (const [address, entry] of attemptsByAddress) {
    if (now - entry.windowStartedAt >= WINDOW_MS) {
      attemptsByAddress.delete(address)
    }
  }
}, WINDOW_MS)
cleanupTimer.unref()

function createRateLimit(scope) {
  return function rateLimit(req, res, next) {
    const address = `${scope}:${req.ip || req.socket.remoteAddress}`
    const now = Date.now()
    let entry = attemptsByAddress.get(address)

    if (!entry || now - entry.windowStartedAt >= WINDOW_MS) {
      if (!entry && attemptsByAddress.size >= MAX_TRACKED_ADDRESSES) {
        const oldestAddress = attemptsByAddress.keys().next().value
        attemptsByAddress.delete(oldestAddress)
      }

      entry = { windowStartedAt: now, attempts: 0 }
      attemptsByAddress.set(address, entry)
    }

    if (entry.attempts >= MAX_ATTEMPTS) {
      const retryAfterSeconds = Math.ceil(
        (WINDOW_MS - (now - entry.windowStartedAt)) / 1000
      )
      res.set('Retry-After', String(retryAfterSeconds))
      return res.status(429).json({ message: 'Limite de requisicoes excedido.' })
    }

    entry.attempts += 1
    return next()
  }
}

const loginRateLimit = createRateLimit('login')

module.exports = loginRateLimit
module.exports.createRateLimit = createRateLimit
