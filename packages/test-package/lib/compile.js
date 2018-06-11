import fs from 'fs'
import path from 'path'
import mkdirp from 'mkdirp'
import { getPundle } from 'pundle-core'

async function main() {
  const pundle = await getPundle({
    directory: path.dirname(__dirname),
  })
  console.time('execute')
  const result = await pundle.execute()
  console.timeEnd('execute')
  console.log('Compiled and writing to fs')
  result.outputs.forEach(({ filePath, sourceMap, contents }) => {
    if (!filePath) {
      // Ignore this one
      return
    }
    const outputPath = path.join(result.directory, filePath)
    mkdirp.sync(path.dirname(outputPath))
    fs.writeFileSync(outputPath, contents)

    if (sourceMap && sourceMap.filePath) {
      const sourceMapPath = path.join(result.directory, sourceMap.filePath)
      mkdirp.sync(path.dirname(sourceMapPath))
      fs.writeFileSync(sourceMapPath, sourceMap.contents)
    }
  })
}
main().catch(console.error)
