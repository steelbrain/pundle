/* @flow */

import type { File, ComponentAny } from 'pundle-api/types'
import type Compilation from './'
import type { ComponentEntry } from './types'

export function *filterComponents(components: Set<ComponentEntry>, type: string): Generator<ComponentEntry, void, void> {
  const array = Array.from(components)
  for (let i = 0, length = array.length; i < length; i++) {
    if (array[i].component.$type === type) {
      yield array[i]
    }
  }
}

export function invokeComponent(compilation: Compilation, component: { component: ComponentAny, config: Object }, ...parameters: Array<any>): Promise<any> {
  return component.component.callback.apply(compilation, [
    // $FlowIgnore: Flow gets confused with so many times
    Object.assign({}, component.component.defaultConfig, component.config),
  ].concat(parameters))
}

// Notes:
// - If we have sourceMap of previous steps but not of latest one, nuke previous sourceMap, it's invalid now
export function mergeResult(file: File, result: ?{ contents: string, sourceMap: ?Object }): void {
  if (!result) {
    return
  }
  if (file.sourceMap && !result.sourceMap) {
    file.sourceMap = null
  }
}
