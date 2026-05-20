/* Generated from api.forms.submissions.show — do not edit by hand; re-run npm run scaffold-commands */
import { Flags } from '@oclif/core'
import { readRequestBody } from '../../../lib/body.js'
import { printResult } from '../../../lib/output.js'
import { restRequest, substitutePath } from '../../../lib/rest.js'
import { FormspringCommand } from '../../../lib/formspring-command.js'

export default class FormsSubmissionsGetGenerated extends FormspringCommand {
  static description = 'GET /forms/{form}/submissions/{submission}'
  static examples = ['<%= config.bin %> forms submissions get --json']

  static flags = {
    ...FormspringCommand.baseFlags,
    form: Flags.string({ required: true, description: 'Path parameter form' }),
    submission: Flags.string({ required: true, description: 'Path parameter submission' }),
  }

  async run(): Promise<void> {
    const config = this.getRuntimeConfig()
    const path = substitutePath('/forms/{form}/submissions/{submission}', {
      form: String(this.flags.form),
      submission: String(this.flags.submission),
    })
    const body = undefined

    const result = await restRequest({ config, method: 'GET', path, body })
    printResult(result, this.flags.json)
  }
}
