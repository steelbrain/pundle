// @flow

import { Context } from 'pundle-api'
import parseConfig from 'pundle-core-parse-config'

class Pundle {
  context: Context

  constructor(context: Context) {
    this.context = context
  }
}

export default async function getPundle(config: Object): Promise<Pundle> {
  const parsed = await parseConfig(config)
  const context = new Context(parsed.components, parsed.options, parsed.config)
  return new Pundle(context)
}
