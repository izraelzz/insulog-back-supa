const typeInsuRepository = require('../repositories/typeInsuRepository')

async function listTypeInsu() {
  return await typeInsuRepository.findAll()
}

async function getTypeInsuById(id) {
  const tipoInsulina = await typeInsuRepository.findById(id)

  if (!tipoInsulina) {
    const error = new Error('Tipo de insulina não encontrado')
    error.statusCode = 404
    throw error
  }

  return tipoInsulina
}

async function deleteById(id) {
  const tipoInsulina = await typeInsuRepository.findById(id)

  if (!tipoInsulina) {
    const error = new Error('Tipo de insulina não encontrado')
    error.statusCode = 404
    throw error
  }

  await typeInsuRepository.deleteById(id)
}

async function updateById(id, tipoInsulina) {
  const tipoInsulinaExistente = await typeInsuRepository.findById(id)

  if (!tipoInsulinaExistente) {
    const error = new Error('Tipo de insulina não encontrado')
    error.statusCode = 404
    throw error
  }

  if (!tipoInsulina.nome) {
    const error = new Error('O campo nome é obrigatório')
    error.statusCode = 400
    throw error
  }

  return await typeInsuRepository.updateById(id, tipoInsulina)
}

async function create(tipoInsulina) {
  const { nome } = tipoInsulina

  if (!nome) {
    const error = new Error('O campo nome é obrigatório')
    error.statusCode = 400
    throw error
  }

  return await typeInsuRepository.create(tipoInsulina)
}

module.exports = {
  listTypeInsu,
  getTypeInsuById,
  create,
  updateById,
  deleteById
}
