/* @flow */

import Path from 'path'

export const LINE_BREAK = /\r\n|\n|\r/
export function getLinesCount(text: string): number {
  return text.split(LINE_BREAK).length
}

let nextNumericPath = 1
export const numericPaths: Map<string, string> = new Map()
export function getFilePath(rootDirectory: string, filePath: string, pathType: string, namespace: string): string {
  let toReturn
  if (pathType === 'filePath') {
    toReturn = Path.join(`$${namespace}`, Path.relative(rootDirectory, filePath))
  } else {
    toReturn = numericPaths.get(filePath)
    if (!toReturn) {
      numericPaths.set(filePath, toReturn = (nextNumericPath++).toString())
    }
  }
  return toReturn
}

export async function normalizeEntry(givenEntry: Array<string>, defaultEntry: Array<string>, resolve: ((path: string) => Promise<string>)): Promise<Array<string>> {
  let entry = givenEntry
  if (!Array.isArray(entry)) {
    entry = defaultEntry
  }
  entry = entry.slice()

  for (let i = 0, length = entry.length; i < length; i++) {
    const item = entry[i]
    if (!Path.isAbsolute(item)) {
      entry[i] = await resolve(item)
    }
  }

  return entry
}

export const wrapperHMR = require.resolve('./wrappers/hmr')
export const wrapperNormal = require.resolve('./wrappers/normal')
export async function getWrapperContent(givenWrapper: string, resolve: ((path: string) => Promise<string>), readFile: ((path: string) => Promise<string>)): Promise<string> {
  let wrapper = givenWrapper
  if (wrapper === 'normal') {
    wrapper = wrapperNormal
  } else if (wrapper === 'hmr') {
    wrapper = wrapperHMR
  } else if (wrapper === 'none') {
    return ''
  }
  if (!Path.isAbsolute(wrapper)) {
    wrapper = await resolve(wrapper)
  }
  return await readFile(wrapper)
}
