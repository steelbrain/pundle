// @flow

import * as yup from 'yup'

function validator(obj) {
  const schema = yup.object(obj)
  return function(input: Object) {
    return schema.validate(input).then(
      function() {
        return null
      },
      function(err) {
        if (err && err.name === 'ValidationError') {
          return err.errors
        }
        throw err
      },
    )
  }
}

const resolved = validator({
  format: yup.string().required(),
  filePath: yup.string().required(),
  packageRoot: yup.string().nullable(),
})

export { resolved }
