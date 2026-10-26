const express = require('express')
const periodoController = require('../controllers/periodoController')
const { requireAuth, requireDoctor } = require('../middlewares/requireAuth')

const router = express.Router()

router.get('/', periodoController.index)
router.get('/:id', periodoController.show)
router.post('/', requireAuth, requireDoctor, periodoController.create)
router.put('/:id', requireAuth, requireDoctor, periodoController.update)
router.delete('/:id', requireAuth, requireDoctor, periodoController.deleteById)

module.exports = router
