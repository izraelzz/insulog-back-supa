const { pool } = require('../config/database')

async function findDoctorForPatient(idPaciente) {
  const [rows] = await pool.execute(
    `SELECT p.id_medico, u.nome, u.email, m.crm
     FROM paciente p
     LEFT JOIN usuario u ON u.id_usuario = p.id_medico
     LEFT JOIN medico m ON m.id_usuario = p.id_medico
     WHERE p.id_usuario = ?
     LIMIT 1`,
    [idPaciente]
  )

  return rows[0]
}

async function redeemPatientInvite(idPaciente, codigoHash) {
  const conn = await pool.getConnection()

  try {
    await conn.beginTransaction()

    const [patients] = await conn.execute(
      'SELECT id_medico FROM paciente WHERE id_usuario = ? FOR UPDATE',
      [idPaciente]
    )

    if (!patients[0]) {
      const error = new Error('Conta de paciente nao encontrada.')
      error.statusCode = 404
      throw error
    }

    if (patients[0].id_medico !== null) {
      const error = new Error('Este paciente ja esta vinculado a um medico.')
      error.statusCode = 409
      throw error
    }

    const [invites] = await conn.execute(
      `SELECT id_codigo, id_medico
       FROM codigo_vinculo_medico
       WHERE codigo_hash = ? AND resgatado_em IS NULL AND expira_em > NOW()
       FOR UPDATE`,
      [codigoHash]
    )

    if (!invites[0]) {
      const error = new Error('Codigo de vinculo invalido, expirado ou ja utilizado.')
      error.statusCode = 400
      throw error
    }

    const [, linkResult] = await conn.execute(
      'UPDATE paciente SET id_medico = ? WHERE id_usuario = ? AND id_medico IS NULL',
      [invites[0].id_medico, idPaciente]
    )

    if (linkResult.affectedRows !== 1) {
      const error = new Error('Este paciente ja esta vinculado a um medico.')
      error.statusCode = 409
      throw error
    }

    const [, consumeResult] = await conn.execute(
      `UPDATE codigo_vinculo_medico
       SET resgatado_em = NOW(), id_paciente = ?
       WHERE id_codigo = ? AND resgatado_em IS NULL`,
      [idPaciente, invites[0].id_codigo]
    )

    if (consumeResult.affectedRows !== 1) {
      const error = new Error('Este codigo de vinculo ja foi utilizado ou expirou.')
      error.statusCode = 400
      throw error
    }

    await conn.commit()

    return {
      id_paciente: idPaciente,
      id_medico: Number(invites[0].id_medico)
    }
  } catch (error) {
    await conn.rollback()
    throw error
  } finally {
    conn.release()
  }
}

module.exports = { findDoctorForPatient, redeemPatientInvite }
