// @flow
/* eslint-disable import/prefer-default-export */

import fs from 'sb-fs'
import copy from 'sb-copy'
import path from 'path'
import chalk from 'chalk'
import coolTrim from 'cool-trim'
import stripAnsi from 'strip-ansi'
import { exec } from 'sb-exec'
import { sync as commandExists } from 'command-exists'
import arrayToSentence from 'array-to-sentence'

function log(contents: string): void {
  console.log(chalk.supportsColor ? contents : stripAnsi(contents))
}

export async function createApp({
  title,
  name,
  directory,
  from,
}: {
  title: string,
  name: string,
  directory: string,
  from: string,
}): Promise<void> {
  const targetDirectory = path.join(directory, name)
  const targetName = path.basename(targetDirectory)
  const targetParent = path.dirname(targetDirectory)

  if (await fs.exists(targetDirectory)) {
    throw new Error(`Destination directory '${targetName}' already exists in '${targetParent}'`)
  }
  if (!(await fs.exists(from))) {
    throw new Error(`Source directory '${from}' does not exist`)
  }
  log(`Creating a new ${title} in ${chalk.green(targetDirectory)}`)
  await copy(from, targetDirectory, {
    dotFiles: true,
  })

  const manifestPath = path.join(targetDirectory, 'package.json')
  const manifestExists = await fs.exists(manifestPath)
  const yarnExists = commandExists('yarn')
  if (manifestExists) {
    const contents = JSON.parse(await fs.readFile(manifestPath), 'utf8')
    const packageNames = Object.keys(contents.devDependencies || {}).map(i => chalk.blue(i))
    contents.name = targetName
    await fs.writeFile(manifestPath, JSON.stringify(contents, null, 2))

    log('')
    log('Installing packages. This may take a few minutes.')
    log(`Installing ${arrayToSentence(packageNames)}`)
    log('')

    if (yarnExists) {
      await exec('yarn', [], {
        cwd: targetDirectory,
        stdio: 'inherit',
      })
    } else {
      await exec('npm', ['install'], {
        cwd: targetDirectory,
        stdio: 'inherit',
      })
    }
    log('')
  }

  log(coolTrim`
    Success! Created ${chalk.green(targetName)} at ${targetParent}
    Inside that directory, you can run several commands:

      ${chalk.blue(yarnExists ? 'yarn start' : 'npm start')}
        Starts the development server.

      ${chalk.blue(yarnExists ? 'yarn build' : 'npm run build')}
        Bundles the app into static files for production.

    We suggest that you begin by typing:

      ${chalk.blue('cd')} ${path.relative(process.cwd(), targetDirectory)}
      ${chalk.blue(`${yarnExists ? 'yarn start' : 'npm run start'}`)}

    Happy hacking!
  `)
}
