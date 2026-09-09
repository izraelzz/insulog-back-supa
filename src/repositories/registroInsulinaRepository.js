const dataBase = require('../config/database')
const db = dataBase.pool

async function findAll() {
  const [rows] = await db.execute(
    'SELECT id_registro_insulina, id_registro, id_tipo_insulina, unidade_insulina FROM registroinsulina ORDER BY id_registro_insulina ASC'
  )

  return rows
}

async function findById(id) {
  const [rows] = await db.execute(
    'SELECT id_registro_insulina, id_registro, id_tipo_insulina, unidade_insulina FROM registroinsulina WHERE id_registro_insulina = ?',
    [id]
  )

  return rows[0]
}

async function findByUserId(id_usuario, quantidade) {
  const limit = quantidade ? ` LIMIT ${quantidade}` : ''

  const [rows] = await db.execute(
    `SELECT
      ri.id_registro_insulina,
      ri.id_registro,
      ri.id_tipo_insulina,
      ri.unidade_insulina,
      rg.id_usuario,
      rg.data_hora,
      ti.nome AS tipo_insulina
    FROM registroinsulina ri
    INNER JOIN registroglicose rg ON rg.id_registro = ri.id_registro
    LEFT JOIN tipoinsulina ti ON ti.id_tipo_insulina = ri.id_tipo_insulina
    WHERE rg.id_usuario = ?
    ORDER BY rg.data_hora DESC${limit}`,
    [id_usuario]
  )

  return rows
}

async function create(registroInsulina) {
  const { id_registro, id_tipo_insulina, unidade_insulina } = registroInsulina
  const conn = await db.getConnection()

  try {
    await conn.beginTransaction()

    const [insertedRows] = await conn.execute(
      'INSERT INTO registroinsulina (id_registro, id_tipo_insulina, unidade_insulina) VALUES (?, ?, ?) RETURNING id_registro_insulina',
      [id_registro, id_tipo_insulina, unidade_insulina]
    )

    const idRegistroInsulina = insertedRows[0].id_registro_insulina

    await conn.commit()

    return {
      id_registro_insulina: idRegistroInsulina,
      id_registro,
      id_tipo_insulina,
      unidade_insulina
    }
  } catch (error) {
    await conn.rollback()
    throw error
  } finally {
    conn.release()
  }
}

async function update(id, registroInsulina) {
  const { id_registro, id_tipo_insulina, unidade_insulina } = registroInsulina
  const conn = await db.getConnection()

  try {
    await conn.beginTransaction()

    await conn.execute(
      'UPDATE registroinsulina SET id_registro = ?, id_tipo_insulina = ?, unidade_insulina = ? WHERE id_registro_insulina = ?',
      [id_registro, id_tipo_insulina, unidade_insulina, id]
    )

    await conn.commit()

    return {
      id_registro_insulina: Number(id),
      id_registro,
      id_tipo_insulina,
      unidade_insulina
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
    'DELETE FROM registroinsulina WHERE id_registro_insulina = ?',
    [id]
  )
}

module.exports = {
  findAll,
  findById,
  findByUserId,
  create,
  update,
  deleteById
}
