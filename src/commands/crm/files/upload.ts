import { readFileSync } from 'node:fs'
import { basename } from 'node:path'
import { Flags } from '@oclif/core'
import { CliError } from '../../../lib/errors.js'
import { FormspringCommand } from '../../../lib/formspring-command.js'
import { printResult } from '../../../lib/output.js'
import { restRequest, substitutePath } from '../../../lib/rest.js'

export default class CrmFilesUpload extends FormspringCommand {
  static description =
    'Upload one file for a Files field (up to 10 MB). Returns its id; set the field of a record to the list of ids with crm records create or update (crm:write)'

  static examples = [
    '<%= config.bin %> crm files upload --object projects --field attachments --file brief.pdf --json',
    '<%= config.bin %> crm records update --object projects --record REC_ID --set \'attachments:=["FILE_ID"]\' --json',
  ]

  static flags = {
    ...FormspringCommand.baseFlags,
    object: Flags.string({ required: true, description: 'Path parameter object' }),
    field: Flags.string({ required: true, description: 'Path parameter field (a field of type file)' }),
    file: Flags.string({ required: true, description: 'File to upload' }),
  }

  async run(): Promise<void> {
    const file = String(this.flags.file)
    let content: Buffer

    try {
      content = readFileSync(file)
    } catch (error) {
      throw new CliError(`Could not read ${file}: ${(error as Error).message}`)
    }

    const form = new FormData()
    form.append('file', new Blob([new Uint8Array(content)]), basename(file))

    const result = await restRequest({
      config: this.getRuntimeConfig(),
      method: 'POST',
      path: substitutePath('/crm/objects/{object}/fields/{field}/files', {
        object: String(this.flags.object),
        field: String(this.flags.field),
      }),
      form,
    })

    printResult(result, this.flags.json)
  }
}
