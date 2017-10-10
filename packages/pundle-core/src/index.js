// @flow

import { Context } from 'pundle-api'
import parseConfig from 'pundle-core-parse-config'

import Compilation from './compilation'

class Pundle {
  context: Context

  constructor(context: Context) {
    this.context = context
  }
  async build(): Promise<void> {
    return new Compilation(this.context).build()
  }
}

export default async function getPundle(config: Object): Promise<Pundle> {
  const parsed = await parseConfig(config)
  const context = new Context(parsed.components, parsed.options, parsed.config)
  return new Pundle(context)
}
