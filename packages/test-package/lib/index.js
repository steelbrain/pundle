import path from 'path'
import getPundle from 'pundle-core'

async function main() {
  const pundle = await getPundle({
    directory: path.dirname(__dirname),
  })
  const result = await pundle.execute()
  console.log('result', result)
}
main().catch(console.error)
