'use strict'

/* @flow */

export type Pundle$Config = {
  mainFile: string,
  rootDirectory: string
}

export type Pundle$Module = {
  body: string,
  parents: Array<string>,
  filePath: string,
  children: Array<string>
}
