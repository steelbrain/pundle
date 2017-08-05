import FS from 'sb-fs'
import difference from 'lodash.difference'
import copy from 'sb-copy'
import Path from 'path'
import chalk from 'chalk'
import * as Helpers from './helpers'

export default async function createPundleApp(
  rootDirectory,
  options,
  givenType,
) {
  const configType = givenType === 'full' ? 'full' : 'basic'
  Helpers.colorsIfAppropriate(
    chalk.cyan(`Using configuration type '${configType}'`),
  )

  const name = Path.basename(rootDirectory)
  const vendorDirectory = Path.normalize(Path.join(__dirname, '..', 'vendor'))
  const successful = new Set()
  const everything = new Set()

  try {
    const configSource = Path.join(vendorDirectory, `config-${configType}.js`)
    const configTarget = Path.resolve(rootDirectory, options.configFileName)
    if (!await FS.exists(configTarget)) {
      successful.add(Path.join(vendorDirectory, options.configFileName))
      await FS.writeFile(configTarget, await FS.readFile(configSource))
    }

    await copy(vendorDirectory, rootDirectory, {
      dotFiles: false,
      overwrite: false,
      failIfExists: false,
      filter(source) {
        const basename = Path.basename(source)
        if (basename === 'config-basic.js' || basename === 'config-full.js') {
          return false
        }
        if (FS.statSync(source).isFile()) {
          everything.add(source)
        }
        return true
      },
      tickCallback(source) {
        if (FS.statSync(source).isFile()) {
          successful.add(source)
        }
      },
    })
    Helpers.colorsIfAppropriate(
      `Initializing new app ${chalk.yellow(`'${name}'`)}`,
    )
  } catch (error) {
    console.log(error)
    process.exitCode = 1
  } finally {
    if (successful.size) {
      console.log('These files were successfully copied into the project')
      console.log(
        Array.from(successful)
          .map(e => `- ${Path.relative(vendorDirectory, e)}`)
          .join('\n'),
      )
    }

    const skippedFiles = difference(
      Array.from(everything),
      Array.from(successful),
    )
    if (skippedFiles.length) {
      console.log('These files were skipped')
      console.log(
        skippedFiles
          .map(e => `- ${Path.relative(vendorDirectory, e)}`)
          .join('\n'),
      )
    }

    if (successful.has(Path.join(vendorDirectory, '.pundle.js'))) {
      console.log(
        '\nNOTE: Remember to install the presets that you use\nin your configuration file in your project',
      )
    }
  }
}
