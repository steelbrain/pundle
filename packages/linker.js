require('shelljs/global')

ls('*').forEach(dir => {
  exec('npm link')
})
