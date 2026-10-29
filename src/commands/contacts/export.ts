import { Flags } from '@oclif/core'
import { readRequestBody } from '../../lib/body.js'
import { CliError } from '../../lib/errors.js'
import { FormspringCommand } from '../../lib/formspring-command.js'
import { printResult } from '../../lib/output.js'
import { pollUntil } from '../../lib/poll.js'
import { restDownload, restRequest, substitutePath } from '../../lib/rest.js'

type ExportState = { id?: string; status?: string; row_count?: number | null; error_message?: string | null }

export default class ContactsExport extends FormspringCommand {
  static description =
    'Export contacts to a CSV file: queues the export, waits until it is ready and streams the file to disk (contacts:read)'

  static examples = [
    '<%= config.bin %> contacts export --output contacts.csv',
    '<%= config.bin %> contacts export --output leads.csv --filters \'{"lifecycle_stage":"lead"}\' --columns name,email,tags --json',
  ]

  static flags = {
    ...FormspringCommand.baseFlags,
    output: Flags.string({ char: 'o', required: true, description: 'File to write the CSV to (use - for stdout)' }),
    force: Flags.boolean({ description: 'Replace --output if it already exists', default: false }),
    filters: Flags.string({
      description: 'Contact filters as JSON (inline or @file): q, source, channel, last_seen, segment, tag, list, owner, lifecycle_stage, ...',
    }),
    columns: Flags.string({ description: 'Comma-separated columns, e.g. name,email,tags (default: all)' }),
    sort: Flags.string({ description: 'Sort key' }),
    timeout: Flags.integer({ description: 'Seconds to wait for the export', default: 300, min: 1 }),
    'idempotency-key': Flags.string({
      description: 'Idempotency-Key header: repeating it with the same filters replays the first export',
    }),
  }

  async run(): Promise<void> {
    const config = this.getRuntimeConfig()

    const filters = this.flags.filters
      ? ((await readRequestBody({ data: this.flags.filters as string })) as Record<string, unknown>)
      : undefined

    const body = {
      ...(filters ? { filters } : {}),
      ...(this.flags.columns
        ? { columns: String(this.flags.columns).split(',').map((column) => column.trim()).filter(Boolean) }
        : {}),
      ...(this.flags.sort ? { sort: this.flags.sort } : {}),
    }

    const queued = await restRequest<ExportState | undefined>({
      config,
      method: 'POST',
      path: '/contacts/exports',
      body,
      idempotencyKey: this.flags['idempotency-key'] as string | undefined,
    })

    if (queued === undefined) {
      return
    }

    const id = queued.id

    if (!id) {
      throw new CliError('The server did not return an export id.')
    }

    const ready = await pollUntil(
      () =>
        restRequest<ExportState>({
          config,
          method: 'GET',
          path: substitutePath('/contacts/exports/{contactExport}', { contactExport: id }),
        }),
      (state) => state.status === 'ready' || state.status === 'failed',
      { timeoutSeconds: Number(this.flags.timeout) },
    )

    if (ready.status === 'failed') {
      throw new CliError(`The export failed: ${ready.error_message ?? 'no reason given'}`)
    }

    const output = String(this.flags.output)
    const file = await restDownload({
      config,
      path: substitutePath('/contacts/exports/{contactExport}/download', { contactExport: id }),
      output,
      force: Boolean(this.flags.force),
    })

    const summary = { export_id: id, rows: ready.row_count ?? null, ...file }

    if (output === '-') {
      process.stderr.write(`${JSON.stringify(summary)}\n`)
      return
    }

    printResult(summary, this.flags.json)
  }
}
