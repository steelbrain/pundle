// @flow

import { posix } from 'path'
import { createFileGenerator } from 'pundle-api'

import { version } from '../package.json'

// Injection policy:
// - All chunks without imports
// - First chunk with entry
export default function() {
  return createFileGenerator({
    name: 'pundle-file-generator-html',
    version,
    async callback(context, options, { filePath, contents: bufferContents }, job) {
      if (!filePath.endsWith('.html')) return null
      let contents = bufferContents.toString('utf8')
      const bodyIndex = contents.indexOf('</body>')

      const injections = []
      function pushIntoInjections(chunk) {
        injections.push(
          `<script type="application/javascript" src="${posix.resolve(
            options.publicDirectory,
            `${chunk.label}${chunk.format}`,
          )}"></script>`,
        )
      }

      const chunksWithoutEntries = job.chunks.filter(c => c.entry === null)
      const chunkWithEntry = job.chunks.find(c => c.entry !== null)
      chunksWithoutEntries.forEach(pushIntoInjections)
      if (chunkWithEntry) {
        pushIntoInjections(chunkWithEntry)
      }
      const injectionsString = injections.join('')

      if (bodyIndex) {
        contents = contents.slice(0, bodyIndex) + injectionsString + contents.slice(bodyIndex)
      } else {
        contents += injectionsString
      }

      return {
        contents: Buffer.from(contents),
      }
    },
    defaultOptions: {
      injectChunks: true,
      publicDirectory: '/',
    },
  })
}
