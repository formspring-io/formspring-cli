import { readFileSync } from 'node:fs'
import { basename } from 'node:path'
import { Flags } from '@oclif/core'
import { CliError } from '../../../lib/errors.js'
import { FormspringCommand } from '../../../lib/formspring-command.js'
import { printResult } from '../../../lib/output.js'
import { restRequest, substitutePath } from '../../../lib/rest.js'

export default class CrmImportStart extends FormspringCommand {
  static description =
    'Upload a CSV of records (crm:write). Returns the import id, the columns, a suggested mapping and the fields a column can map to; nothing is imported yet.'

  static examples = [
    '<%= config.bin %> crm import start --object projects --file projects.csv --json',
    '<%= config.bin %> crm import map --object projects --import IMPORT_ID --map Name=name --match-field code --json',
    '<%= config.bin %> crm import dry-run --object projects --import IMPORT_ID --wait --json',
    '<%= config.bin %> crm import run --object projects --import IMPORT_ID --wait --json',
  ]

  static flags = {
    ...FormspringCommand.baseFlags,
    object: Flags.string({ required: true, description: 'Path parameter object' }),
    file: Flags.string({ required: true, description: 'CSV file; the first row holds the column names (comma or semicolon)' }),
    'idempotency-key': Flags.string({
      description:
        'Idempotency-Key header (max 255 chars): repeating it with the same file replays the first result',
    }),
  }

  async run(): Promise<void> {
    const file = String(this.flags.file)
    let csv: string

    try {
      csv = readFileSync(file, 'utf8')
    } catch (error) {
      throw new CliError(`Could not read ${file}: ${(error as Error).message}`)
    }

    const idempotencyKey = this.flags['idempotency-key'] as string | undefined

    if (idempotencyKey !== undefined && (idempotencyKey === '' || idempotencyKey.length > 255)) {
      throw new CliError('--idempotency-key must be 1 to 255 characters.')
    }

    const result = await restRequest({
      config: this.getRuntimeConfig(),
      method: 'POST',
      path: substitutePath('/crm/objects/{object}/imports', { object: String(this.flags.object) }),
      body: { csv, file_name: basename(file) },
      idempotencyKey,
    })

    printResult(result, this.flags.json)

    if (result !== undefined) {
      process.stderr.write(
        'Next: save the mapping (crm import map), check it (crm import dry-run), then start it (crm import run).\n',
      )
    }
  }
}
