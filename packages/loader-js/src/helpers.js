/* @flow */

import * as t from 'babel-types'
import type { File, FileChunk } from 'pundle-api/types'

export function getName(obj: Object): string {
  if (typeof obj.name === 'string') {
    return obj.name
  }
  const chunks = []
  if (typeof obj.object === 'object') {
    chunks.push(getName(obj.object))
  }
  if (typeof obj.property === 'object') {
    chunks.push(getName(obj.property))
  }
  return chunks.join('.')
}

const STRING_REGEX = /^"[^"]*"$/

// TODO: use babel-template
export function getParsedReplacement(rawValue: any): Object {
  let parsedValue
  if (STRING_REGEX.test(rawValue)) {
    // Extract value between ""
    // Unescape backward slahes
    parsedValue = t.stringLiteral(JSON.parse(rawValue))
  } else if (typeof rawValue === 'number') {
    parsedValue = t.numericLiteral(rawValue)
  } else {
    parsedValue = t.identifier(rawValue)
  }
  return parsedValue
}

// TODO: Validate the path and disallow bad characters in chunk name
// because we use that name as label when writing to disk
export function processSplit(file: File, chunks: Array<FileChunk>, path: Object) {
  const [nodeEntry, nodeCallback, nodeName] = path.node.arguments

  const chunk = this.getChunk(null, nodeName && nodeName.type === 'StringLiteral' ? nodeName.value : null)
  nodeEntry.elements.forEach(element => {
    const request = this.getImportRequest(element.value, file.filePath)
    chunk.imports.push(request)
    element.value = request.id.toString()
  })
  if (nodeCallback && nodeCallback.params.length) {
    const nodeCallbackParam = nodeCallback.params[0]
    path.scope.traverse(nodeCallback, {
      CallExpression: ({ node, scope }) => {
        if (getName(node.callee) === nodeCallbackParam.name && !scope.getBinding(nodeCallbackParam.name)) {
          const request = this.getImportRequest(node.arguments[0].value, file.filePath)
          chunk.imports.push(request)
          node.arguments[0].value = request.id.toString()
        }
      },
    })
  }
  // NOTE: Replace node entry with the new chunk id because we no longer need entry anywhere
  path.node.arguments[0] = t.stringLiteral(chunk.id.toString())
  path.node.arguments[1] = t.identifier('module.id')
  path.node.arguments[2] = nodeCallback

  chunks.push(chunk)
}
