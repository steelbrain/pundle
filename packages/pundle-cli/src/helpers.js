// @flow

import net from 'net'
import get from 'lodash/get'
import path from 'path'

// TODO: Remove this in favor of a non-overkill incremental port checker package
const getPort = options =>
  new Promise((resolve, reject) => {
    const server = net.createServer()

    server.unref()
    server.on('error', reject)

    server.listen(options, () => {
      const { port } = server.address()
      server.close(() => {
        resolve(port)
      })
    })
  })

export function getNextPort(port: number): Promise<number> {
  return getPort({ port }).catch(() => getNextPort(port + 1))
}

export function getStaticMappings(pundle: $FlowFixMe, config: Object): Array<{ local: string, remote: string }> {
  const mappings = []
  const configStatic = [].concat(get(config, 'dev.static', []))

  configStatic.forEach(function(item) {
    if (typeof item !== 'string') {
      console.error(`Error: --dev.static expects an array or string. Got ${typeof item}`)
      return
    }

    const chunks = item.split('::')
    if (chunks.length !== 2) {
      console.error(
        `Error: Invalid dev.static path: '${item}'. Expected format is localPath::serverPath eg. ./static::/assets`,
      )
      return
    }
    const resolved = path.resolve(pundle.context.config.rootDirectory, chunks[0])
    mappings.push({ local: resolved, remote: chunks[1] })
  })

  return mappings
}
