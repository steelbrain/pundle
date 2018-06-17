// @flow

export class WatcherUnavailable extends Error {
  constructor(name: string) {
    super(`Watcher ${name} is unavailable`)
  }
}
