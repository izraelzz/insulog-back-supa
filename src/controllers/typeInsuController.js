const typeInsuService = require('../services/typeInsuService')

async function index(req, res, next) {
  try {
    const tiposInsulina = await typeInsuService.listTypeInsu()
    return res.status(200).json(tiposInsulina)
  } catch (error) {
    next(error)
  }
}

async function show(req, res, next) {
  try {
    const { id } = req.params
    const tipoInsulina = await typeInsuService.getTypeInsuById(id)
    return res.status(200).json(tipoInsulina)
  } catch (error) {
    next(error)
  }
}

async function create(req, res, next) {
  try {
    const tipoInsulina = await typeInsuService.create(req.body)
    return res.status(201).json(tipoInsulina)
  } catch (error) {
    next(error)
  }
}

async function update(req, res, next) {
  try {
    const { id } = req.params
    const tipoInsulina = await typeInsuService.updateById(id, req.body)
    return res.status(200).json(tipoInsulina)
  } catch (error) {
    next(error)
  }
}

async function deleteById(req, res, next) {
  try {
    const { id } = req.params
    await typeInsuService.deleteById(id)
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
