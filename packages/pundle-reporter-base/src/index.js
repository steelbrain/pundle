// @flow

export default function normalizeError(error: any) {
  // TODO: handle all the different types of issues
  return error && error.messaege ? error.message : error.toString()
}
