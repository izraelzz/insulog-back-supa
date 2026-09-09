const express = require('express')
const registroInsulinaController = require('../controllers/registroInsulinaController')

const router = express.Router()

router.get('/', registroInsulinaController.index)
router.get('/usuario/:id_usuario', registroInsulinaController.showByUserId)
router.get('/:id', registroInsulinaController.show)
router.post('/', registroInsulinaController.create)
router.put('/:id', registroInsulinaController.update)
router.delete('/:id', registroInsulinaController.deleteById)

module.exports = router
