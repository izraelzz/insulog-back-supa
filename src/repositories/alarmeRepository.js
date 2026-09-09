const dataBase = require('../config/database')
const db = dataBase.pool

function formatAlarme(alarme) {
  return {
    ...alarme,
    dias_semana: alarme.dias_semana ? alarme.dias_semana.split(',') : [],
    ativo: Boolean(alarme.ativo),
    tem_som: Boolean(alarme.tem_som),
    tem_vibracao: Boolean(alarme.tem_vibracao)
  }
}

async function findAll() {
  const [rows] = await db.execute(
    'SELECT id_alarme, id_usuario, data_hora, id_periodo, id_registro, dias_semana, ativo, tem_som, tem_vibracao FROM alarme ORDER BY id_alarme ASC'
  )

  return rows.map(formatAlarme)
}

async function findByUsuarioId(usuarioId) {
  const [rows] = await db.execute(
    'SELECT id_alarme, id_usuario, data_hora, id_periodo, id_registro, dias_semana, ativo, tem_som, tem_vibracao FROM alarme WHERE id_usuario = ? ORDER BY data_hora ASC',
    [usuarioId]
  )
  return rows.map(formatAlarme)
}

async function findById(id) {
  const [rows] = await db.execute(
    'SELECT id_alarme, id_usuario, data_hora, id_periodo, id_registro, dias_semana, ativo, tem_som, tem_vibracao FROM alarme WHERE id_alarme = ?',
    [id]
  )

  return rows[0] ? formatAlarme(rows[0]) : undefined
}

async function create(alarme) {
  const { id_usuario, data_hora, id_periodo, id_registro, dias_semana, ativo, tem_som, tem_vibracao } = alarme
  const conn = await db.getConnection()

  try {
    await conn.beginTransaction()

    const [insertedRows] = await conn.execute(
      'INSERT INTO alarme (id_usuario, data_hora, id_periodo, id_registro, dias_semana, ativo, tem_som, tem_vibracao) VALUES (?, ?, ?, ?, ?, ?, ?, ?) RETURNING id_alarme',
      [id_usuario, data_hora, id_periodo || null, id_registro || null, dias_semana.join(','), ativo, tem_som, tem_vibracao]
    )

    const idAlarme = insertedRows[0].id_alarme

    await conn.commit()

    return {
      id_alarme: idAlarme,
      id_usuario,
      data_hora,
      id_periodo: id_periodo || null,
      id_registro: id_registro || null,
      dias_semana,
      ativo,
      tem_som,
      tem_vibracao
    }
  } catch (error) {
    await conn.rollback()
    throw error
  } finally {
    conn.release()
  }
}

async function update(id, alarme) {
  const { id_usuario, data_hora, id_periodo, id_registro, dias_semana, ativo, tem_som, tem_vibracao } = alarme
  const conn = await db.getConnection()

  try {
    await conn.beginTransaction()

    await conn.execute(
      'UPDATE alarme SET id_usuario = ?, data_hora = ?, id_periodo = ?, id_registro = ?, dias_semana = ?, ativo = ?, tem_som = ?, tem_vibracao = ? WHERE id_alarme = ?',
      [id_usuario, data_hora, id_periodo || null, id_registro || null, dias_semana.join(','), ativo, tem_som, tem_vibracao, id]
    )

    await conn.commit()

    return {
      id_alarme: Number(id),
      id_usuario,
      data_hora,
      id_periodo: id_periodo || null,
      id_registro: id_registro || null,
      dias_semana,
      ativo,
      tem_som,
      tem_vibracao
    }
  } catch (error) {
    await conn.rollback()
    throw error
  } finally {
    conn.release()
  }
}

async function deleteById(id) {
  await db.execute(
    'DELETE FROM alarme WHERE id_alarme = ?',
    [id]
  )
}

module.exports = {
  findAll,
  findByUsuarioId,
  findById,
  create,
  update,
  deleteById
}
