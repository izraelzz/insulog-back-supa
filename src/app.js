const express = require('express')
const authRoutes = require('./routes/authRoutes')
const userRoutes = require('./routes/userRoutes')
const typeInsuRoutes = require('./routes/typeInsuRoutes')
const periodoRoutes = require('./routes/periodoRoutes')
const registroGlicoseRoutes = require('./routes/registroGlicoseRoutes')
const registroInsulinaRoutes = require('./routes/registroInsulinaRoutes')
const exportacaoRoutes = require('./routes/exportacaoRoutes')
const configuracaoRoutes = require('./routes/configuracaoRoutes')
const alarmeRoutes = require('./routes/alarmeRoutes')
const errorHandler = require('./middlewares/errorHandler')

const app = express()

app.use((req, res, next) => {
  const inicio = Date.now()
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`)

  res.on('finish', () => {
    const duracao = Date.now() - inicio
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl} -> ${res.statusCode} (${duracao}ms)`)
  })

  next()
})

app.use((req, res, next) => {
  const originalJson = res.json.bind(res)
  const originalSend = res.send.bind(res)
  let retornoRegistrado = false

  function registrarRetorno(body) {
    if (retornoRegistrado) {
      return
    }

    retornoRegistrado = true

    const retorno = Buffer.isBuffer(body)
      ? body.toString('utf8')
      : body

    console.log('<retorno>', {
      metodo: req.method,
      rota: req.originalUrl,
      status: res.statusCode,
      body: retorno
    })
  }

  res.json = function jsonInterceptado(body) {
    registrarRetorno(body)
    return originalJson(body)
  }

  res.send = function sendInterceptado(body) {
    registrarRetorno(body)
    return originalSend(body)
  }

  next()
})

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', 'http://localhost:5173')
  res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS')
  res.header('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') {
    return res.sendStatus(204)
  }

  next()
})

app.use(express.json())

app.use((req, res, next) => {
  if (Object.keys(req.query).length > 0) {
    console.log('Query:', req.query)
  }

  if (req.body && Object.keys(req.body).length > 0) {
    console.log('Body:', req.body)
  }

  next()
})

app.get('/', (req, res) => {
  return res.json({
    mensagem: 'API rodando'
  })
})

app.use('/', authRoutes)
app.use('/usuarios', userRoutes)
app.use('/tipos-insulina', typeInsuRoutes)
app.use('/periodos', periodoRoutes)
app.use('/registros-glicose', registroGlicoseRoutes)
app.use('/registros-insulina', registroInsulinaRoutes)
app.use('/exportacoes', exportacaoRoutes)
app.use('/configuracoes', configuracaoRoutes)
app.use('/alarmes', alarmeRoutes)

app.use(errorHandler)

module.exports = app
