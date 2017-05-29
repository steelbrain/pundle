/* @flow */

import unique from 'lodash.uniq'
import invariant from 'assert'
import mergeSourceMap from 'merge-source-map'
import type File from '../file'
import type { ComponentConfigured } from '../../types'

// NOTE: The reason we only count in loaders and not transformers even though they could be useful
// in cases like typescript is because the typescript preset includes it's own resolver.
// and it includes it's resolver because if the user decides to specify ext for the default preset one
// it'll break and users won't know why. so it just increases predictability.
export function getAllKnownExtensions(components: Set<ComponentConfigured>): Array<string> {
  let toReturn = []
  for (const entry of components) {
    if (entry.component.$type === 'loader') {
      if (Array.isArray(entry.config.extensions)) {
        toReturn = toReturn.concat(entry.config.extensions)
      } else if (Array.isArray(entry.component.defaultConfig.extensions)) {
        toReturn = toReturn.concat(entry.component.defaultConfig.extensions)
      }
    }
  }
  return unique(toReturn)
}

// Notes:
// - If we have sourceMap of previous steps but not of latest one, nuke previous sourceMap, it's invalid now
export function mergeResult(file: { contents: string, sourceMap: ?Object }, result: ?{ contents: string, sourceMap: ?Object }): void {
  if (!result) {
    return
  }
  if (file.sourceMap && !result.sourceMap) {
    file.sourceMap = null
  } else if (file.sourceMap && result.sourceMap) {
    file.sourceMap = mergeSourceMap(file.sourceMap, result.sourceMap)
  } else if (!file.sourceMap && result.sourceMap) {
    file.sourceMap = result.sourceMap
  }
  file.contents = result.contents
}
