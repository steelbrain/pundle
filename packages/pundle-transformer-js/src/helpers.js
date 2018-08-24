// @flow

import * as t from '@babel/types'

export function getName(givenObj: Object, match: Array<string>, maxLength: number = Infinity): string | null {
  let failed = false
  const objName = []

  function getNameOfIdentifier(obj: Object) {
    if (objName.length >= maxLength || failed) return

    if (typeof obj.name === 'string') {
      const currentIndex = objName.length
      objName.push(obj.name)
      if (match.length > 0 && match.length > currentIndex && objName[currentIndex] !== match[currentIndex]) {
        failed = true
        return
      }
    }
    if (typeof obj.object === 'object') {
      getNameOfIdentifier(obj.object)
    }
    if (typeof obj.property === 'object') {
      getNameOfIdentifier(obj.property)
    }
  }

  getNameOfIdentifier(givenObj)

  if (failed) {
    return null
  }

  return objName.join('.')
}

export function getStringFromLiteralOrTemplate(node: Object) {
  if (t.isStringLiteral(node)) {
    return node
  }
  if (!t.isTemplateLiteral(node)) {
    return null
  }
  if (node.expressions.length !== 0) {
    return null
  }
  if (node.quasis.length !== 1) {
    return null
  }
  const [item] = node.quasis
  if (!t.isTemplateElement(item)) {
    return null
  }
  if (item.value.raw !== item.value.cooked) {
    return null
  }
  return item
}
