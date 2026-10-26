const express = require('express')
const doctorController = require('../controllers/doctorController')
const { requireAuth, requireDoctor } = require('../middlewares/requireAuth')

const router = express.Router()

router.use(requireAuth, requireDoctor)
router.post('/vinculos', doctorController.createInvite)
router.get('/pacientes', doctorController.listPatients)
router.get('/pacientes/:id', doctorController.getPatient)
router.get('/pacientes/:id/registros', doctorController.getPatientRecords)

module.exports = router
