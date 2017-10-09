// @flow

import { Context, Components, ComponentOptions } from 'pundle-api'
import parseConfig from 'pundle-core-parse-config'
import type { BaseConfig } from 'pundle-api/types'

class Pundle {
  components: Components
  options: ComponentOptions
  config: BaseConfig
  context: Context

  constructor({
    components,
    options,
    config,
    context,
  }: {
    components: Components,
    options: ComponentOptions,
    config: BaseConfig,
    context: Context,
  }) {
    this.config = config
    this.components = components
    this.options = options
    this.context = context
  }
}

export default async function getPundle(config: Object): Promise<Pundle> {
  const parsed = await parseConfig(config)
  const pundle = new Pundle({
    components: parsed.components,
    options: parsed.options,
    config: parsed.config,
    context: new Context(parsed.components, parsed.options, parsed.config),
  })
  return pundle
}
