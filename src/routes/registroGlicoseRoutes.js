const express = require('express')
const registroGlicoseController = require('../controllers/registroGlicoseController')
const {
  requireAuth,
  requireDoctor,
  requirePatient,
  requireOwnUserId,
  requireOwnedGlucoseRecord,
  denyUnlinkedDoctorAccess
} = require('../middlewares/requireAuth')

const router = express.Router()

router.get('/', requireAuth, requireDoctor, denyUnlinkedDoctorAccess)
router.get('/dashboard', requireAuth, requirePatient, requireOwnUserId, registroGlicoseController.getDashboard)
router.get('/usuario/:id_usuario/historico', requireAuth, requirePatient, requireOwnUserId, registroGlicoseController.getHistorico)
router.get('/usuario/:id_usuario', requireAuth, requirePatient, requireOwnUserId, registroGlicoseController.showByUserId)
router.get('/:id', requireAuth, requirePatient, requireOwnedGlucoseRecord, registroGlicoseController.show)
router.post('/', requireAuth, requirePatient, requireOwnUserId, registroGlicoseController.create)
router.put('/:id', requireAuth, requirePatient, requireOwnedGlucoseRecord, registroGlicoseController.update)
router.delete('/:id', requireAuth, requirePatient, requireOwnedGlucoseRecord, registroGlicoseController.deleteById)

module.exports = router
