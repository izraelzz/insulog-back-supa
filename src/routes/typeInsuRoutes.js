const express = require('express')
const typeInsuController = require('../controllers/typeInsuController')
const { requireAuth, requireDoctor } = require('../middlewares/requireAuth')

const router = express.Router()

router.get('/', typeInsuController.index)
router.get('/:id', typeInsuController.show)
router.post('/', requireAuth, requireDoctor, typeInsuController.create)
router.put('/:id', requireAuth, requireDoctor, typeInsuController.update)
router.delete('/:id', requireAuth, requireDoctor, typeInsuController.deleteById)

module.exports = router
