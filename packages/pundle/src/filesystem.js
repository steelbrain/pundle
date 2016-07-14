/* @flow */

import invariant from 'assert'
import { attachable } from './helpers'
import PundlePath from './path'
import type { State, Config } from './types'

const queueContents = new Map()

@attachable('fs')
@PundlePath.attach
export default class Filesystem {
  path: PundlePath;
  state: State;
  cache: Map<string, {
    mtime: string,
    contents: string,
  }>;
  config: Config;

  constructor(state: State, config: Config) {
    this.state = state
    this.cache = new Map()
    this.config = config
  }
  isChanged(givenPath: string): Promise<boolean> {
    const pathIn = this.path.in(givenPath)
    return new Promise(resolve => {
      const oldTime = this.cache.get(pathIn)
      if (!oldTime) {
        resolve(true)
        return
      }
      this.config.fileSystem.stat(this.path.out(pathIn)).then(stat => {
        resolve(stat.mtime.toISOString() !== oldTime.mtime)
      }, function() {
        resolve(true)
      })
    })
  }
  read(givenPath: string): Promise<string> {
    const pathIn = this.path.in(givenPath)
    const pathOut = this.path.out(pathIn)

    let queueValue = queueContents.get(pathIn)
    if (!queueValue) {
      queueContents.set(pathIn, queueValue = this.isChanged(givenPath).then(async changed => {
        if (!changed) {
          const cachedContent = this.cache.get(pathIn)
          invariant(cachedContent)
          return cachedContent.contents
        }
        const newStats = await this.config.fileSystem.stat(pathOut)
        const newContents = (await this.config.fileSystem.readFile(pathOut)).trimRight()
        this.cache.set(pathIn, {
          mtime: newStats.mtime.toISOString(),
          contents: newContents,
        })
        return newContents
      }).then(function(contents) {
        queueContents.delete(pathIn)
        return contents
      }, function(error) {
        queueContents.delete(pathIn)
        throw error
      }))
    }
    return queueValue
  }
}
