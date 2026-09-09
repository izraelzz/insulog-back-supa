const express = require('express')
const alarmeController = require('../controllers/alarmeController')

const router = express.Router()

router.get('/', alarmeController.index)
router.get('/usuario/:usuarioId', alarmeController.showByUsuarioId)
router.get('/:id', alarmeController.show)
router.post('/', alarmeController.create)
router.put('/:id', alarmeController.update)
router.delete('/:id', alarmeController.deleteById)

module.exports = router
