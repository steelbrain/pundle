// @flow
/* eslint-disable no-param-reassign */

import { plugin } from 'postcss'
import { getChunk } from 'pundle-api'
import parse from 'postcss-value-parser'

const EXTERNAL_REGEXP = /^[\w]+:\//

// Maybe don't remove rules and make them non-top level chunks that get imported
// by the rules themselves in @import css?
export default plugin('pundle-transformer-css', function({ file, resolve, context, addChunk }) {
  return function(css) {
    const promises = []

    function walkNode(node, referenceNode, topLevel, nodePromises) {
      if (node.type === 'function' && node.value === 'url') {
        node.nodes.some(childNode => walkNode(childNode, referenceNode, topLevel, nodePromises))
      }
      if (node.type !== 'string' || EXTERNAL_REGEXP.test(node.value)) {
        return
      }
      let { value } = node
      if (value.slice(0, 1) !== '.') {
        value = `./${value}`
      }

      nodePromises.push(
        resolve(value, referenceNode.source.start).then(function(resolved) {
          const chunk = getChunk(resolved.format, null, resolved.filePath, [], topLevel)
          node.value = context.getPublicPath(chunk)
          return addChunk(chunk)
        }),
      )
    }

    css.walkDecls(function(decl) {
      if (!decl.value || !decl.value.includes('url')) return
      const parsed = parse(decl.value)
      const nodePromises = []
      parsed.nodes.forEach(function(item) {
        walkNode(item, decl, false, nodePromises)
      })
      if (nodePromises.length) {
        promises.push(
          Promise.all(nodePromises).then(() => {
            decl.value = parsed.toString()
          }),
        )
      }
    })
    css.walkAtRules('import', function(rule) {
      const parsed = parse(rule.params).nodes
      const nodePromises = []
      parsed.forEach(function(item) {
        walkNode(item, rule, true, nodePromises)
      })
      rule.remove()
      if (nodePromises.length) {
        promises.push(Promise.all(nodePromises))
      }
    })

    return Promise.all(promises)
  }
})
