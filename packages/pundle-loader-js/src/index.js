// @flow

import generate from '@babel/generator'
import { createLoader, shouldProcess } from 'pundle-api'

import parse from './parse'
import process from './process'
import { version } from '../package.json'

export default function() {
  return createLoader({
    name: 'pundle-loader-js',
    version,
    async callback(context, options, file) {
      if (!shouldProcess(context.config.rootDirectory, file.filePath, options)) {
        return null
      }
      const ast = parse(context, options, file)
      await process(context, options, file, ast)

      const generated = generate(ast, {
        sourceMaps: true,
      })

      return {
        contents: generated.code,
        sourceMap: generated.map,
      }
    },
    defaultOptions: {
      extensions: ['.js'],
      replaceVariables: {},
    },
  })
}
