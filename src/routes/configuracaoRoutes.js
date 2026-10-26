const express = require('express')
const configuracaoController = require('../controllers/configuracaoController')
const {
  requireAuth,
  requireOwnUserId,
  requireOwnedResource
} = require('../middlewares/requireAuth')

const router = express.Router()

router.use(requireAuth)

router.get('/', configuracaoController.index)
router.get('/:id', requireOwnedResource('configuracao', 'id_configuracao'), configuracaoController.show)
router.post('/', requireOwnUserId, configuracaoController.create)
router.put('/:id', requireOwnedResource('configuracao', 'id_configuracao'), requireOwnUserId, configuracaoController.update)
router.delete('/:id', requireOwnedResource('configuracao', 'id_configuracao'), configuracaoController.deleteById)

module.exports = router
