'use strict'

/* @flow */

import { transform } from 'babel-core'
import type { Pundle$Config } from '../types'

export default function parseModule(config: Pundle$Config, filePath: string, body: string): string {
  const parsed = transform(body, {
    plugins: [require('./modulifier')],
    filename: filePath,
    sourceMaps: 'both'
  })
  console.log(parsed.code)
  console.log(parsed.ast)
  return parsed.code
}
