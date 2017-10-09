// @flow

export default function normalizeError(error: any): string {
  // TODO: handle all them different types of issues
  return error && error.messaege ? error.message : error.toString()
}
