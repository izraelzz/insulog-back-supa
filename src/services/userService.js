const userRepository = require('../repositories/userRepository')
const passwordService = require('./passwordService')

async function listUsers() {
  return await userRepository.findAll()
}

async function getUserById(id) {
  const user = await userRepository.findById(id)

  if (!user) {
    const error = new Error('Usuario nao encontrado')
    error.statusCode = 404
    throw error
  }

  return user
}

async function getUsersByType(tipo_usuario) {
  const users = await userRepository.findByType(tipo_usuario)
  return users
}

async function deleteById(id) {
  const user = await userRepository.findById(id)

  if (!user) {
    const error = new Error('Usuario nao encontrado')
    error.statusCode = 404
    throw error
  }

  await userRepository.deleteById(id)
}

async function createUser(data) {
  const { nome, email, senha, tipo_login, tipo_usuario, id_medico, crm } = data

  console.log('createUser:', data)

  if (!nome || !email || !senha || !tipo_login || !tipo_usuario) {
    const error = new Error('Todos os campos sao obrigatorios')
    error.statusCode = 400
    throw error
  }

  const tipoNormalizado = tipo_usuario.toLowerCase()

  if (!['medico', 'paciente'].includes(tipoNormalizado)) {
    const error = new Error('tipo_usuario invalido')
    error.statusCode = 400
    throw error
  }

  if (tipoNormalizado === 'medico' && !crm) {
    const error = new Error('crm e obrigatorio para usuarios do tipo medico')
    error.statusCode = 400
    throw error
  }

  const userExists = await userRepository.findByEmail(email)

  if (userExists) {
    const error = new Error('Ja existe um usuario com esse e-mail')
    error.statusCode = 409
    throw error
  }

  const senhaCriptografada = passwordService.hashPassword(senha)

  return await userRepository.create(
    { nome, email, senha: senhaCriptografada, tipo_login, tipo_usuario, id_medico, crm },
    tipoNormalizado
  )
}

async function updateUser(id, data) {
  const { nome, email, senha, tipo_login, tipo_usuario, id_medico, crm } = data

  if (!nome || !email || !senha || !tipo_login || !tipo_usuario) {
    const error = new Error('Todos os campos sao obrigatorios')
    error.statusCode = 400
    throw error
  }

  const senhaCriptografada = passwordService.hashPassword(senha)

  return await userRepository.update(
    id,
    { nome, email, senha: senhaCriptografada, tipo_login, tipo_usuario, id_medico, crm }
  )
}

module.exports = {
  listUsers,
  getUserById,
  createUser,
  getUsersByType,
  deleteById,
  updateUser
}
