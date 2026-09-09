const configuracaoRepository = require('../repositories/configuracaoRepository')

async function listConfiguracoes() {
  return await configuracaoRepository.findAll()
}

async function getConfiguracaoById(id) {
  const configuracao = await configuracaoRepository.findById(id)

  if (!configuracao) {
    const error = new Error('Configuração não encontrada')
    error.statusCode = 404
    throw error
  }

  return configuracao
}

async function createConfiguracao(data) {
  const { id_usuario, idioma, tema, notificacoes } = data

  if (!id_usuario || !idioma || !tema || notificacoes === undefined) {
    const error = new Error('Todos os campos são obrigatórios')
    error.statusCode = 400
    throw error
  }

  return await configuracaoRepository.create({
    id_usuario,
    idioma,
    tema,
    notificacoes
  })
}

async function updateConfiguracao(id, data) {
  const configuracao = await configuracaoRepository.findById(id)

  if (!configuracao) {
    const error = new Error('Configuração não encontrada')
    error.statusCode = 404
    throw error
  }

  const { id_usuario, idioma, tema, notificacoes } = data

  if (!id_usuario || !idioma || !tema || notificacoes === undefined) {
    const error = new Error('Todos os campos são obrigatórios')
    error.statusCode = 400
    throw error
  }

  return await configuracaoRepository.update(id, {
    id_usuario,
    idioma,
    tema,
    notificacoes
  })
}

async function deleteById(id) {
  const configuracao = await configuracaoRepository.findById(id)

  if (!configuracao) {
    const error = new Error('Configuração não encontrada')
    error.statusCode = 404
    throw error
  }

  await configuracaoRepository.deleteById(id)
}

module.exports = {
  listConfiguracoes,
  getConfiguracaoById,
  createConfiguracao,
  updateConfiguracao,
  deleteById
}
