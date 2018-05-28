// @flow

import * as yup from 'yup'

function validator(obj) {
  const schema = yup.object(obj)
  return function(input: Object) {
    return schema.validate(input).catch(function(err) {
      if (err && err.name === 'ValidationError') {
        return err.errors
      }
      throw err
    })
  }
}

const resolved = validator({
  format: yup.string().required(),
  filePath: yup.string().required(),
  packageRoot: yup.string(),
})

export { resolved }
