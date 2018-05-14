// @flow

import globrex from 'globrex'
import type { Config } from 'pundle-core-load-config'

const formatValidatorCache = {}
export function getOutputPath(config: Config, output: { id: string, format: string }): string | false {
  const formatKeys = Object.keys(config.output.formats).sort((a, b) => b.length - a.length)

  const formatOutput = formatKeys.find(formatKey => {
    let regex = formatValidatorCache[formatKey]
    if (!regex) {
      const result = globrex(formatKey)
      regex = result.regex // eslint-disable-line prefer-destructuring
      formatValidatorCache[formatKey] = result.regex
    }

    return regex.test(output.format)
  })

  if (typeof formatOutput === 'undefined') {
    throw new Error(`Unable to find output path for format '${output.format}' in config file`)
  }

  const format = config.output.formats[formatOutput]
  if (format === false) {
    return false
  }
  if (typeof format !== 'string') {
    throw new Error(`config.output.formats.${output.format} MUST be either string OR false`)
  }
  return format.replace('[id]', output.id).replace('[format]', output.format)
}
