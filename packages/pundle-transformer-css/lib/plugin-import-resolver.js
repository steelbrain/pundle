// @flow

import { plugin } from 'postcss'
import { getChunk } from 'pundle-api'

export default plugin('pundle-transformer-css', function({ file, resolve, addChunk }) {
  return function(css) {
    let promise

    css.walkAtRules('import', function(rule) {
      const { params } = rule

      if (!params.startsWith('"') || !params.endsWith('"')) return

      let request = params.slice(1, -1)

      if (request.slice(0, 1) !== '.') {
        request = `./${request}`
      }

      rule.remove()
      if (file.format === 'css') {
        promise = resolve(request, rule.source.start).then(resolved =>
          addChunk(getChunk(resolved.format, null, resolved.filePath)),
        )
      }
    })

    return promise
  }
})
