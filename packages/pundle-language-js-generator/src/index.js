// @flow

import invariant from 'assert'
import generate from 'babel-generator'
import { shouldProcess, registerComponent } from 'pundle-api'
import type { ComponentLanguageGenerator } from 'pundle-api/lib/types'

import { version } from '../package.json'

export default function() {
  return registerComponent({
    name: 'pundle-language-js-generator',
    version,
    hookName: 'language-generate',
    callback: (async function(context, options, file) {
      // TODO: Error handling
      if (!shouldProcess(context.config.rootDirectory, file.filePath, options)) {
        return null
      }
      invariant(file.parsed, 'File was not parsed?!')
      const generated = generate(file.parsed.ast, {
        sourceMaps: true,
      })

      return {
        filePath: file.filePath,
        lastModified: file.lastModified,
        sourceContents: file.contents,
        generatedMap: generated.map,
        generatedContents: generated.code,
      }
    }: ComponentLanguageGenerator),
    defaultOptions: {
      extensions: ['.js'],
    },
  })
}
