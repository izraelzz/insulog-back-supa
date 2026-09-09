const userService = require('../services/userService')

async function index(req, res, next) {
  try {
    const users = await userService.listUsers()
    return res.status(200).json(users)
  } catch (error) {
    next(error)
  }
}

async function showByType(req, res, next) {
  try {
    const { tipo_usuario } = req.params
    const users = await userService.getUsersByType(tipo_usuario)
    return res.status(200).json(users)
  } catch (error) {
    next(error)
  }
}

async function show(req, res, next) {
  try {
    const { id } = req.params
    const user = await userService.getUserById(id)

    return res.status(200).json(user)
  } catch (error) {
    next(error)
  }
}

async function deleteById(req, res, next) {
  try {
    const { id } = req.params
    await userService.deleteById(id)
    return res.status(204).send()
  } catch (error) {
    next(error)
  }
}

async function create(req, res, next) {
  try {
    console.log('Request body:', req.body)
    const user = await userService.createUser(req.body)
    return res.status(201).json(user)
  } catch (error) {
    next(error)
  }
}

async function update(req, res, next) {
  try {
    const { id } = req.params
    const user = await userService.updateUser(id, req.body)
    return res.status(200).json(user)
  } catch (error) {
    next(error)
  }
}

module.exports = {
  update,
  index,
  show,
  create,
  showByType,
  deleteById
}