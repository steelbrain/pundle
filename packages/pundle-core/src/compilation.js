// @flow

import pOne from 'p-one'
import pMap from 'p-map'
import pEachSeries from 'p-each-series'
import { RECOMMENDED_CONCURRENCY, FileMessageIssue } from 'pundle-api'
import type { Context } from 'pundle-api'
import type { File, GeneratedFile } from 'pundle-api/types'

export default class Compilation {
  context: Context

  constructor(context: Context) {
    this.context = context
  }
  async processFile(resolved: string): Promise<File> {
    const file = await this.context.getFile(resolved)

    const parsers = this.context.components.getByHookName('language-parse')
    await pOne(parsers, async entry => {
      await entry.callback(this.context, this.context.options.get(entry), file)
      return !!file.parsed
    })
    if (!file.parsed) {
      throw new FileMessageIssue({
        file: file.filePath,
        message:
          'File not parsed, did you configure a parser for this filetype? Are you sure this file is not excluded?',
      })
    }
    const processors = this.context.components.getByHookName('language-process')
    await pEachSeries(processors, entry =>
      entry.callback(this.context, this.context.options.get(entry), file),
    )
    const plugins = this.context.components.getByHookName('language-plugin')
    await pEachSeries(plugins, entry =>
      entry.callback(this.context, this.context.options.get(entry), file),
    )

    return file
  }
  async generateFile(file: File): Promise<GeneratedFile> {
    const generators = this.context.components.getByHookName(
      'language-generate',
    )
    let generatedFile
    await pOne(generators, entry => {
      generatedFile = entry.callback(
        this.context,
        this.context.options.get(entry),
        file,
      )
      return !!generatedFile
    })
    if (!generatedFile) {
      throw new FileMessageIssue({
        file: file.filePath,
        message:
          'File not generated, did you configure a generator for this filetype? Are you sure this file is not excluded?',
      })
    }
    return generatedFile
  }
  async processFileTree(
    resolved: string,
    locks: Set<string>,
    files: Map<string, File>,
    /* TODO: Add oldFiles here */
    forcedOverwite: boolean,
    tickCallback: (oldFile: ?File, newFile: File) => any,
  ): Promise<boolean> {
    const oldFile = files.get(resolved)
    if (oldFile && !forcedOverwite) {
      return true
    }
    if (locks.has(resolved)) {
      return true
    }
    locks.add(resolved)
    let newFile
    try {
      newFile = await this.processFile(resolved)
      // TODO: Go over all of it's imports and chunks here
    } finally {
      locks.delete(resolved)
    }
    await tickCallback(oldFile, newFile)
    files.set(resolved, newFile)
    return true
  }
  async build(): Promise<void> {
    const locks: Set<string> = new Set()
    const files: Map<string, File> = new Map()
    const chunks = this.context.config.entry.map(entry =>
      this.context.getChunk(entry, []),
    )
    await pMap(
      chunks,
      chunk =>
        this.processFileTree(
          chunk.entry,
          locks,
          files,
          false,
          (oldFile, newFile) => {
            console.log('oldFile', oldFile, 'newFile', newFile)
          },
        ),
      { concurrency: RECOMMENDED_CONCURRENCY },
    )
  }
}
