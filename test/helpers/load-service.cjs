const path = require('node:path')

// Injeta dependencias antes do require: nenhum repositorio real ou banco e carregado.
// Cada teste restaura o cache; os arquivos de teste rodam em processos separados.
module.exports = function loadService(t, name, dependencies) {
  const servicePath = require.resolve(`../../src/services/${name}`)
  const previous = new Map()
  const replace = (filename, exports) => {
    previous.set(filename, require.cache[filename])
    require.cache[filename] = { id: filename, filename, loaded: true, exports }
  }

  previous.set(servicePath, require.cache[servicePath])
  delete require.cache[servicePath]
  t.after(() => {
    for (const [filename, cached] of previous) {
      if (cached) require.cache[filename] = cached
      else delete require.cache[filename]
    }
  })

  for (const [relativePath, implementation] of Object.entries(dependencies)) {
    const filename = require.resolve(path.resolve(path.dirname(servicePath), relativePath))
    replace(filename, new Proxy(implementation, {
      get(target, property) {
        if (!(property in target)) {
          return () => {
            throw new Error(`Dependencia nao configurada no teste: ${relativePath}.${String(property)}`)
          }
        }
        return target[property]
      }
    }))
  }
  return require(servicePath)
}
