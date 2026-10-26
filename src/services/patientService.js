const patientRepository = require('../repositories/patientRepository')
const { hashInviteCode } = require('./doctorService')

function createHttpError(message, statusCode) {
  const error = new Error(message)
  error.statusCode = statusCode
  return error
}

async function getDoctorLink(idPaciente) {
  const link = await patientRepository.findDoctorForPatient(idPaciente)
  if (!link) throw createHttpError('Conta de paciente nao encontrada.', 404)

  if (link.id_medico === null) {
    return { vinculado: false, medico: null }
  }

  return {
    vinculado: true,
    medico: {
      id: Number(link.id_medico),
      nome: link.nome,
      email: link.email,
      crm: link.crm
    }
  }
}

async function redeemDoctorInvite(idPaciente, code) {
  if (typeof code !== 'string' || !/^INSU-[A-HJ-NP-Z2-9]{8}$/i.test(code.trim())) {
    throw createHttpError('Informe um codigo de vinculo valido.', 400)
  }

  return patientRepository.redeemPatientInvite(idPaciente, hashInviteCode(code))
}

module.exports = { getDoctorLink, redeemDoctorInvite }
