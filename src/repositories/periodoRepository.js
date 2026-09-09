const dataBase = require('../config/database')
const db = dataBase.pool

async function findAll() {
  const [rows] = await db.execute(
    'SELECT id_periodo, descricao FROM periodo ORDER BY id_periodo ASC'
  )

  return rows
}

async function findById(id) {
  const [rows] = await db.execute(
    'SELECT id_periodo, descricao FROM periodo WHERE id_periodo = ?',
    [id]
  )

  return rows[0]
}

async function create(periodo) {
  const { descricao } = periodo
  const conn = await db.getConnection()

  try {
    await conn.beginTransaction()

    const [insertedRows] = await conn.execute(
      'INSERT INTO periodo (descricao) VALUES (?) RETURNING id_periodo',
      [descricao]
    )

    const idPeriodo = insertedRows[0].id_periodo

    await conn.commit()

    return {
      id_periodo: idPeriodo,
      descricao
    }
  } catch (error) {
    await conn.rollback()
    throw error
  } finally {
    conn.release()
  }
}

async function update(id, periodo) {
  const { descricao } = periodo
  const conn = await db.getConnection()

  try {
    await conn.beginTransaction()

    await conn.execute(
      'UPDATE periodo SET descricao = ? WHERE id_periodo = ?',
      [descricao, id]
    )

    await conn.commit()

    return {
      id_periodo: Number(id),
      descricao
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
    'DELETE FROM periodo WHERE id_periodo = ?',
    [id]
  )
}

module.exports = {
  findAll,
  findById,
  create,
  update,
  deleteById
}
