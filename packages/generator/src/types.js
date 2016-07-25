/* @flow */

import type { File } from '../../pundle/src/types'

export type Config = {
  contents: Array<File>,
  requires: Array<string>,
  wrapper: 'none' | 'hmr' | 'normal',
  sourceMap: boolean,
  projectName: string,
}
