const express = require('express')
const exportacaoController = require('../controllers/exportacaoController')
const {
  requireAuth,
  requireOwnUserId,
  requireOwnedResource
} = require('../middlewares/requireAuth')

const router = express.Router()

router.get('/relatorio', exportacaoController.gerarRelatorio)

router.use(requireAuth)

router.get('/', exportacaoController.index)
router.get('/:id', requireOwnedResource('exportacao', 'id_exportacao'), exportacaoController.show)
router.post('/', requireOwnUserId, exportacaoController.create)
router.put('/:id', requireOwnedResource('exportacao', 'id_exportacao'), requireOwnUserId, exportacaoController.update)
router.delete('/:id', requireOwnedResource('exportacao', 'id_exportacao'), exportacaoController.deleteById)

module.exports = router
