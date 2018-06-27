// @flow

export default function normalizeError(error: any) {
  // TODO: handle all the different types of issues
  if (error) {
    if (error.message) {
      return error.message
    }
    if (error.stack) {
      return error.stack
    }
  }
  return error
}
