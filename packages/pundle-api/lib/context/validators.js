// @flow

import * as yup from 'yup'

const { validate: resolved } = yup.object({
  format: yup.string().required(),
  filePath: yup.string().required(),
  packageRoot: yup
    .string()
    .nullable()
    .required(),
})
const { validate: transformed } = yup.object({
  contents: yup.string().required(),
  sourcemap: yup
    .object()
    .nullable(true)
    .required(),
})

export { resolved, transformed }
