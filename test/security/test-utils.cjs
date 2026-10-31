const crypto = require('node:crypto')
const http = require('node:http')

process.env.AUTH_TOKEN_SECRET ||= crypto.randomBytes(32).toString('hex')

const app = require('../../src/app')
const { issueToken } = require('../../src/services/authTokenService')

function request(method, path, body, headers = {}) {
  return new Promise((resolve, reject) => {
    const server = app.listen(0, '127.0.0.1', () => {
      const address = server.address()
      const payload = body === undefined ? undefined : JSON.stringify(body)
      const clientRequest = http.request({
        host: address.address,
        port: address.port,
        path,
        method,
        headers: payload ? {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(payload),
          ...headers
        } : headers
      }, response => {
        let responseBody = ''
        response.setEncoding('utf8')
        response.on('data', chunk => { responseBody += chunk })
        response.on('end', () => {
          server.close(() => resolve({
            statusCode: response.statusCode,
            headers: response.headers,
            body: responseBody
          }))
        })
      })

      clientRequest.on('error', error => server.close(() => reject(error)))
      if (payload) clientRequest.write(payload)
      clientRequest.end()
    })

    server.on('error', reject)
  })
}

function bearer(userId, role = 'paciente') {
  return {
    Authorization: `Bearer ${issueToken({ id_usuario: userId, tipo_usuario: role })}`
  }
}

module.exports = { request, bearer }
