// @flow

import * as yup from 'yup'

function validate(obj: yup.ObjectSchemaConstructor) {
  const validator = yup.object(obj)

  return function(input: Object) {
    return validator.validate(input)
  }
}

const resolved = validate({
  format: yup.string().required(),
  filePath: yup.string().required(),
  packageRoot: yup
    .string()
    .nullable()
    .required(),
})
const transformed = validate({
  contents: yup.string().required(),
  sourcemap: yup
    .object()
    .nullable(true)
    .required(),
})

export { resolved, transformed }
