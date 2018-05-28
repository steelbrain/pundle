// @flow

import * as yup from 'yup'

const { validate: resolved } = yup.object({
  format: yup.string().required(),
  filePath: yup.string().required(),
  packageRoot: yup.string().nullable(),
})

export { resolved }
