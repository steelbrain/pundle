import path from 'path'
import getPundle from 'pundle-core'

async function main() {
  const pundle = await getPundle({
    directory: path.dirname(__dirname),
  })
  console.time('execute')
  await pundle.watch({
    adapter: 'chokidar',
    tick({ newFile }) {
      console.log('ticked', newFile.filePath)
    },
    ready() {
      console.log('Ready!')
    },
    compiled() {
      console.log('Compiled & ready to be generated')
    },
  })
}
main().catch(console.error)
