function errorHandler(error, req, res, next) {
  console.error(error)

  if (error.code === '23505') {
    return res.status(409).json({
      error: 'Registro duplicado no banco de dados'
    })
  }

  if (error.code === '42P01') {
    return res.status(500).json({
      error: 'Banco de dados não encontrado'
    })
  }

  if (error.code === 'ECONNREFUSED') {
    return res.status(500).json({
      error: 'Não foi possível conectar ao banco de dados'
    })
  }

  return res.status(error.statusCode || 500).json({
    error: error.message || 'Erro interno do servidor'
  })
}

module.exports = errorHandler