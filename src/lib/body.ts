import { readFileSync } from 'node:fs'
import { CliError } from './errors.js'

export async function readRequestBody(flags: {
  data?: string
  stdin?: boolean
}): Promise<unknown | undefined> {
  if (flags.stdin) {
    const chunks: Buffer[] = []

    for await (const chunk of process.stdin) {
      chunks.push(Buffer.from(chunk))
    }

    const raw = Buffer.concat(chunks).toString('utf8').trim()

    if (raw === '') {
      return undefined
    }

    return JSON.parse(raw) as unknown
  }

  if (!flags.data) {
    return undefined
  }

  if (!flags.data.startsWith('@')) {
    try {
      return JSON.parse(flags.data) as unknown
    } catch (error) {
      throw new CliError(
        `Could not parse JSON from --data: ${(error as Error).message}`,
        1,
        'Example: --data \'{"page":1}\' or --data @file.json',
      )
    }
  }

  const path = flags.data.slice(1)

  try {
    const raw = readFileSync(path, 'utf8')
    return JSON.parse(raw) as unknown
  } catch (error) {
    throw new CliError(
      `Could not read JSON body from ${path}: ${(error as Error).message}`,
      1,
      'Example: formspring forms create --data @form.json',
    )
  }
}
