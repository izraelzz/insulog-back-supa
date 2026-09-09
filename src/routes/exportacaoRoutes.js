const express = require('express')
const exportacaoController = require('../controllers/exportacaoController')

const router = express.Router()

router.get('/', exportacaoController.index)
router.get('/relatorio', exportacaoController.gerarRelatorio)
router.get('/:id', exportacaoController.show)
router.post('/', exportacaoController.create)
router.put('/:id', exportacaoController.update)
router.delete('/:id', exportacaoController.deleteById)

module.exports = router
