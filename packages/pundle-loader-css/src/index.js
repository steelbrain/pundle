// @flow

import fs from 'fs'
import pMap from 'p-map'
import postcss from 'postcss'
import { posix, dirname, resolve } from 'path'
import { promisifyAll } from 'sb-promisify'
import { createLoader, shouldProcess, normalizeFileName } from 'pundle-api'

import { version } from '../package.json'

const pfs = promisifyAll(fs)

export default function() {
  return createLoader({
    name: 'pundle-loader-css',
    version,
    async callback(context, options, file) {
      // TODO: Syntax errors
      if (!shouldProcess(context.config.rootDirectory, file.filePath, options)) {
        return null
      }
      const roots: {
        [string]: Object,
      } = {}

      async function processFile(filePath: string, contents: string) {
        if (roots[filePath]) return

        const root = postcss.parse(contents, { from: filePath })
        roots[filePath] = root

        await pMap(root.nodes, async function(node, index) {
          if (node.type !== 'atrule' || node.name !== 'import') return
          const innerContent = node.params.slice(1, -1)
          const prefixed = innerContent.endsWith('.css') ? innerContent : `${innerContent}.css`
          const normalized = prefixed.startsWith('~')
            ? prefixed.slice(1)
            : normalizeFileName(posix.relative(dirname(filePath), prefixed))

          const resolved = await context.resolveSimple(
            normalized,
            resolve(context.config.rootDirectory, filePath),
            node.source.start.line,
            node.source.start.column - 1,
          )

          if (options.scoped) {
            const newContents = await pfs.readFileAsync(resolve(context.config.rootDirectory, resolved), 'utf8')
            await processFile(resolved, newContents)
          } else {
            file.addImport(resolved)
          }
          root.nodes.splice(index, 1)
        })
      }

      await processFile(file.fileName, file.contents)

      // TODO: Join all roots and convert to css
      console.log(roots)
      return null
    },
    defaultOptions: {
      extensions: ['.css'],
      scoped: false,
    },
  })
}
