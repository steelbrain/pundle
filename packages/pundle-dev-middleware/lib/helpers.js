// @flow

import { posix as path } from 'path'
import { getPundleConfig } from 'pundle-core'

export async function getOutputFormats(pundleOptions: Object, publicPath: string): { [string]: string | false } {
  const pundleConfig = await getPundleConfig(pundleOptions)
  const { formats } = pundleConfig.output

  const newFormats = {}
  Object.keys(formats).forEach(function(key) {
    const value = formats[key]
    if (value) {
      newFormats[key] = path.join(publicPath, value)
    } else {
      newFormats[key] = value
    }
  })

  return newFormats
}
