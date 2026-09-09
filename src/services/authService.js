const userRepository = require('../repositories/userRepository')
const passwordService = require('./passwordService')

async function login(credentials) {
  const { username, password } = credentials

  if (!username || !password) {
    const error = new Error('Username e password sao obrigatorios.')
    error.statusCode = 400
    throw error
  }

  const user = await userRepository.findByLogin(username)

  if (!user || !passwordService.verifyPassword(password, user.senha)) {
    const error = new Error('Usuario ou senha invalidos.')
    error.statusCode = 401
    throw error
  }

  return {
    user: {
      id: user.id_usuario,
      username: user.nome,
      email: user.email,
      tipo_usuario: user.tipo_usuario
    }
  }
}

module.exports = {
  login
}
