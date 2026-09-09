const express = require('express')
const configuracaoController = require('../controllers/configuracaoController')

const router = express.Router()

router.get('/', configuracaoController.index)
router.get('/:id', configuracaoController.show)
router.post('/', configuracaoController.create)
router.put('/:id', configuracaoController.update)
router.delete('/:id', configuracaoController.deleteById)

module.exports = router
