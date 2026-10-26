const express = require('express')
const patientController = require('../controllers/patientController')
const { requireAuth, requirePatient } = require('../middlewares/requireAuth')

const router = express.Router()

router.use(requireAuth, requirePatient)
router.get('/vinculo', patientController.getDoctorLink)
router.post('/vinculo', patientController.redeemDoctorInvite)

module.exports = router
