const authService = require('../services/authService')

async function login(req, res) {
  try {
    const result = await authService.login(req.body)
    return res.status(200).json(result)
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({
        message: error.message
      })
    }

    console.error('Falha ao autenticar', {
      name: error.name,
      code: error.code
    })

    return res.status(500).json({
      message: 'Erro interno do servidor.'
    })
  }
}

module.exports = {
  login
}
