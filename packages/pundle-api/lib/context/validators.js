// @flow

import * as yup from 'yup'

function validate(obj: yup.ObjectSchemaConstructor) {
  const schema = yup.object(obj)

  return {
    validate(input: Object) {
      return schema.validate(input)
    },
    schema,
  }
}

const { validate: resolved, schema: resolvedSchema } = validate({
  format: yup.string().required(),
  filePath: yup.string().required(),
  packageRoot: yup.string().nullable(),
})
const { validate: transformed } = validate({
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
const { validate: chunk } = validate({
  format: yup.string().required(),
  label: yup.string().nullable(),
  entry: yup.string().nullable(),
  imports: yup.array().of(resolvedSchema),
})

export { resolved, transformed, chunk }
