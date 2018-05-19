import fs from 'fs'
import path from 'path'
import getPundle from 'pundle-core'

async function main() {
  const pundle = await getPundle({
    directory: path.dirname(__dirname),
  })
  const result = await pundle.execute()
  console.log('Compiled and writing to fs')
  result.forEach(output => {
    const { filePath } = output
    if (!filePath) {
      // Ignore this one
      return
    }
    fs.writeFileSync(path.join(pundle.config.output.rootDirectory, filePath), output.contents)
  })
}
main().catch(console.error)
