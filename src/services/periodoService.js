const periodoRepository = require('../repositories/periodoRepository')

async function listPeriodos() {
  return await periodoRepository.findAll()
}

async function getPeriodoById(id) {
  const periodo = await periodoRepository.findById(id)

  if (!periodo) {
    const error = new Error('Período não encontrado')
    error.statusCode = 404
    throw error
  }

  return periodo
}

async function createPeriodo(data) {
  const { descricao } = data

  if (!descricao) {
    const error = new Error('O campo descricao é obrigatório')
    error.statusCode = 400
    throw error
  }

  return await periodoRepository.create({ descricao })
}

async function updatePeriodo(id, data) {
  const periodo = await periodoRepository.findById(id)

  if (!periodo) {
    const error = new Error('Período não encontrado')
    error.statusCode = 404
    throw error
  }

  if (!data.descricao) {
    const error = new Error('O campo descricao é obrigatório')
    error.statusCode = 400
    throw error
  }

  return await periodoRepository.update(id, { descricao: data.descricao })
}

async function deleteById(id) {
  const periodo = await periodoRepository.findById(id)

  if (!periodo) {
    const error = new Error('Período não encontrado')
    error.statusCode = 404
    throw error
  }

  await periodoRepository.deleteById(id)
}

module.exports = {
  listPeriodos,
  getPeriodoById,
  createPeriodo,
  updatePeriodo,
  deleteById
}
