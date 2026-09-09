const alarmeService = require('../services/alarmeService')

async function index(req, res, next) {
  try {
    const alarmes = await alarmeService.listAlarmes()
    return res.status(200).json(alarmes)
  } catch (error) {
    next(error)
  }
}

async function showByUsuarioId(req, res, next) {
  try {
    const { usuarioId } = req.params
    const alarmes = await alarmeService.getAlarmesByUsuarioId(usuarioId)
    return res.status(200).json(alarmes)
  } catch (error) {
    next(error)
  }
}

async function show(req, res, next) {
  try {
    const { id } = req.params
    const alarme = await alarmeService.getAlarmeById(id)
    return res.status(200).json(alarme)
  } catch (error) {
    next(error)
  }
}

async function create(req, res, next) {
  try {
    const alarme = await alarmeService.createAlarme(req.body)
    return res.status(201).json(alarme)
  } catch (error) {
    next(error)
  }
}

async function update(req, res, next) {
  try {
    const { id } = req.params
    const alarme = await alarmeService.updateAlarme(id, req.body)
    return res.status(200).json(alarme)
  } catch (error) {
    next(error)
  }
}

async function deleteById(req, res, next) {
  try {
    const { id } = req.params
    await alarmeService.deleteById(id)
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
  deleteById,
  showByUsuarioId
}
