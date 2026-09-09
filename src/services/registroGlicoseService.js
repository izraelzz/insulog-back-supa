const registroGlicoseRepository = require('../repositories/registroGlicoseRepository')
const userRepository = require('../repositories/userRepository')

const TODOS_DIAS_SEMANA = ['SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SAB', 'DOM']

async function listRegistrosGlicose() {
  return await registroGlicoseRepository.findAll()
}

async function getRegistroGlicoseById(id) {
  const registroGlicose = await registroGlicoseRepository.findDetalhadoById(id)

  if (!registroGlicose) {
    const error = new Error('Registro de glicose nao encontrado')
    error.statusCode = 404
    throw error
  }

  return registroGlicose
}

function normalizarQuantidade(quantidade) {
  if (quantidade === undefined || quantidade === null || quantidade === '') {
    return undefined
  }

  const quantidadeNormalizada = Number(quantidade)

  if (!Number.isInteger(quantidadeNormalizada) || quantidadeNormalizada <= 0) {
    const error = new Error('Quantidade deve ser um numero inteiro maior que zero')
    error.statusCode = 400
    throw error
  }

  return quantidadeNormalizada
}

async function getRegistrosGlicoseByUserId(usuario, quantidade) {
  const usuarioId = Number(usuario)
  const useId = Number.isNaN(usuarioId)
    ? await userRepository.findByLogin(usuario)
    : { id_usuario: usuarioId }

  if (!useId) {
    const error = new Error('Usuario nao encontrado')
    error.statusCode = 400
    throw error
  }

  const quantidadeRegistros = normalizarQuantidade(quantidade)
  const registrosGlicose = await registroGlicoseRepository.findByUserId(useId.id_usuario, quantidadeRegistros)

  if (!registrosGlicose || registrosGlicose.length === 0) {
    const error = new Error('Nenhum registro de glicose encontrado para este usuario')
    error.statusCode = 404
    throw error
  }

  return registrosGlicose.map(formatarRegistroResumo)
}

function classificarGlicose(valor) {
  if (valor < 70) {
    return {
      status: 0,
      descricao: 'Baixa'
    }
  }

  if (valor > 125) {
    return {
      status: 2,
      descricao: 'Alta'
    }
  }

  return {
    status: 1,
    descricao: 'Normal'
  }
}

function formatarRegistroResumo(registro) {
  const nivelGlicose = Number(registro.nivel_glicose)
  const classificacao = classificarGlicose(nivelGlicose)

  return {
    id: registro.id_registro,
    horaDoRegistro: registro.data_hora,
    periodo: registro.periodo,
    nivelGlicose: Math.round(nivelGlicose),
    status: classificacao.status,
    statusDescricao: classificacao.descricao
  }
}

function formatarData(data) {
  if (typeof data === 'string') {
    return data.split(' ')[0].split('T')[0]
  }

  const pad = numero => String(numero).padStart(2, '0')
  const ano = data.getFullYear()
  const mes = pad(data.getMonth() + 1)
  const dia = pad(data.getDate())

  return `${ano}-${mes}-${dia}`
}

function formatarDataHoraAtual() {
  const agora = new Date()

  const pad = numero => String(numero).padStart(2, '0')

  const ano = agora.getFullYear()
  const mes = pad(agora.getMonth() + 1)
  const dia = pad(agora.getDate())
  const hora = pad(agora.getHours())
  const minuto = pad(agora.getMinutes())
  const segundo = pad(agora.getSeconds())

  return `${ano}-${mes}-${dia} ${hora}:${minuto}:${segundo}`
}

function montarRegistroCompleto(data, registroAtual = {}) {
  const id_usuario = data.id_usuario ?? registroAtual.id_usuario
  const nivel_glicose = data.nivel_glicose ?? registroAtual.nivel_glicose
  const id_periodo = data.id_periodo ?? registroAtual.id_periodo
  const data_hora = data.data_hora ?? registroAtual.data_hora ?? formatarDataHoraAtual()
  const observacao = data.observacao ?? registroAtual.observacao ?? null

  return {
    id_usuario,
    nivel_glicose,
    data_hora,
    id_periodo,
    observacao
  }
}

function validarGlicoseObrigatoria(glicose) {
  if (!glicose.id_usuario || glicose.nivel_glicose === undefined || !glicose.id_periodo) {
    const error = new Error('ID do usuario, nivel de glicose e periodo sao obrigatorios')
    error.statusCode = 400
    throw error
  }
}

function normalizarInsulina(data) {
  const insulina = data.insulina

  if (insulina === null) {
    return null
  }

  if (!insulina && data.id_tipo_insulina === undefined && data.unidade_insulina === undefined) {
    return undefined
  }

  const dadosInsulina = insulina || {
    id_tipo_insulina: data.id_tipo_insulina,
    unidade_insulina: data.unidade_insulina
  }

  if (Number(dadosInsulina.id_tipo_insulina) === 0 && Number(dadosInsulina.unidade_insulina) === 0) {
    return undefined
  }

  if (!dadosInsulina.id_tipo_insulina || dadosInsulina.unidade_insulina === undefined) {
    const error = new Error('Tipo de insulina e quantidade sao obrigatorios quando a insulina for informada')
    error.statusCode = 400
    throw error
  }

  return {
    id_tipo_insulina: dadosInsulina.id_tipo_insulina,
    unidade_insulina: dadosInsulina.unidade_insulina
  }
}

function normalizarLembrete(data, id_periodo) {
  const lembrete = data.lembrete

  if (lembrete === null) {
    return null
  }

  if (!lembrete || lembrete.criar === false) {
    return undefined
  }

  if (!lembrete.data_hora) {
    const error = new Error('Horario do lembrete e obrigatorio quando o lembrete for criado')
    error.statusCode = 400
    throw error
  }

  return {
    data_hora: lembrete.data_hora,
    id_periodo: lembrete.id_periodo || id_periodo,
    dias_semana: TODOS_DIAS_SEMANA,
    tem_som: false,
    tem_vibracao: true
  }
}

async function getDashboardDados(id_usuario, dataInicio, dataFim) {
  if (!id_usuario) {
    const error = new Error('ID do usuario e obrigatorio')
    error.statusCode = 400
    throw error
  }

  if (!dataInicio || !dataFim) {
    const error = new Error('Data de inicio e fim sao obrigatorias')
    error.statusCode = 400
    throw error
  }

  const registros = await registroGlicoseRepository.findByUserIdAndPeriod(
    id_usuario,
    dataInicio,
    dataFim
  )

  if (!registros || registros.length === 0) {
    return {
      mensagem: 'Nenhum registro nesse periodo',
      mediaDiaria: 0,
      statusMediaDiaria: 1,
      statusMediaDiariaDescricao: 'Normal',
      registros: []
    }
  }

  const registrosNormalizados = registros.map(reg => ({
    ...reg,
    nivel_glicose: Number(reg.nivel_glicose)
  }))

  const dataAtual = formatarData(new Date())

  const registrosDoDiaAtual = registrosNormalizados.filter(reg => {
    const dataRegistro = formatarData(reg.data_hora)
    return dataRegistro === dataAtual
  })

  let mediaDiaria = 0

  if (registrosDoDiaAtual.length > 0) {
    const somaDiaAtual = registrosDoDiaAtual.reduce((acc, reg) => {
      return acc + reg.nivel_glicose
    }, 0)

    mediaDiaria = somaDiaAtual / registrosDoDiaAtual.length
  }

  const mediaDiariaArredondada = Math.round(mediaDiaria)
  const classificacaoMediaDiaria = classificarGlicose(mediaDiariaArredondada)

  const registrosFormatados = registrosNormalizados.map(formatarRegistroResumo)

  return {
    mediaDiaria: mediaDiariaArredondada,
    statusMediaDiaria: classificacaoMediaDiaria.status,
    statusMediaDiariaDescricao: classificacaoMediaDiaria.descricao,
    registros: registrosFormatados
  }
}

async function getHistorico(id_usuario, dataInicio, dataFim) {
  if (!id_usuario) {
    const error = new Error('ID do usuario e obrigatorio')
    error.statusCode = 400
    throw error
  }

  if (!dataInicio || !dataFim) {
    const error = new Error('Data de inicio e fim sao obrigatorias')
    error.statusCode = 400
    throw error
  }

  if (Number.isNaN(Date.parse(dataInicio)) || Number.isNaN(Date.parse(dataFim))) {
    const error = new Error('Data de inicio e fim devem ser datas validas')
    error.statusCode = 400
    throw error
  }

  if (new Date(dataInicio) > new Date(dataFim)) {
    const error = new Error('Data de inicio nao pode ser posterior a data de fim')
    error.statusCode = 400
    throw error
  }

  const registros = await registroGlicoseRepository.findByUserIdAndPeriod(
    id_usuario,
    dataInicio,
    dataFim,
    'ASC'
  )

  const registrosNormalizados = registros.map(registro => ({
    ...registro,
    nivel_glicose: Number(registro.nivel_glicose)
  }))

  const soma = registrosNormalizados.reduce((total, registro) => {
    return total + registro.nivel_glicose
  }, 0)

  const media = registrosNormalizados.length > 0
    ? Math.round(soma / registrosNormalizados.length)
    : 0

  const totaisPorStatus = registrosNormalizados.reduce((totais, registro) => {
    const { status } = classificarGlicose(registro.nivel_glicose)
    totais[status] += 1
    return totais
  }, { 0: 0, 1: 0, 2: 0 })

  const classificacaoMedia = registrosNormalizados.length > 0
    ? classificarGlicose(media)
    : { status: 1, descricao: 'Normal' }

  return {
    media,
    totalBaixos: totaisPorStatus[0],
    totalNormais: totaisPorStatus[1],
    totalAlertas: totaisPorStatus[2],
    statusMedia: classificacaoMedia.status,
    statusMediaDescricao: classificacaoMedia.descricao,
    registros: registrosNormalizados.map(formatarRegistroResumo)
  }
}

async function createRegistroGlicose(data) {
  const glicose = montarRegistroCompleto(data)
  validarGlicoseObrigatoria(glicose)

  const insulina = normalizarInsulina(data)
  const lembrete = normalizarLembrete(data, glicose.id_periodo)

  if (!insulina && !lembrete) {
    const registro = await registroGlicoseRepository.create(glicose)
    return await registroGlicoseRepository.findDetalhadoById(registro.id_registro)
  }

  return await registroGlicoseRepository.createCompleto({
    glicose,
    insulina,
    lembrete
  })
}

async function updateRegistroGlicose(id, data) {
  const registroGlicose = await registroGlicoseRepository.findById(id)

  if (!registroGlicose) {
    const error = new Error('Registro de glicose nao encontrado')
    error.statusCode = 404
    throw error
  }

  const glicose = montarRegistroCompleto(data, registroGlicose)
  validarGlicoseObrigatoria(glicose)

  const insulina = normalizarInsulina(data)
  const lembrete = normalizarLembrete(data, glicose.id_periodo)

  return await registroGlicoseRepository.updateCompleto(id, {
    glicose,
    insulina,
    lembrete
  })
}

async function deleteById(id) {
  const registroGlicose = await registroGlicoseRepository.findById(id)

  if (!registroGlicose) {
    const error = new Error('Registro de glicose nao encontrado')
    error.statusCode = 404
    throw error
  }

  await registroGlicoseRepository.deleteById(id)
}

module.exports = {
  listRegistrosGlicose,
  getRegistroGlicoseById,
  createRegistroGlicose,
  updateRegistroGlicose,
  deleteById,
  getRegistrosGlicoseByUserId,
  getDashboardDados,
  getHistorico
}
