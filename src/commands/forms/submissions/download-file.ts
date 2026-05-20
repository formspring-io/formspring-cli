/* Generated from api.forms.submissions.files.download — do not edit by hand; re-run npm run scaffold-commands */
import { Flags } from '@oclif/core'
import { readRequestBody } from '../../../lib/body.js'
import { printResult } from '../../../lib/output.js'
import { restRequest, substitutePath } from '../../../lib/rest.js'
import { FormspringCommand } from '../../../lib/formspring-command.js'

export default class FormsSubmissionsDownloadfileGenerated extends FormspringCommand {
  static description = 'GET /forms/{form}/submissions/{submission}/files/{file}'
  static examples = ['<%= config.bin %> forms submissions download-file --json']

  static flags = {
    ...FormspringCommand.baseFlags,
    form: Flags.string({ required: true, description: 'Path parameter form' }),
    submission: Flags.string({ required: true, description: 'Path parameter submission' }),
    file: Flags.string({ required: true, description: 'Path parameter file' }),
  }

  async run(): Promise<void> {
    const config = this.getRuntimeConfig()
    const path = substitutePath('/forms/{form}/submissions/{submission}/files/{file}', {
      form: String(this.flags.form),
      submission: String(this.flags.submission),
      file: String(this.flags.file),
    })
    const body = undefined

    const result = await restRequest({ config, method: 'GET', path, body })
    printResult(result, this.flags.json)
  }
}
