import { Flags } from '@oclif/core'
import { buildFilter, normalizeSort, readJsonOperand, splitList, unwrap } from '../../../lib/crm.js'
import { CliError } from '../../../lib/errors.js'
import { FormspringCommand } from '../../../lib/formspring-command.js'
import { printResult } from '../../../lib/output.js'
import { pollUntil } from '../../../lib/poll.js'
import { restDownloadSigned, restRequest, substitutePath } from '../../../lib/rest.js'

type ExportState = {
  id?: string
  status?: string
  row_count?: number | null
  download_url?: string | null
  error_message?: string | null
}

export default class CrmExportCreate extends FormspringCommand {
  static description =
    'Queue a CSV of the records a list shows (view, filter, sort, search) and, with --wait or --output, wait for it and download it (crm:write)'

  static examples = [
    '<%= config.bin %> crm export create --object projects --filter status:is:active --sort=-budget --output projects.csv',
    '<%= config.bin %> crm export create --object projects --view VIEW_ID --columns name,budget --wait --json',
    '<%= config.bin %> crm export create --object projects --records id1,id2 --json',
  ]

  static flags = {
    ...FormspringCommand.baseFlags,
    object: Flags.string({ required: true, description: 'Path parameter object' }),
    view: Flags.string({ description: 'A saved view to start from; the other options replace the matching part of it' }),
    filter: Flags.string({
      multiple: true,
      description: 'Condition field:operator:value (repeatable, ANDed), or a JSON filter tree / @file',
    }),
    'filter-any': Flags.boolean({ description: 'Match records that satisfy any --filter condition (OR)', default: false }),
    sort: Flags.string({ multiple: true, description: 'Field key, - for descending: --sort=-created_at' }),
    search: Flags.string({ description: 'Text search over the records' }),
    columns: Flags.string({ description: 'Comma-separated field keys to write (default: the view\'s visible fields)' }),
    records: Flags.string({ description: 'Comma-separated ids of ticked records to export instead of a list' }),
    timezone: Flags.string({ description: 'IANA time zone in which dates are written' }),
    data: Flags.string({ description: 'Full JSON body (inline or @path); the other flags are merged over it' }),
    wait: Flags.boolean({ description: 'Wait until the export is ready and print its state (with the download link)', default: false }),
    output: Flags.string({ char: 'o', description: 'Wait for the export and write the CSV to this file (use - for stdout)' }),
    force: Flags.boolean({ description: 'Replace --output if it already exists', default: false }),
    timeout: Flags.integer({ description: 'Seconds to wait for the export', default: 300, min: 1 }),
    'idempotency-key': Flags.string({
      description: 'Idempotency-Key header (max 255 chars): repeating it with the same payload replays the first export',
    }),
  }

  async run(): Promise<void> {
    const config = this.getRuntimeConfig()
    const object = String(this.flags.object)
    const base = this.flags.data ? (readJsonOperand(String(this.flags.data), '--data') as Record<string, unknown>) : {}
    const body: Record<string, unknown> = { ...base }

    const filter = buildFilter(this.flags.filter as string[] | undefined, this.flags['filter-any'] ? 'any' : 'all')
    const sort = normalizeSort(this.flags.sort as string[] | undefined)
    const columns = splitList(this.flags.columns as string | undefined)
    const records = splitList(this.flags.records as string | undefined)

    if (this.flags.view) body.view = this.flags.view
    if (filter) body.filter = filter
    if (sort) body.sort = sort
    if (this.flags.search) body.search = this.flags.search
    if (columns) body.columns = columns
    if (records) body.records = records
    if (this.flags.timezone) body.timezone = this.flags.timezone

    const idempotencyKey = this.flags['idempotency-key'] as string | undefined

    if (idempotencyKey !== undefined && (idempotencyKey === '' || idempotencyKey.length > 255)) {
      throw new CliError('--idempotency-key must be 1 to 255 characters.')
    }

    const queued = await restRequest<unknown>({
      config,
      method: 'POST',
      path: substitutePath('/crm/objects/{object}/exports', { object }),
      body,
      idempotencyKey,
    })

    if (queued === undefined) {
      return
    }

    const output = this.flags.output as string | undefined

    if (!this.flags.wait && output === undefined) {
      printResult(queued, this.flags.json)
      process.stderr.write('Queued. Follow it with crm export get, then fetch the file with crm export download.\n')

      return
    }

    const id = unwrap<ExportState>(queued).id

    if (!id) {
      throw new CliError('The server did not return an export id.')
    }

    const ready = unwrap<ExportState>(
      await pollUntil(
        () =>
          restRequest<unknown>({
            config,
            method: 'GET',
            path: substitutePath('/crm/objects/{object}/exports/{export}', { object, export: id }),
          }),
        (response) => {
          const status = unwrap<ExportState>(response).status

          return status === 'ready' || status === 'failed'
        },
        { timeoutSeconds: Number(this.flags.timeout) },
      ),
    )

    if (ready.status === 'failed') {
      throw new CliError(`The export failed: ${ready.error_message ?? 'no reason given'}`)
    }

    if (output === undefined) {
      printResult({ data: ready }, this.flags.json)

      return
    }

    if (!ready.download_url) {
      throw new CliError('The export is ready but the server sent no download link.')
    }

    const file = await restDownloadSigned({ config, url: ready.download_url, output, force: Boolean(this.flags.force) })
    const summary = { export_id: id, rows: ready.row_count ?? null, ...file }

    if (output === '-') {
      process.stderr.write(`${JSON.stringify(summary)}\n`)

      return
    }

    printResult(summary, this.flags.json)
  }
}
