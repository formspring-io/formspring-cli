import { readFileSync } from 'node:fs'
import { basename } from 'node:path'
import { Flags } from '@oclif/core'
import { CliError } from '../../lib/errors.js'
import { FormspringCommand } from '../../lib/formspring-command.js'
import { printResult } from '../../lib/output.js'
import { restRequest } from '../../lib/rest.js'

export default class ContactsImport extends FormspringCommand {
  static description =
    'Upload a CSV of contacts (contacts:write). Returns the columns, row count and a suggested mapping; nothing is imported yet.'

  static examples = [
    '<%= config.bin %> contacts import --file contacts.csv --json',
    '<%= config.bin %> contacts imports update --contact-import IMPORT_ID --data @mapping.json',
    '<%= config.bin %> contacts imports dry-run --contact-import IMPORT_ID --json',
    '<%= config.bin %> contacts imports run --contact-import IMPORT_ID --data \'{"attest":true}\' --json',
  ]

  static flags = {
    ...FormspringCommand.baseFlags,
    file: Flags.string({ required: true, description: 'CSV file; the first row holds the column names' }),
    'idempotency-key': Flags.string({
      description: 'Idempotency-Key header: repeating it with the same file replays the first result',
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

    const result = await restRequest({
      config: this.getRuntimeConfig(),
      method: 'POST',
      path: '/contacts/imports',
      body: { csv, file_name: basename(file) },
      idempotencyKey: this.flags['idempotency-key'] as string | undefined,
    })

    printResult(result, this.flags.json)

    if (result !== undefined) {
      process.stderr.write(
        'Next: save the mapping (contacts imports update), check it (contacts imports dry-run), then start it (contacts imports run, which needs "attest": true).\n',
      )
    }
  }
}
