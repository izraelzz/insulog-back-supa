const patientService = require('../services/patientService')

async function getDoctorLink(req, res, next) {
  try {
    const link = await patientService.getDoctorLink(req.auth.userId)
    return res.status(200).json(link)
  } catch (error) {
    next(error)
  }
}

async function redeemDoctorInvite(req, res, next) {
  try {
    const link = await patientService.redeemDoctorInvite(
      req.auth.userId,
      req.body?.codigo_vinculo
    )
    return res.status(200).json(link)
  } catch (error) {
    next(error)
  }
}

module.exports = { getDoctorLink, redeemDoctorInvite }
