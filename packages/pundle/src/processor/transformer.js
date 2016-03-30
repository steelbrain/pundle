'use strict'

/* @flow */

import traverse from 'babel-traverse'
import { parse } from 'babylon'
import type Pundle from '../index.js'

export default async function transform(filePath: string, content: string, pundle: Pundle): Promise<{
  contents: string,
  imports: Array<string>
}> {
  const imports = []
  const parsed = parse(content, {
    sourceType: 'module',
    plugins: [
      'jsx',
      'flow',
      'asyncFunctions',
      'decorators',
      'classProperties'
    ]
  })
  console.log(parsed)

  return {
    content: parsed.code,
    imports
  }
}
