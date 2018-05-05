import path from 'path'
import getPundle from 'pundle-core'

getPundle({
  directory: path.dirname(__dirname),
}).catch(console.error)
