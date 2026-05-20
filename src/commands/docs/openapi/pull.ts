import { writeFileSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { Flags } from '@oclif/core'
import { apiBaseUrl } from '../../../config.js'
import { CliError } from '../../../lib/errors.js'
import { packageRoot } from '../../../lib/paths.js'
import { FormspringCommand } from '../../../lib/formspring-command.js'

const schemaDir = join(packageRoot(import.meta.url), 'schema')

export default class DocsOpenapiPull extends FormspringCommand {
  static description = 'Download openapi.json from the app into schema/ (local sync helper)'

  static examples = [
    '<%= config.bin %> docs openapi pull --base-url https://formspring.io',
  ]

  static flags = {
    ...FormspringCommand.baseFlags,
    out: Flags.string({
      description: 'Output directory (default: <package>/schema)',
    }),
  }

  async run(): Promise<void> {
    const config = this.getRuntimeConfig()
    const url = `${apiBaseUrl(config)}/openapi.json`
    const response = await fetch(url, {
      headers: { Accept: 'application/json' },
    })

    if (!response.ok) {
      const text = await response.text()
      throw new CliError(`OpenAPI download failed (${response.status}): ${text}`)
    }

    const spec = await response.json()
    const outDir = String(this.flags.out ?? schemaDir)
    mkdirSync(outDir, { recursive: true })
    writeFileSync(join(outDir, 'openapi.json'), `${JSON.stringify(spec, null, 2)}\n`, 'utf8')

    process.stderr.write(`Wrote ${join(outDir, 'openapi.json')}\n`)
  }
}
