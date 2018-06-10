import fs from 'fs'
import path from 'path'
import { getPundle } from 'pundle-core'

async function main() {
  const pundle = await getPundle({
    directory: path.dirname(__dirname),
  })
  console.time('execute')
  const result = await pundle.execute()
  console.timeEnd('execute')
  console.log('Compiled and writing to fs')
  result.outputs.forEach(output => {
    const { filePath } = output
    if (!filePath) {
      // Ignore this one
      return
    }
    fs.writeFileSync(path.join(result.directory, filePath), output.contents)
  })
}
main().catch(console.error)
