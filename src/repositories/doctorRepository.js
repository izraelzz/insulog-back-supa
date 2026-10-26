const { pool } = require('../config/database')

async function createInvite(idMedico, codigoHash, expiresAt) {
  await pool.execute(
    'INSERT INTO codigo_vinculo_medico (id_medico, codigo_hash, expira_em) VALUES (?, ?, ?)',
    [idMedico, codigoHash, expiresAt]
  )
}

async function findPatientsByDoctor(idMedico) {
  const [rows] = await pool.execute(
    `SELECT
      u.id_usuario,
      u.nome,
      u.email,
      (SELECT AVG(rg.nivel_glicose)
       FROM registroglicose rg
       WHERE rg.id_usuario = p.id_usuario
         AND rg.data_hora >= LOCALTIMESTAMP - INTERVAL '7 days') AS media_glicose_7_dias,
      (SELECT COUNT(*)
       FROM registroglicose rg
       WHERE rg.id_usuario = p.id_usuario
         AND rg.data_hora >= LOCALTIMESTAMP - INTERVAL '7 days') AS registros_7_dias,
      (SELECT to_char(rg.data_hora, 'YYYY-MM-DD HH24:MI:SS')
       FROM registroglicose rg
       WHERE rg.id_usuario = p.id_usuario
       ORDER BY rg.data_hora DESC, rg.id_registro DESC
       LIMIT 1) AS ultimo_registro,
      (SELECT rg.nivel_glicose
       FROM registroglicose rg
       WHERE rg.id_usuario = p.id_usuario
       ORDER BY rg.data_hora DESC, rg.id_registro DESC
       LIMIT 1) AS ultima_glicose
    FROM paciente p
    INNER JOIN usuario u ON u.id_usuario = p.id_usuario
    WHERE p.id_medico = ?
    ORDER BY u.nome ASC`,
    [idMedico]
  )

  return rows
}

async function findPatientByDoctor(idMedico, idPaciente) {
  const [rows] = await pool.execute(
    `SELECT
      u.id_usuario,
      u.nome,
      u.email,
      (SELECT AVG(rg.nivel_glicose)
       FROM registroglicose rg
       WHERE rg.id_usuario = p.id_usuario
         AND rg.data_hora >= LOCALTIMESTAMP - INTERVAL '7 days') AS media_glicose_7_dias,
      (SELECT COUNT(*)
       FROM registroglicose rg
       WHERE rg.id_usuario = p.id_usuario
         AND rg.data_hora >= LOCALTIMESTAMP - INTERVAL '7 days') AS registros_7_dias,
      (SELECT to_char(rg.data_hora, 'YYYY-MM-DD HH24:MI:SS')
       FROM registroglicose rg
       WHERE rg.id_usuario = p.id_usuario
       ORDER BY rg.data_hora DESC, rg.id_registro DESC
       LIMIT 1) AS ultimo_registro,
      (SELECT rg.nivel_glicose
       FROM registroglicose rg
       WHERE rg.id_usuario = p.id_usuario
       ORDER BY rg.data_hora DESC, rg.id_registro DESC
       LIMIT 1) AS ultima_glicose
    FROM paciente p
    INNER JOIN usuario u ON u.id_usuario = p.id_usuario
    WHERE p.id_medico = ? AND p.id_usuario = ?
    LIMIT 1`,
    [idMedico, idPaciente]
  )

  return rows[0]
}

async function findPatientRecordsByDoctor(idMedico, idPaciente) {
  const [rows] = await pool.execute(
    `SELECT
      rg.id_registro,
      rg.id_usuario,
      rg.nivel_glicose,
      to_char(rg.data_hora, 'YYYY-MM-DD HH24:MI:SS') AS data_hora,
      p.descricao AS periodo,
      string_agg(
        DISTINCT ti.nome || ' · ' || ri.unidade_insulina::text || 'U',
        ', ' ORDER BY ti.nome || ' · ' || ri.unidade_insulina::text || 'U'
      ) AS insulina
    FROM paciente paciente
    INNER JOIN registroglicose rg ON rg.id_usuario = paciente.id_usuario
    LEFT JOIN periodo p ON p.id_periodo = rg.id_periodo
    LEFT JOIN registroinsulina ri ON ri.id_registro = rg.id_registro
    LEFT JOIN tipoinsulina ti ON ti.id_tipo_insulina = ri.id_tipo_insulina
    WHERE paciente.id_medico = ? AND paciente.id_usuario = ?
    GROUP BY rg.id_registro, rg.id_usuario, rg.nivel_glicose, rg.data_hora, p.descricao
    ORDER BY rg.data_hora DESC, rg.id_registro DESC`,
    [idMedico, idPaciente]
  )

  return rows
}

module.exports = {
  createInvite,
  findPatientsByDoctor,
  findPatientByDoctor,
  findPatientRecordsByDoctor
}
