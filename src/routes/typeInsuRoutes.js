const express = require('express')
const typeInsuController = require('../controllers/typeInsuController')

const router = express.Router()

router.get('/', typeInsuController.index)
router.get('/:id', typeInsuController.show)
router.post('/', typeInsuController.create)
router.put('/:id', typeInsuController.update)
router.delete('/:id', typeInsuController.deleteById)

module.exports = router
