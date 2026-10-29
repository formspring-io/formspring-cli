import { readFileSync } from 'node:fs'
import { Flags } from '@oclif/core'
import { CliError } from '../../lib/errors.js'
import { FormspringCommand } from '../../lib/formspring-command.js'
import { printResult } from '../../lib/output.js'
import { pollUntil } from '../../lib/poll.js'
import { restRequest, substitutePath } from '../../lib/rest.js'

type LinkImportEnvelope = { data?: { id?: string; status?: string } }

const SETTLED = new Set(['completed', 'completed_with_errors', 'failed', 'dry_run'])

export default class LinksImport extends FormspringCommand {
  static description =
    'Import short links from a CSV file (links:write). Use --check-only to validate every row without creating anything.'

  static examples = [
    '<%= config.bin %> links import --file links.csv --check-only --wait --json',
    '<%= config.bin %> links import --file links.csv --import-key spring-launch --wait --json',
  ]

  static flags = {
    ...FormspringCommand.baseFlags,
    file: Flags.string({
      required: true,
      description: 'CSV file. First row: column names including target_url (up to 500 rows, 1 MB)',
    }),
    'check-only': Flags.boolean({
      description: 'Server-side dry run: check every row like a real import and write nothing',
      default: false,
    }),
    'import-key': Flags.string({
      description: 'Rows already imported under this key are skipped (default: a fingerprint of the file)',
    }),
    project: Flags.string({ description: 'Project public id to create the links in' }),
    wait: Flags.boolean({ description: 'Wait for the import to finish and print the result', default: false }),
    timeout: Flags.integer({ description: 'With --wait, seconds to wait', default: 120, min: 1 }),
    'idempotency-key': Flags.string({
      description: 'Idempotency-Key header: repeating it with the same file replays the first result',
    }),
  }

  async run(): Promise<void> {
    const config = this.getRuntimeConfig()
    let csv: string

    try {
      csv = readFileSync(String(this.flags.file), 'utf8')
    } catch (error) {
      throw new CliError(`Could not read ${String(this.flags.file)}: ${(error as Error).message}`)
    }

    const body = {
      csv,
      dry_run: Boolean(this.flags['check-only']),
      ...(this.flags['import-key'] ? { import_key: this.flags['import-key'] } : {}),
      ...(this.flags.project ? { project: this.flags.project } : {}),
    }

    const created = await restRequest<LinkImportEnvelope | undefined>({
      config,
      method: 'POST',
      path: '/links/imports',
      body,
      idempotencyKey: this.flags['idempotency-key'] as string | undefined,
    })

    const id = created?.data?.id

    if (!this.flags.wait || !id) {
      printResult(created, this.flags.json)
      return
    }

    const final = await pollUntil(
      () =>
        restRequest<LinkImportEnvelope>({
          config,
          method: 'GET',
          path: substitutePath('/links/imports/{linkImport}', { linkImport: id }),
        }),
      (value) => SETTLED.has(String(value.data?.status)),
      { timeoutSeconds: Number(this.flags.timeout) },
    )

    printResult(final, this.flags.json)

    if (final.data?.status === 'failed') {
      throw new CliError('The link import failed. See error_message and errors in the result.')
    }
  }
}
