// @flow

import type { Severity, ComponentType } from './types'

export const RECOMMENDED_CONCURRENCY = 8
export const VALID_TYPES: Set<ComponentType> = new Set(['resolver', 'reporter', 'loader'])
export const VALID_SEVERITIES: Set<Severity> = new Set(['info', 'warning', 'error'])
