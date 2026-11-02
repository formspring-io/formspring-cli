import { Flags } from '@oclif/core'
import { unwrap } from '../../../lib/crm.js'
import { CliError } from '../../../lib/errors.js'
import { FormspringCommand } from '../../../lib/formspring-command.js'
import { printResult } from '../../../lib/output.js'
import { restDownloadSigned, restRequest, substitutePath } from '../../../lib/rest.js'

type ExportState = { status?: string; download_url?: string | null; error_message?: string | null }

export default class CrmExportDownload extends FormspringCommand {
  static description =
    'Download a finished export as a CSV file. Reads the export for its signed, expiring link and streams it to disk (crm:write)'

  static examples = [
    '<%= config.bin %> crm export download --object projects --export EXPORT_ID --output projects.csv',
    '<%= config.bin %> crm export download --object projects --export EXPORT_ID --output - > projects.csv',
  ]

  static flags = {
    ...FormspringCommand.baseFlags,
    object: Flags.string({ required: true, description: 'Path parameter object' }),
    export: Flags.string({ required: true, description: 'Path parameter export (id from crm export create)' }),
    output: Flags.string({ char: 'o', description: 'File to write (default: stream to stdout)' }),
    force: Flags.boolean({ description: 'Replace --output if it already exists', default: false }),
  }

  async run(): Promise<void> {
    const config = this.getRuntimeConfig()
    const output = String(this.flags.output ?? '-')

    const response = await restRequest<unknown>({
      config,
      method: 'GET',
      path: substitutePath('/crm/objects/{object}/exports/{export}', {
        object: String(this.flags.object),
        export: String(this.flags.export),
      }),
    })

    if (response === undefined) {
      return
    }

    const state = unwrap<ExportState>(response)

    if (state.status === 'failed') {
      throw new CliError(`The export failed: ${state.error_message ?? 'no reason given'}`)
    }

    if (state.status !== 'ready' || !state.download_url) {
      throw new CliError(
        `The export is ${state.status ?? 'not ready'}, so there is no file yet.`,
        1,
        'Check it with crm export get, or create it with crm export create --wait --output FILE.',
      )
    }

    const result = await restDownloadSigned({ config, url: state.download_url, output, force: Boolean(this.flags.force) })

    if (result) {
      if (output === '-') {
        process.stderr.write(`${result.bytes} bytes written to stdout\n`)
      } else {
        printResult(result, this.flags.json)
      }
    }
  }
}
