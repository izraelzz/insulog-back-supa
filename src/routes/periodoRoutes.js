const express = require('express')
const periodoController = require('../controllers/periodoController')

const router = express.Router()

router.get('/', periodoController.index)
router.get('/:id', periodoController.show)
router.post('/', periodoController.create)
router.put('/:id', periodoController.update)
router.delete('/:id', periodoController.deleteById)

module.exports = router
