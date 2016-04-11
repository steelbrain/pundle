'use strict'

/* @flow */

export type Config = {
  save: true,
  rootDirectory: string,
  onAfterInstall: ((id: number, name: string, error: ?Error) => any),
  onBeforeInstall: ((id: number, name: string) => any)
}
