// @flow
/* eslint-disable import/prefer-default-export */

import fs from 'sb-fs'
import copy from 'sb-copy'
import path from 'path'
import exec from 'sb-exec'
import chalk from 'chalk'
import stripAnsi from 'strip-ansi'
import { sync as commandExists } from 'command-exists'
import arrayToSentence from 'array-to-sentence'

function log(contents: string): void {
  console.log(chalk.supportsColor ? contents : stripAnsi(contents))
}

export async function createApp({
  title,
  welcomeText,
  name,
  directory,
  from,
}: {
  title: string,
  welcomeText: string,
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
    let contents = {}
    try {
      contents = JSON.parse(await fs.readFile(manifestPath), 'utf8')
    } catch (_) {
      /* Ignore Invalid JSON */
    }
    const packageNames = Object.keys(contents.dependencies || {}).map(chalk.blue)

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

  log(`Success! Created ${targetName} at ${targetParent}`)
  log(welcomeText)
  log('')
  log('We suggest that you begin by typing:')
  log('')
  log(`  cd ${path.relative(process.cwd(), targetDirectory)}`)
  log(`  ${yarnExists ? 'yarn start' : 'npm run start'}`)
  log('')
  log('Happy hacking!')
}
