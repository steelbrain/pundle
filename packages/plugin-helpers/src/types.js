/* @flow */

export type Rule = string | RegExp
export type Config = {
  include?: Rule | Array<Rule>,
  exclude?: Rule | Array<Rule>,
  extensions: Array<string>,
}
