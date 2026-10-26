const { test } = require('node:test')
const assert = require('node:assert/strict')
const loadService = require('../helpers/load-service.cjs')
const crypto = require('node:crypto')

test('convite tem codigo aleatorio, hash SHA-256 persistido e validade de 24 horas', async t => {
  const now = Date.now()
  const createInvite = t.mock.fn(async () => {})
  const service = loadService(t, 'doctorService', {
    '../repositories/doctorRepository': {
      createInvite,
      findPatientsByDoctor: async () => [],
      findPatientByDoctor: async () => null,
      findPatientRecordsByDoctor: async () => []
    }
  })
  const originalNow = Date.now
  t.mock.method(Date, 'now', () => now)

  const result = await service.createInvite(23)

  assert.match(result.codigo, /^INSU-[A-HJ-NP-Z2-9]{8}$/)
  assert.equal(Date.parse(result.expira_em), now + 24 * 60 * 60 * 1000)
  assert.deepEqual(createInvite.mock.calls[0].arguments, [
    23,
    crypto.createHash('sha256').update(result.codigo).digest('hex'),
    new Date(now + 24 * 60 * 60 * 1000)
  ])
  Date.now = originalNow
})

test('resumo e registros do paciente são consultados somente após validar o vínculo', async t => {
  const findPatientByDoctor = t.mock.fn(async (doctorId, patientId) => (
    doctorId === 23 && patientId === 41
      ? { id_usuario: 41, nome: 'Bia', email: 'bia@example.com', ultima_glicose: '102', media_glicose_7_dias: '98.5', registros_7_dias: '3' }
      : null
  ))
  const findPatientRecordsByDoctor = t.mock.fn(async () => [
    { id_registro: 6, nivel_glicose: '103.5' }
  ])
  const service = loadService(t, 'doctorService', {
    '../repositories/doctorRepository': {
      createInvite: async () => {},
      findPatientsByDoctor: async () => [],
      findPatientByDoctor,
      findPatientRecordsByDoctor
    }
  })

  const patient = await service.getPatient(23, '41')
  assert.equal(patient.id, 41)
  assert.equal(patient.media_glicose_7_dias, 98.5)
  assert.equal(patient.ultima_glicose, 102)
  assert.deepEqual(await service.getPatientRecords(23, '41'), [
    { id_registro: 6, nivel_glicose: 103.5 }
  ])

  await assert.rejects(service.getPatient(99, '41'), { statusCode: 404 })
  await assert.rejects(service.getPatientRecords(99, '41'), { statusCode: 404 })
  assert.equal(findPatientRecordsByDoctor.mock.callCount(), 1)
})

test('resgate valida formato e normaliza convite antes de persistir o hash', async t => {
  const redeemPatientInvite = t.mock.fn(async () => ({ id_paciente: 41, id_medico: 23 }))
  const service = loadService(t, 'patientService', {
    '../repositories/patientRepository': {
      findDoctorForPatient: async () => ({ id_medico: null }),
      redeemPatientInvite
    },
    './doctorService': { hashInviteCode: code => `hash:${code.trim().toUpperCase()}` }
  })

  await assert.rejects(service.redeemDoctorInvite(41, 'invalid'), { statusCode: 400 })
  assert.deepEqual(await service.redeemDoctorInvite(41, ' insu-abcd2345 '), {
    id_paciente: 41,
    id_medico: 23
  })
  assert.deepEqual(redeemPatientInvite.mock.calls[0].arguments, [41, 'hash:INSU-ABCD2345'])
})
