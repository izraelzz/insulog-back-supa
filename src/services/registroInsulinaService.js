const registroInsulinaRepository = require('../repositories/registroInsulinaRepository')
const userRepository = require('../repositories/userRepository')

async function listRegistrosInsulina() {
  return await registroInsulinaRepository.findAll()
}

async function getRegistroInsulinaById(id) {
  const registroInsulina = await registroInsulinaRepository.findById(id)

  if (!registroInsulina) {
    const error = new Error('Registro de insulina não encontrado')
    error.statusCode = 404
    throw error
  }

  return registroInsulina
}

function normalizarQuantidade(quantidade) {
  if (quantidade === undefined || quantidade === null || quantidade === '' || quantidade === 'null') {
    return undefined
  }

  const quantidadeNormalizada = Number(quantidade)

  if (!Number.isInteger(quantidadeNormalizada) || quantidadeNormalizada <= 0) {
    const error = new Error('Quantidade deve ser um numero inteiro maior que zero')
    error.statusCode = 400
    throw error
  }

  return quantidadeNormalizada
}

async function getRegistrosInsulinaByUserId(usuario, quantidade) {
  const usuarioId = Number(usuario)
  const useId = Number.isNaN(usuarioId)
    ? await userRepository.findByLogin(usuario)
    : { id_usuario: usuarioId }

  if (!useId) {
    const error = new Error('Usuario nao encontrado')
    error.statusCode = 400
    throw error
  }

  const quantidadeRegistros = normalizarQuantidade(quantidade)
  const registrosInsulina = await registroInsulinaRepository.findByUserId(useId.id_usuario, quantidadeRegistros)

  if (!registrosInsulina || registrosInsulina.length === 0) {
    const error = new Error('Nenhum registro de insulina encontrado para este usuario')
    error.statusCode = 404
    throw error
  }

  return registrosInsulina.map(formatarRegistroResumo)
}

function formatarRegistroResumo(registro) {
  return {
    id: registro.id_registro_insulina,
    idRegistroGlicose: registro.id_registro,
    horaDoRegistro: registro.data_hora,
    idTipoInsulina: registro.id_tipo_insulina,
    tipoInsulina: registro.tipo_insulina,
    unidadeInsulina: Number(registro.unidade_insulina)
  }
}

async function createRegistroInsulina(data) {
  const { id_registro, id_tipo_insulina, unidade_insulina } = data

  if (!id_registro || !id_tipo_insulina || unidade_insulina === undefined) {
    const error = new Error('Todos os campos são obrigatórios')
    error.statusCode = 400
    throw error
  }

  return await registroInsulinaRepository.create({
    id_registro,
    id_tipo_insulina,
    unidade_insulina
  })
}

async function updateRegistroInsulina(id, data) {
  const registroInsulina = await registroInsulinaRepository.findById(id)

  if (!registroInsulina) {
    const error = new Error('Registro de insulina não encontrado')
    error.statusCode = 404
    throw error
  }

  const { id_registro, id_tipo_insulina, unidade_insulina } = data

  if (!id_registro || !id_tipo_insulina || unidade_insulina === undefined) {
    const error = new Error('Todos os campos são obrigatórios')
    error.statusCode = 400
    throw error
  }

  return await registroInsulinaRepository.update(id, {
    id_registro,
    id_tipo_insulina,
    unidade_insulina
  })
}

async function deleteById(id) {
  const registroInsulina = await registroInsulinaRepository.findById(id)

  if (!registroInsulina) {
    const error = new Error('Registro de insulina não encontrado')
    error.statusCode = 404
    throw error
  }

  await registroInsulinaRepository.deleteById(id)
}

module.exports = {
  listRegistrosInsulina,
  getRegistroInsulinaById,
  getRegistrosInsulinaByUserId,
  createRegistroInsulina,
  updateRegistroInsulina,
  deleteById
}
