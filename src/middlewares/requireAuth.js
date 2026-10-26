const { verifyToken } = require('../services/authTokenService')
const { pool } = require('../config/database')

function requireAuth(req, res, next) {
  const authorization = req.get('authorization') || ''
  const [scheme, token, extra] = authorization.split(' ')
  const user = scheme === 'Bearer' && token && !extra ? verifyToken(token) : null

  if (!user) {
    return res.status(401).json({ message: 'Autenticacao obrigatoria.' })
  }

  req.auth = user
  return next()
}

function requireDoctor(req, res, next) {
  if (req.auth?.role !== 'medico') {
    return res.status(403).json({ message: 'Acesso exclusivo para medicos.' })
  }

  return next()
}

function requirePatient(req, res, next) {
  if (req.auth?.role !== 'paciente') {
    return res.status(403).json({ message: 'Acesso exclusivo para pacientes.' })
  }

  return next()
}

function denyUserDirectoryAccess(req, res) {
  return res.status(403).json({
    message: 'A listagem global de usuarios aguarda a definicao de uma permissao administrativa.'
  })
}

function requireOwnUserId(req, res, next) {
  const requestedId = req.params.id_usuario ??
    req.params.usuarioId ??
    req.query.id_usuario ??
    req.body?.id_usuario
  const parsedId = typeof requestedId === 'string' && /^[1-9]\d*$/.test(requestedId)
    ? Number(requestedId)
    : typeof requestedId === 'number' ? requestedId : NaN

  if (!Number.isSafeInteger(parsedId) || parsedId !== req.auth.userId) {
    return res.status(403).json({ message: 'Acesso negado aos dados de outro usuario.' })
  }

  return next()
}

function requireOwnUserParam(req, res, next) {
  const requestedId = typeof req.params.id === 'string' && /^[1-9]\d*$/.test(req.params.id)
    ? Number(req.params.id)
    : NaN

  if (!Number.isSafeInteger(requestedId) || requestedId !== req.auth.userId) {
    return res.status(403).json({ message: 'Acesso negado aos dados de outro usuario.' })
  }

  if (req.body?.tipo_usuario &&
      String(req.body.tipo_usuario).toLowerCase() !== req.auth.role) {
    return res.status(403).json({ message: 'O tipo de usuario nao pode ser alterado.' })
  }

  return next()
}

function requireOwnedResource(table, idColumn) {
  return async function checkOwnedResource(req, res, next) {
    try {
      const id = req.params.id
      if (typeof id !== 'string' || !/^[1-9]\d*$/.test(id)) {
        return res.status(404).json({ message: 'Registro nao encontrado.' })
      }

      const [rows] = await pool.execute(
        `SELECT id_usuario FROM ${table} WHERE ${idColumn} = ? LIMIT 1`,
        [id]
      )

      if (!rows[0] || Number(rows[0].id_usuario) !== req.auth.userId) {
        return res.status(404).json({ message: 'Registro nao encontrado.' })
      }

      if (req.body?.id_usuario !== undefined &&
          Number(req.body.id_usuario) !== req.auth.userId) {
        return res.status(403).json({ message: 'O registro nao pode ser transferido para outro usuario.' })
      }

      return next()
    } catch (error) {
      return next(error)
    }
  }
}

async function requireOwnedGlucoseRecord(req, res, next) {
  return requireOwnedResource('registroglicose', 'id_registro')(req, res, next)
}

async function requireOwnedGlucoseReference(req, res, next) {
  try {
    const id = req.body?.id_registro
    if ((typeof id !== 'string' && typeof id !== 'number') ||
        !/^[1-9]\d*$/.test(String(id))) {
      return res.status(404).json({ message: 'Registro de glicose nao encontrado.' })
    }

    const [rows] = await pool.execute(
      'SELECT id_usuario FROM registroglicose WHERE id_registro = ? LIMIT 1',
      [id]
    )

    if (!rows[0] || Number(rows[0].id_usuario) !== req.auth.userId) {
      return res.status(404).json({ message: 'Registro de glicose nao encontrado.' })
    }

    return next()
  } catch (error) {
    return next(error)
  }
}

async function requireOwnedInsulinRecord(req, res, next) {
  try {
    const [rows] = await pool.execute(
      `SELECT rg.id_usuario
       FROM registroinsulina ri
       INNER JOIN registroglicose rg ON rg.id_registro = ri.id_registro
       WHERE ri.id_registro_insulina = ?
       LIMIT 1`,
      [req.params.id]
    )

    if (!rows[0] || Number(rows[0].id_usuario) !== req.auth.userId) {
      return res.status(404).json({ message: 'Registro de insulina nao encontrado.' })
    }

    return next()
  } catch (error) {
    return next(error)
  }
}

function denyUnlinkedDoctorAccess(req, res) {
  return res.status(403).json({
    message: 'A consulta de registros de pacientes por medicos aguarda a implementacao do vinculo medico-paciente.'
  })
}

module.exports = {
  requireAuth,
  requireDoctor,
  requirePatient,
  denyUserDirectoryAccess,
  requireOwnUserId,
  requireOwnUserParam,
  requireOwnedResource,
  requireOwnedGlucoseRecord,
  requireOwnedGlucoseReference,
  requireOwnedInsulinRecord,
  denyUnlinkedDoctorAccess
}
