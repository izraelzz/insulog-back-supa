const configuracaoService = require('../services/configuracaoService')

async function index(req, res, next) {
  try {
    const configuracoes = await configuracaoService.listConfiguracoes()
    return res.status(200).json(configuracoes)
  } catch (error) {
    next(error)
  }
}

async function show(req, res, next) {
  try {
    const { id } = req.params
    const configuracao = await configuracaoService.getConfiguracaoById(id)
    return res.status(200).json(configuracao)
  } catch (error) {
    next(error)
  }
}

async function create(req, res, next) {
  try {
    const configuracao = await configuracaoService.createConfiguracao(req.body)
    return res.status(201).json(configuracao)
  } catch (error) {
    next(error)
  }
}

async function update(req, res, next) {
  try {
    const { id } = req.params
    const configuracao = await configuracaoService.updateConfiguracao(id, req.body)
    return res.status(200).json(configuracao)
  } catch (error) {
    next(error)
  }
}

async function deleteById(req, res, next) {
  try {
    const { id } = req.params
    await configuracaoService.deleteById(id)
    return res.status(204).send()
  } catch (error) {
    next(error)
  }
}

module.exports = {
  index,
  show,
  create,
  update,
  deleteById
}
