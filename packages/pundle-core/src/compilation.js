// @flow

import type { Context } from 'pundle-api'

export default class Compilation {
  context: Context

  constructor(context: Context) {
    this.context = context
  }
  async build(): Promise<void> {
    console.log('building')
  }
}
