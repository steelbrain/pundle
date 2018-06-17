// @flow

import net from 'net'

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
