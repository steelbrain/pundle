// @flow

// eslint-disable-next-line import/prefer-default-export
export function getRandomID(): string {
  return Math.random()
    .toString(36)
    .substring(7)
}
