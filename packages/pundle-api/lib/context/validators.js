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
  packageRoot: yup.string().nullable(),
})
const transformed = validate({
  contents: yup
    .mixed()
    .required()
    .test(
      'is-buffer-or-string',
      'Contents must be valid string or Buffer',
      val => typeof val === 'string' || Buffer.isBuffer(val),
    ),
  sourceMap: yup.object().nullable(),
})

export { resolved, transformed }
