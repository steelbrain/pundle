// @flow

import fs from 'fs'
import pMap from 'p-map'
import postcss from 'postcss'
import template from '@babel/template'
import generate from '@babel/generator'
import mergeSourceMap from 'merge-source-map'
import sourceMapToComment from 'source-map-to-comment'
import * as t from '@babel/types'
import { posix, dirname, resolve } from 'path'
import { promisifyAll } from 'sb-promisify'
import { createLoader, shouldProcess, normalizeFileName } from 'pundle-api'

import { getRandomID } from './helpers'
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
      const randomId = getRandomID()

      // TODO: Use the input source map and merge the two
      const rootsArr: Array<any> = Array.from(Object.values(roots))
      const aggregatedRoot = rootsArr.slice(1).reduce((entry, curr) => entry.append(curr), rootsArr[0])

      if (options.scoped) {
        aggregatedRoot.nodes.forEach(node => {
          node.selector = `${node.selector}.${randomId}`
        })
      }

      let results = aggregatedRoot.toResult({
        map: options.sourceMap ? { inline: false } : false,
      })

      if (results.map) {
        const currentSourceMap = results.map.toJSON()
        const sourceMap = file.sourceMap ? mergeSourceMap(file.sourceMap, currentSourceMap) : currentSourceMap
        results += `\n${sourceMapToComment(sourceMap, { type: 'css' })}`
      }

      const processModule = await context.resolveSimple('process', file.filePath)
      const ast = template.ast(`
        ${file.imports.map(i => `require(${JSON.stringify(i)})`).join('\n')}
        var style = document.createElement('style')
        style.type = 'text/css'
        if (require(${JSON.stringify(processModule)}).env.NODE_ENV === "development" && module.hot && module.hot.dispose) {
          module.hot.dispose(function() {
            style.remove()
          })
        }
        style.textContent = ${JSON.stringify(results)}
        document.head.appendChild(style)
        module.exports = ${JSON.stringify(options.scoped ? randomId : null)}
      `)
      const generated = generate(t.program(ast))
      file.addImport(processModule)

      return {
        contents: generated.code,
        sourceMap: null,
      }
    },
    defaultOptions: {
      sourceMap: true,
      extensions: ['.css'],
      scoped: false,
    },
  })
}
