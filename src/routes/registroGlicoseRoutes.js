const express = require('express')
const registroGlicoseController = require('../controllers/registroGlicoseController')

const router = express.Router()

router.get('/', registroGlicoseController.index)
router.get('/dashboard', registroGlicoseController.getDashboard)
router.get('/usuario/:id_usuario/historico', registroGlicoseController.getHistorico)
router.get('/usuario/:id_usuario', registroGlicoseController.showByUserId)
router.get('/:id', registroGlicoseController.show)
router.post('/', registroGlicoseController.create)
router.put('/:id', registroGlicoseController.update)
router.delete('/:id', registroGlicoseController.deleteById)

module.exports = router
