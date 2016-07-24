/* @flow */

import json from './json'
import javascript from './javascript'
import type Pundle from '../'

export default function applyLoaders(pundle: Pundle) {
  pundle.state.loaders.set('.json', json)
  pundle.state.loaders.set('.js', javascript)
}
