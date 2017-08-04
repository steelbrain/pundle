/* @flow */

import Path from 'path'
import chalk from 'chalk'
import FS from 'sb-fs'
import fileSize from 'filesize'
import invariant from 'assert'
import Pundle from 'pundle'
import promisify from 'sb-promisify'
import type { CLIConfig } from './types'
import type { GeneratorResult } from 'pundle-api/types'

export const mkdirp = promisify(require('mkdirp'))

export function getPundle(options) {
  return Pundle.create({
    debug: options.debug,
    rootDirectory: options.rootDirectory,
    configFileName: options.configFileName,
    output: {
      bundlePath: 'bundle.js',
      publicRoot: '/_/',
      ...options.output,
    },
  })
}

export async function writeToDisk(pundle, options, outputs: Array<GeneratorResult>): Promise<void> {
  await FS.mkdirp(Path.join(options.outputDirectory, '_'))
  await Promise.all(outputs.map(function(output) {
    return FS.writeFile(Path.join(options.outputDirectory, '_', `bundle.${output.chunk.getIdOrLabel()}.js`), output.contents)
  }))

  const indexHtmlSource = Path.join(options.rootDirectory, 'index.html')
  const indexHtmlTarget = Path.join(options.outputDirectory, 'index.html')
  const indexHtml = pundle.fill(await FS.readFile(indexHtmlSource, 'utf8'), outputs.map(o => o.chunk), {
    publicRoot: pundle.config.output.publicRoot,
    bundlePath: pundle.config.output.bundlePath,
  })
  await FS.writeFile(indexHtmlTarget, indexHtml)
}

export function colorsIfAppropriate(content: string): void {
  if (chalk.supportsColor) {
    console.log(content)
  } else {
    console.log(chalk.stripColor(content))
  }
}

export function fillCLIConfig(config: Object): CLIConfig {
  const output = config.output || {}
  const server = config.server || {}
  const toReturn = {}

  toReturn.output = {}
  toReturn.server = {}

  if (output.bundlePath) {
    invariant(typeof output.bundlePath === 'string', 'config.output.bundlePath must be a string')
    toReturn.output.bundlePath = output.bundlePath
  } else toReturn.output.bundlePath = 'bundle.js'
  toReturn.output.sourceMap = !!output.sourceMap
  if (output.sourceMapPath) {
    invariant(typeof output.sourceMapPath === 'string', 'config.output.sourceMapPath must be a string')
    toReturn.output.sourceMapPath = output.sourceMapPath
  } else toReturn.output.sourceMapPath = `${toReturn.output.bundlePath}.map`
  if (output.rootDirectory) {
    invariant(typeof output.rootDirectory === 'string', 'output.rootDirectory must be a string')
    toReturn.output.rootDirectory = output.rootDirectory
  } else toReturn.output.rootDirectory = '.'

  if (server.port) {
    invariant(typeof server.port === 'number' && Number.isFinite(server.port), 'config.server.port must be a valid number')
    toReturn.server.port = server.port
  } else toReturn.server.port = 8080
  if (server.hmrPath) {
    invariant(typeof server.hmrPath === 'string', 'config.server.hmrPath must be a string')
    toReturn.server.hmrPath = server.hmrPath
  } else toReturn.server.hmrPath = '/__sb_pundle_hmr'
  if (server.hmrHost) {
    invariant(typeof server.hmrHost === 'string', 'config.server.hmrHost must be a string')
    toReturn.server.hmrHost = server.hmrHost
  } else toReturn.server.hmrHost = ''
  if (server.bundlePath) {
    invariant(typeof server.bundlePath === 'string', 'config.server.bundlePath must be a string')
    toReturn.server.bundlePath = server.bundlePath
  } else toReturn.server.bundlePath = '/bundle.js'
  if (server.sourceMap) {
    toReturn.server.sourceMap = !!server.sourceMap
  } else toReturn.server.sourceMap = true
  if (server.sourceMapPath) {
    invariant(typeof server.sourceMapPath === 'string', 'config.server.sourceMapPath must be a string')
    toReturn.server.sourceMapPath = server.sourceMapPath
  } else toReturn.server.sourceMapPath = `${toReturn.server.bundlePath}.map`
  if (server.rootDirectory) {
    invariant(typeof server.rootDirectory === 'string', 'config.server.sourceMapPath must be a string')
    toReturn.server.rootDirectory = server.rootDirectory
  } else toReturn.server.rootDirectory = Path.dirname(toReturn.output.bundlePath)
  if (typeof server.redirectNotFoundToIndex !== 'undefined') {
    toReturn.server.redirectNotFoundToIndex = !!server.redirectNotFoundToIndex
  } else toReturn.server.redirectNotFoundToIndex = true

  toReturn.server.hmrReports = typeof server.hmrReports === 'undefined' ? true : !!server.hmrReports

  return toReturn
}

export function build(pundle, options, config) {
  return pundle.generate(null, {
    sourceMap: config.output.sourceMap,
    sourceMapPath: config.output.sourceMapPath,
  }).then(async function(outputs) {
    const outputDirectory = Path.resolve(pundle.config.rootDirectory, config.output.rootDirectory)
    const outputFilePath = Path.resolve(outputDirectory, config.output.bundlePath)
    const outputSourceMapPath = Path.resolve(outputDirectory, config.output.sourceMapPath)

    const writeSourceMap = config.output.sourceMap && config.output.sourceMapPath !== 'inline'
    const outputFilePathExt = Path.extname(outputFilePath)
    const outputSourceMapPathExt = outputSourceMapPath.endsWith('.js.map') ? '.js.map' : Path.extname(outputSourceMapPath)

    await mkdirp(outputDirectory)

    outputs.forEach(function(output) {
      let contents = output.contents
      const currentFilePath = outputFilePath.slice(0, -1 * outputFilePathExt.length) + '.' + output.chunk.getIdOrLabel() + outputFilePathExt
      const currentSourceMapPath = outputSourceMapPath.slice(0, -1 * outputSourceMapPathExt.length) + '.' + output.chunk.getIdOrLabel() + outputSourceMapPathExt

      if (writeSourceMap) {
        contents += `//# sourceMappingURL=${Path.relative(outputDirectory, currentSourceMapPath)}\n`
      }
      FS.writeFileSync(currentFilePath, contents)
      colorsIfAppropriate(`Wrote ${chalk.red(fileSize(output.contents.length))} to '${chalk.blue(Path.relative(options.rootDirectory, currentFilePath))}'`)
      if (writeSourceMap) {
        const sourceMap = JSON.stringify(output.sourceMap)
        FS.writeFileSync(currentSourceMapPath, sourceMap)
        colorsIfAppropriate(`Wrote ${chalk.red(fileSize(sourceMap.length))} to '${chalk.blue(Path.relative(options.rootDirectory, currentSourceMapPath))}'`)
      }
    })

    const indexHtmlSource = Path.join(pundle.config.rootDirectory, 'index.html')
    const indexHtmlTarget = Path.join(outputDirectory, 'index.html')

    const publicRoot = pundle.config.output.publicRoot
    const bundlePath = pundle.config.output.bundlePath
    if (!bundlePath || !publicRoot) {
      // TODO: Make bundlePath and publicRoot required options
      throw new Error('Config.output.bundlePath and config.output.publicRoot must not be null')
    }
    const indexHtml = pundle.fill(await FS.readFile(indexHtmlSource, 'utf8'), outputs.map(o => o.chunk), {
      publicRoot,
      bundlePath,
    })
    await FS.writeFile(indexHtmlTarget, indexHtml)
    colorsIfAppropriate(`Wrote ${chalk.red(fileSize(indexHtml.length))} to '${chalk.blue(Path.relative(options.rootDirectory, indexHtmlTarget))}'`)
  })
}
