'use strict'

/* @flow */

export function isNPMError(stdoutContents: string): boolean {
  return stdoutContents.indexOf('npm ERR') !== -1
}
