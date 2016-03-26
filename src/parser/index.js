'use strict'

/* @flow */

import { transform } from 'babel-core'
import type { Pundle$Config } from '../types'

export default function parseModule(config: Pundle$Config, filePath: string, body: string): {
  map: Object,
  code: string,
  imports: Array<string>
} {
  const parsed = transform(body, {
    plugins: [require('./modulifier')],
    filename: filePath,
    sourceMaps: 'both'
  })
  const imports = []

  for (const entry of parsed.metadata.modules.imports) {
    imports.push(entry.source)
  }

  return {
    map: parsed.map,
    code: parsed.code,
    imports
  }
}
