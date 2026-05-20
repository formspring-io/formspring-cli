/* Generated from api.forms.submissions.index — do not edit by hand; re-run npm run scaffold-commands */
import { Flags } from '@oclif/core'
import { readRequestBody } from '../../../lib/body.js'
import { printResult } from '../../../lib/output.js'
import { restRequest, substitutePath } from '../../../lib/rest.js'
import { FormspringCommand } from '../../../lib/formspring-command.js'

export default class FormsSubmissionsListGenerated extends FormspringCommand {
  static description = 'GET /forms/{form}/submissions'
  static examples = ['<%= config.bin %> forms submissions list --json']

  static flags = {
    ...FormspringCommand.baseFlags,
    form: Flags.string({ required: true, description: 'Path parameter form' }),
  }

  async run(): Promise<void> {
    const config = this.getRuntimeConfig()
    const path = substitutePath('/forms/{form}/submissions', {
      form: String(this.flags.form),
    })
    const body = undefined

    const result = await restRequest({ config, method: 'GET', path, body })
    printResult(result, this.flags.json)
  }
}
