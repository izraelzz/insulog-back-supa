const { decomporData } = require('./padraoGlicose')

function prepararRegistrosCompletos(relatorio) {
  return relatorio.registros.map(registro => ({ ...registro, ...decomporData(registro.dataHora) }))
    .sort((a, b) => a.data.localeCompare(b.data) || a.hora - b.hora || a.minuto - b.minuto)
    .flatMap(registro => {
      const [ano, mes, dia] = registro.data.split('-')
      const dataHora = `${dia}/${mes}/${ano} ${String(registro.hora).padStart(2, '0')}:${String(registro.minuto).padStart(2, '0')}`
      const aplicacoes = registro.insulinas.length ? registro.insulinas : [null]
      return aplicacoes.map((aplicacao, indice) => [
        dataHora,
        `${new Intl.NumberFormat('pt-BR').format(registro.glicose)} mg/dL`,
        registro.classificacao,
        registro.periodo || '-',
        aplicacao ? `${new Intl.NumberFormat('pt-BR').format(aplicacao.unidades)} UI` : '-',
        aplicacao ? aplicacao.tipo : '-',
        indice === 0 ? registro.observacao || '-' : 'Aplicação adicional do mesmo registro.'
      ])
    })
}

module.exports = { prepararRegistrosCompletos }
