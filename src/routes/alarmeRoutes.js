const express = require('express')
const alarmeController = require('../controllers/alarmeController')
const {
  requireAuth,
  requireOwnUserId,
  requireOwnedResource
} = require('../middlewares/requireAuth')

const router = express.Router()

router.use(requireAuth)

router.get('/', alarmeController.index)
router.get('/usuario/:usuarioId', requireOwnUserId, alarmeController.showByUsuarioId)
router.get('/:id', requireOwnedResource('alarme', 'id_alarme'), alarmeController.show)
router.post('/', requireOwnUserId, alarmeController.create)
router.put('/:id', requireOwnedResource('alarme', 'id_alarme'), requireOwnUserId, alarmeController.update)
router.delete('/:id', requireOwnedResource('alarme', 'id_alarme'), alarmeController.deleteById)

module.exports = router
