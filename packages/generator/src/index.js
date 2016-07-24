/* @flow */

import type Pundle from '../../pundle/src'
import type { Config } from './types'

export default function generate(pundle: Pundle, config: Config) {
  console.log('pundle', pundle, 'config', config)
  return {}
}
