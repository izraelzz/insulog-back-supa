const crypto = require('node:crypto')
const doctorRepository = require('../repositories/doctorRepository')

const codeAlphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
const inviteLifetimeHours = 24

function createHttpError(message, statusCode) {
  const error = new Error(message)
  error.statusCode = statusCode
  return error
}

function hashInviteCode(code) {
  return crypto.createHash('sha256').update(code.trim().toUpperCase()).digest('hex')
}

function createInviteCode() {
  const suffix = Array.from(
    { length: 8 },
    () => codeAlphabet[crypto.randomInt(codeAlphabet.length)]
  ).join('')
  return `INSU-${suffix}`
}

function withPatientStatus(patient) {
  const latestGlucose = patient.ultima_glicose === null ? null : Number(patient.ultima_glicose)
  const lastReadingTime = patient.ultimo_registro ? new Date(patient.ultimo_registro).getTime() : null
  const readingIsStale = !lastReadingTime || Date.now() - lastReadingTime > 3 * 24 * 60 * 60 * 1000
  let status = 'adequado'
  let reason = 'Glicemia dentro das faixas esperadas.'

  if (latestGlucose === null) {
    status = 'atencao'
    reason = 'Ainda não há registros de glicose.'
  } else if (latestGlucose < 54 || latestGlucose > 250) {
    status = 'critico'
    reason = `Última glicemia de ${latestGlucose} mg/dL requer atenção imediata.`
  } else if (latestGlucose < 70 || latestGlucose > 140 || readingIsStale) {
    status = 'atencao'
    reason = readingIsStale
      ? 'Sem medição de glicose nos últimos 3 dias.'
      : `Última glicemia de ${latestGlucose} mg/dL fora da faixa usual.`
  }

  return {
    id: Number(patient.id_usuario),
    nome: patient.nome,
    email: patient.email,
    media_glicose_7_dias: patient.media_glicose_7_dias === null ? null : Number(patient.media_glicose_7_dias),
    registros_7_dias: Number(patient.registros_7_dias),
    ultimo_registro: patient.ultimo_registro,
    ultima_glicose: latestGlucose,
    situacao: status,
    motivo_situacao: reason
  }
}

function parsePatientId(id) {
  const patientId = Number(id)
  if (!Number.isSafeInteger(patientId) || patientId <= 0) {
    throw createHttpError('Identificador de paciente invalido.', 400)
  }
  return patientId
}

async function createInvite(idMedico) {
  const code = createInviteCode()
  const expiresAt = new Date(Date.now() + inviteLifetimeHours * 60 * 60 * 1000)
  await doctorRepository.createInvite(idMedico, hashInviteCode(code), expiresAt)

  return { codigo: code, expira_em: expiresAt.toISOString() }
}

async function listPatients(idMedico) {
  const patients = await doctorRepository.findPatientsByDoctor(idMedico)
  return patients.map(withPatientStatus)
}

async function getPatient(idMedico, idPaciente) {
  const patient = await doctorRepository.findPatientByDoctor(idMedico, parsePatientId(idPaciente))
  if (!patient) throw createHttpError('Paciente nao encontrado para este medico.', 404)
  return withPatientStatus(patient)
}

async function getPatientRecords(idMedico, idPaciente) {
  const patientId = parsePatientId(idPaciente)
  const patient = await doctorRepository.findPatientByDoctor(idMedico, patientId)
  if (!patient) throw createHttpError('Paciente nao encontrado para este medico.', 404)

  const records = await doctorRepository.findPatientRecordsByDoctor(idMedico, patientId)
  return records.map(record => ({
    ...record,
    nivel_glicose: Number(record.nivel_glicose)
  }))
}

module.exports = {
  createInvite,
  hashInviteCode,
  withPatientStatus,
  listPatients,
  getPatient,
  getPatientRecords
}
