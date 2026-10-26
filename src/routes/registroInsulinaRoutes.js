const express = require('express')
const registroInsulinaController = require('../controllers/registroInsulinaController')
const {
  requireAuth,
  requireDoctor,
  requirePatient,
  requireOwnUserId,
  requireOwnedGlucoseReference,
  requireOwnedInsulinRecord,
  denyUnlinkedDoctorAccess
} = require('../middlewares/requireAuth')

const router = express.Router()

router.get('/', requireAuth, requireDoctor, denyUnlinkedDoctorAccess)
router.get('/usuario/:id_usuario', requireAuth, requirePatient, requireOwnUserId, registroInsulinaController.showByUserId)
router.get('/:id', requireAuth, requirePatient, requireOwnedInsulinRecord, registroInsulinaController.show)
router.post('/', requireAuth, requirePatient, requireOwnedGlucoseReference, registroInsulinaController.create)
router.put('/:id', requireAuth, requirePatient, requireOwnedInsulinRecord, requireOwnedGlucoseReference, registroInsulinaController.update)
router.delete('/:id', requireAuth, requirePatient, requireOwnedInsulinRecord, registroInsulinaController.deleteById)

module.exports = router
