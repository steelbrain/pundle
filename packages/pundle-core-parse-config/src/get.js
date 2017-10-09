// @flow

export default function get(obj: Object, key: string, defaultValue: any): any {
  return typeof obj[key] !== 'undefined' ? obj[key] : defaultValue
}
