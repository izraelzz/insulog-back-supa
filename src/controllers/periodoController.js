const periodoService = require('../services/periodoService')

async function index(req, res, next) {
  try {
    const periodos = await periodoService.listPeriodos()
    return res.status(200).json(periodos)
  } catch (error) {
    next(error)
  }
}

async function show(req, res, next) {
  try {
    const { id } = req.params
    const periodo = await periodoService.getPeriodoById(id)
    return res.status(200).json(periodo)
  } catch (error) {
    next(error)
  }
}

async function create(req, res, next) {
  try {
    const periodo = await periodoService.createPeriodo(req.body)
    return res.status(201).json(periodo)
  } catch (error) {
    next(error)
  }
}

async function update(req, res, next) {
  try {
    const { id } = req.params
    const periodo = await periodoService.updatePeriodo(id, req.body)
    return res.status(200).json(periodo)
  } catch (error) {
    next(error)
  }
}

async function deleteById(req, res, next) {
  try {
    const { id } = req.params
    await periodoService.deleteById(id)
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
