// @flow

import manifest from '../package.json'
import type { Component, ComponentType, ComponentIssueReporterCallback, ComponentIssueReporter } from './types'

const apiVersion = parseInt(manifest.version.split('.').shift(), 10)

type Payload<T> = {|
  name: string,
  version: string,
  weight?: number,
  callback: T,
|}
function createComponent<T1: ComponentType, T2>(
  type: T1,
  { name, version, weight = 100, callback }: Payload<T2>,
): Component<T1, T2> {
  return {
    name,
    version,
    type,
    weight,
    callback,
    apiVersion,
  }
}

export function createIssueReporter(payload: Payload<ComponentIssueReporterCallback>): ComponentIssueReporter {
  return createComponent('issue-reporter', payload)
}
