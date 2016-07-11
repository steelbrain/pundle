/* @flow */

export type Config = {
  save: boolean,
  rootDirectory: string,
  restrictToRoot: boolean,
  onAfterInstall: ((id: number, name: string, error: ?Error) => any),
  onBeforeInstall: ((id: number, name: string) => any)
}
