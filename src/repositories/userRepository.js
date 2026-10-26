const dataBase = require('../config/database')
const db = dataBase.pool

async function findAll() {
  const [rows] = await db.execute(
    'SELECT id_usuario, nome, email, tipo_login, tipo_usuario FROM usuario ORDER BY id_usuario ASC'
  )

  return rows
}

async function deleteById(id) {
  const conn = await db.getConnection()

  try {
    await conn.beginTransaction()

    await conn.execute(
      'DELETE FROM paciente WHERE id_usuario = ?',
      [id]
    )

    await conn.execute(
      'DELETE FROM medico WHERE id_usuario = ?',
      [id]
    )

    await conn.execute(
      'DELETE FROM usuario WHERE id_usuario = ?',
      [id]
    )

    await conn.commit()
  } catch (error) {
    await conn.rollback()
    throw error
  } finally {
    conn.release()
  }
}

async function findById(id) {
  const [rows] = await db.execute(
    'SELECT id_usuario, nome, email, tipo_login, tipo_usuario FROM usuario WHERE id_usuario = ?',
    [id]
  )

  return rows[0]
}

async function findByEmail(email) {
  const [rows] = await db.execute(
    'SELECT id_usuario, nome, email, tipo_login, tipo_usuario FROM usuario WHERE LOWER(email) = LOWER(?)',
    [email]
  )

  return rows[0]
}

async function findByLogin(username) {
  const identifier = typeof username === 'string' ? username.trim() : ''
  const byEmail = identifier.includes('@')
  const [rows] = await db.execute(
    `SELECT id_usuario, nome, email, senha, tipo_login, tipo_usuario
     FROM usuario
     WHERE ${byEmail
    ? 'LOWER(email) = LOWER(?)'
    : "LOWER(nome) = LOWER(?) OR LOWER(split_part(btrim(nome), ' ', 1)) = LOWER(?)"}
     LIMIT 2`,
    byEmail ? [identifier] : [identifier, identifier]
  )

  if (rows.length > 1) {
    const error = new Error('Use seu e-mail para entrar com este nome.')
    error.statusCode = 400
    throw error
  }

  return rows[0]
}

async function findByType(tipo_usuario) {
  const [rows] = await db.execute(
    'SELECT id_usuario, nome, email, tipo_login, tipo_usuario FROM usuario WHERE tipo_usuario = ?',
    [tipo_usuario]
  )

  return rows
}

async function create(user, tipoNormalizado) {
  const { nome, email, senha, tipo_login, tipo_usuario, crm } = user

  const conn = await db.getConnection()

  try {
    await conn.beginTransaction()

    const [insertedRows] = await conn.execute(
      'INSERT INTO usuario (nome, email, senha, tipo_login, tipo_usuario) VALUES (?, ?, ?, ?, ?) RETURNING id_usuario',
      [nome, email, senha, tipo_login, tipo_usuario]
    )

    const idUsuario = insertedRows[0].id_usuario

    if (tipoNormalizado === 'medico') {
      await conn.execute(
        `INSERT INTO medico (id_usuario, crm) VALUES (?, ?)`,
        [idUsuario, crm]
      )
    }

    if (tipoNormalizado === 'paciente') {
      await conn.execute(
        'INSERT INTO paciente (id_usuario, id_medico) VALUES (?, NULL)',
        [idUsuario]
      )
    }

    await conn.commit()

    return {
      id: idUsuario,
      nome,
      email
    }
  } catch (error) {
    await conn.rollback()
    throw error
  } finally {
    conn.release()
  }
}

async function update(id, user) {
  const { nome, email, senha, tipo_login, tipo_usuario, id_medico, crm } = user

  const conn = await db.getConnection()

  try {
    await conn.beginTransaction()

    await conn.execute(
      'UPDATE usuario SET nome = ?, email = ?, senha = ?, tipo_login = ?, tipo_usuario = ? WHERE id_usuario = ?',
      [nome, email, senha, tipo_login, tipo_usuario, id]
    )
    await conn.commit()

     return {
      id: id,
      nome,
      email
    }

  } catch (error) {
    await conn.rollback()
    throw error
  } finally {
    conn.release()
  }
}

module.exports = {
  findAll,
  findByEmail,
  findByLogin,
  findById,
  create,
  findByType,
  deleteById,
  update
}
