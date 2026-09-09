const alarmeRepository = require('../repositories/alarmeRepository')

const DIAS_SEMANA_VALIDOS = ['SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SAB', 'DOM']

function normalizarDiasSemana(diasSemana) {
  const dias = Array.isArray(diasSemana)
    ? diasSemana
    : typeof diasSemana === 'string'
      ? diasSemana.split(',')
      : []
  const diasNormalizados = [...new Set(dias.map(dia => String(dia).trim().toUpperCase()).filter(Boolean))]

  if (diasNormalizados.length === 0 || diasNormalizados.some(dia => !DIAS_SEMANA_VALIDOS.includes(dia))) {
    const error = new Error(`dias_semana deve conter ao menos um destes valores: ${DIAS_SEMANA_VALIDOS.join(', ')}`)
    error.statusCode = 400
    throw error
  }

  return DIAS_SEMANA_VALIDOS.filter(dia => diasNormalizados.includes(dia))
}

function normalizarBooleano(valor, valorPadrao, nomeCampo) {
  if (valor === undefined) return valorPadrao
  if (valor === true || valor === 1 || valor === '1' || valor === 'true') return true
  if (valor === false || valor === 0 || valor === '0' || valor === 'false') return false

  const error = new Error(`${nomeCampo} deve ser um valor booleano`)
  error.statusCode = 400
  throw error
}

async function listAlarmes() {
  return await alarmeRepository.findAll()
}

async function getAlarmesByUsuarioId(usuarioId) {
  const id = Number(usuarioId)

  if (!Number.isInteger(id) || id <= 0) {
    const error = new Error('ID do usuario deve ser um numero inteiro maior que zero')
    error.statusCode = 400
    throw error
  }

  return await alarmeRepository.findByUsuarioId(id)
}

async function getAlarmeById(id) {
  const alarme = await alarmeRepository.findById(id)

  if (!alarme) {
    const error = new Error('Alarme nao encontrado')
    error.statusCode = 404
    throw error
  }

  return alarme
}

async function createAlarme(data) {
  const { id_usuario, data_hora, id_periodo, id_registro, dias_semana, ativo, tem_som, tem_vibracao } = data

  if (!id_usuario || !data_hora) {
    const error = new Error('Todos os campos sao obrigatorios')
    error.statusCode = 400
    throw error
  }

  return await alarmeRepository.create({
    id_usuario,
    data_hora,
    id_periodo,
    id_registro,
    dias_semana: normalizarDiasSemana(dias_semana),
    ativo: normalizarBooleano(ativo, true, 'ativo'),
    tem_som: normalizarBooleano(tem_som, true, 'tem_som'),
    tem_vibracao: normalizarBooleano(tem_vibracao, true, 'tem_vibracao')
  })
}

async function updateAlarme(id, data) {
  const alarme = await alarmeRepository.findById(id)

  if (!alarme) {
    const error = new Error('Alarme nao encontrado')
    error.statusCode = 404
    throw error
  }

  const { id_usuario, data_hora, id_periodo, id_registro, dias_semana, ativo, tem_som, tem_vibracao } = data

  if (!id_usuario || !data_hora) {
    const error = new Error('Todos os campos sao obrigatorios')
    error.statusCode = 400
    throw error
  }

  return await alarmeRepository.update(id, {
    id_usuario,
    data_hora,
    id_periodo,
    id_registro,
    dias_semana: normalizarDiasSemana(dias_semana === undefined ? alarme.dias_semana : dias_semana),
    ativo: normalizarBooleano(ativo, alarme.ativo, 'ativo'),
    tem_som: normalizarBooleano(tem_som, alarme.tem_som, 'tem_som'),
    tem_vibracao: normalizarBooleano(tem_vibracao, alarme.tem_vibracao, 'tem_vibracao')
  })
}

async function deleteById(id) {
  const alarme = await alarmeRepository.findById(id)

  if (!alarme) {
    const error = new Error('Alarme nao encontrado')
    error.statusCode = 404
    throw error
  }

  await alarmeRepository.deleteById(id)
}

module.exports = {
  listAlarmes,
  getAlarmesByUsuarioId,
  getAlarmeById,
  createAlarme,
  updateAlarme,
  deleteById
}
