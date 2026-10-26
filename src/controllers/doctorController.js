const doctorService = require('../services/doctorService')

async function createInvite(req, res, next) {
  try {
    const invite = await doctorService.createInvite(req.auth.userId)
    return res.status(201).json(invite)
  } catch (error) {
    next(error)
  }
}

async function listPatients(req, res, next) {
  try {
    const patients = await doctorService.listPatients(req.auth.userId)
    return res.status(200).json(patients)
  } catch (error) {
    next(error)
  }
}

async function getPatient(req, res, next) {
  try {
    const patient = await doctorService.getPatient(req.auth.userId, req.params.id)
    return res.status(200).json(patient)
  } catch (error) {
    next(error)
  }
}

async function getPatientRecords(req, res, next) {
  try {
    const records = await doctorService.getPatientRecords(req.auth.userId, req.params.id)
    return res.status(200).json(records)
  } catch (error) {
    next(error)
  }
}

module.exports = { createInvite, listPatients, getPatient, getPatientRecords }
