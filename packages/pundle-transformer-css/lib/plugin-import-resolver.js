// @flow

import { plugin } from 'postcss'
import { getChunk } from 'pundle-api'

export default plugin('pundle-transformer-css', function({ resolve, addChunk }) {
  return function(css) {
    let promise

    css.walkAtRules('import', function(rule) {
      const { params } = rule

      if (!params.startsWith('"') || !params.endsWith('"')) return

      let request = params.slice(1, -1)

      if (request.slice(0, 1) !== '.') {
        request = `./${request}`
      }

      promise = resolve(request, rule.source.start).then(resolved => {
        const importChunk = getChunk(resolved.format, null, resolved.filePath)
        rule.remove()
        return addChunk(importChunk)
      })
    })

    return promise
  }
})
