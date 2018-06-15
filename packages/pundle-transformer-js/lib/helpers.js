// @flow

export function getName(givenObj: Object, match: Array<string>, maxLength: number = Infinity): string | null {
  let failed = false
  const objName = []

  function getNameOfIdentifier(obj: Object) {
    if (objName.length >= maxLength || failed) return

    if (typeof obj.name === 'string') {
      const currentIndex = objName.length
      objName.push(obj.name)
      if (match.length && match.length > currentIndex && objName[currentIndex] !== match[currentIndex]) {
        failed = true
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
