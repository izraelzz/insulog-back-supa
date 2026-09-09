const dataBase = require('../config/database')
const db = dataBase.pool

async function findAll() {
  const [rows] = await db.execute(
    'SELECT id_configuracao, id_usuario, idioma, tema, notificacoes FROM configuracao ORDER BY id_configuracao ASC'
  )

  return rows
}

async function findById(id) {
  const [rows] = await db.execute(
    'SELECT id_configuracao, id_usuario, idioma, tema, notificacoes FROM configuracao WHERE id_configuracao = ?',
    [id]
  )

  return rows[0]
}

async function create(configuracao) {
  const { id_usuario, idioma, tema, notificacoes } = configuracao
  const conn = await db.getConnection()

  try {
    await conn.beginTransaction()

    const [insertedRows] = await conn.execute(
      'INSERT INTO configuracao (id_usuario, idioma, tema, notificacoes) VALUES (?, ?, ?, ?) RETURNING id_configuracao',
      [id_usuario, idioma, tema, notificacoes]
    )

    const idConfiguracao = insertedRows[0].id_configuracao

    await conn.commit()

    return {
      id_configuracao: idConfiguracao,
      id_usuario,
      idioma,
      tema,
      notificacoes
    }
  } catch (error) {
    await conn.rollback()
    throw error
  } finally {
    conn.release()
  }
}

async function update(id, configuracao) {
  const { id_usuario, idioma, tema, notificacoes } = configuracao
  const conn = await db.getConnection()

  try {
    await conn.beginTransaction()

    await conn.execute(
      'UPDATE configuracao SET id_usuario = ?, idioma = ?, tema = ?, notificacoes = ? WHERE id_configuracao = ?',
      [id_usuario, idioma, tema, notificacoes, id]
    )

    await conn.commit()

    return {
      id_configuracao: Number(id),
      id_usuario,
      idioma,
      tema,
      notificacoes
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
    'DELETE FROM configuracao WHERE id_configuracao = ?',
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
