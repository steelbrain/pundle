// @flow

import FileIssue from './issues/FileIssue'
import MessageIssue from './issues/MessageIssue'

import matchesRules from './rules/matchesRules'
import shouldProcess from './rules/shouldProcess'

import File from './File'
import Context from './Context'
import Components from './Components'
import ComponentOptions from './ComponentOptions'
import {
  createReporter,
  createResolver,
  createLoader,
  createTransformer,
  createPlugin,
  createGenerator,
  createPostGenerator,
} from './ComponentTypes'

// TODO: Replace all import type { Y } from 'pundle-api/lib/types'
export type * from './types'

export {
  FileIssue,
  MessageIssue,
  matchesRules,
  shouldProcess,
  Components,
  ComponentOptions,
  createReporter,
  createResolver,
  createLoader,
  createTransformer,
  createPlugin,
  createGenerator,
  createPostGenerator,
  File,
  Context,
}
