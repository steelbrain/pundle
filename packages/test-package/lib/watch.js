import path from 'path'
import { getPundle, getWatcher } from 'pundle-core'

async function main() {
  const pundle = await getPundle({
    directory: path.dirname(__dirname),
  })
  await getWatcher({
    pundle,
    tick({ newFile }) {
      console.log('ticked', newFile.filePath)
    },
    ready() {
      console.log('Ready!')
    },
    generate() {
      console.log('Compiled & ready to be generated')
    },
  })
}
main().catch(console.error)
