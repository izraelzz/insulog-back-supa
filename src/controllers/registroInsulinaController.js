const registroInsulinaService = require('../services/registroInsulinaService')

async function index(req, res, next) {
  try {
    const registrosInsulina = await registroInsulinaService.listRegistrosInsulina()
    return res.status(200).json(registrosInsulina)
  } catch (error) {
    next(error)
  }
}

async function show(req, res, next) {
  try {
    const { id } = req.params
    const registroInsulina = await registroInsulinaService.getRegistroInsulinaById(id)
    return res.status(200).json(registroInsulina)
  } catch (error) {
    next(error)
  }
}

async function showByUserId(req, res, next) {
  try {
    const { id_usuario } = req.params
    const { quantidade } = req.query
    const registrosInsulina = await registroInsulinaService.getRegistrosInsulinaByUserId(id_usuario, quantidade)
    return res.status(200).json(registrosInsulina)
  } catch (error) {
    next(error)
  }
}

async function create(req, res, next) {
  try {
    const registroInsulina = await registroInsulinaService.createRegistroInsulina(req.body)
    return res.status(201).json(registroInsulina)
  } catch (error) {
    next(error)
  }
}

async function update(req, res, next) {
  try {
    const { id } = req.params
    const registroInsulina = await registroInsulinaService.updateRegistroInsulina(id, req.body)
    return res.status(200).json(registroInsulina)
  } catch (error) {
    next(error)
  }
}

async function deleteById(req, res, next) {
  try {
    const { id } = req.params
    await registroInsulinaService.deleteById(id)
    return res.status(204).send()
  } catch (error) {
    next(error)
  }
}

module.exports = {
  index,
  show,
  showByUserId,
  create,
  update,
  deleteById
}
