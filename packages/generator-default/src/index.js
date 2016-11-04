/* @flow */

import { createGenerator } from 'pundle-api'
import { SourceMapGenerator, SourceMapConsumer } from 'source-map'
import type { File } from 'pundle-api/types'
import { getLinesCount, getFilePath, normalizeEntry, getWrapperContent } from './helpers'

// Spec:
// - Merge all configs properly
// - If no config.entry is provided, use Pundle's config
// - If config.entry has relatives, resolve them
// - If mergedConfig.wrapper is normal/hmr/absPath use them, otherwise resolve

export default createGenerator(async function(givenConfig: Object, files: Array<File>, runtimeConfig: Object) {
  const mergedConfig = Object.assign({}, givenConfig, runtimeConfig)
  const entry = await normalizeEntry(mergedConfig.entry, this.config.entry, item => this.resolve(item))
  const wrapperContents = await getWrapperContent(mergedConfig.wrapper, item => this.resolve(item), item => this.config.fileSystem.readFile(item))

  const output = [';(function() {', wrapperContents]
  const sourceMap = new SourceMapGenerator({
    skipValidation: true,
  })
  let linesCount = getLinesCount(output.join(''))

  for (let i = 0, length = files.length; i < length; i++) {
    const file = files[i]
    const filePath = getFilePath(this.config.rootDirectory, file.filePath, mergedConfig.pathType, mergedConfig.sourceMapNamespace)
    const fileContents = `__sb_pundle_register("${filePath}", function(__filename, __dirname, require, module, exports) {\n${file.contents}\n});`
    output.push(fileContents)
    linesCount += getLinesCount(fileContents)

    if (!mergedConfig.sourceMap) {
      continue
    }
    const entryMap = new SourceMapConsumer(file.sourceMap)
    for (let _i = 0, _length = entryMap._generatedMappings.length; _i < _length; _i++) {
      const mapping = entryMap._generatedMappings[_i]
      sourceMap.addMapping({
        source: filePath,
        original: { line: mapping.originalLine, column: mapping.originalColumn },
        generated: { line: linesCount + mapping.generatedLine, column: mapping.generatedColumn },
      })
    }
    sourceMap.setSourceContent(filePath, file.source)
  }
  for (let i = 0, length = entry.length; i < length; i++) {
    const entryEntry = getFilePath(this.config.rootDirectory, entry[i], mergedConfig.pathType, mergedConfig.sourceMapNamespace)
    output.push(`__sb_require('${entryEntry}')`)
  }
  output.push('})();')

  return {
    contents: output.join('\n'),
    sourceMap: mergedConfig.sourceMap ? sourceMap.toJSON() : null,
  }
}, {
  entry: [],
  wrapper: 'normal',
  filename: null,
  pathType: 'filePath',
  directory: null,
  sourceMap: false,
  sourceMapNamespace: 'app',
})
