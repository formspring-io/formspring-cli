/* Generated from api.forms.submissions.update — do not edit by hand; re-run npm run scaffold-commands */
import { Flags } from '@oclif/core'
import { readRequestBody } from '../../../lib/body.js'
import { printResult } from '../../../lib/output.js'
import { restRequest, substitutePath } from '../../../lib/rest.js'
import { FormspringCommand } from '../../../lib/formspring-command.js'

export default class FormsSubmissionsUpdateGenerated extends FormspringCommand {
  static description = 'PUT /forms/{form}/submissions/{submission}'
  static examples = ['<%= config.bin %> forms submissions update --json']

  static flags = {
    ...FormspringCommand.baseFlags,
    form: Flags.string({ required: true, description: 'Path parameter form' }),
    submission: Flags.string({ required: true, description: 'Path parameter submission' }),
    data: Flags.string({ description: 'JSON body file (@path)' }),
    stdin: Flags.boolean({ description: 'Read JSON from stdin', default: false }),
  }

  async run(): Promise<void> {
    const config = this.getRuntimeConfig()
    const path = substitutePath('/forms/{form}/submissions/{submission}', {
      form: String(this.flags.form),
      submission: String(this.flags.submission),
    })
    const body = await readRequestBody({ data: this.flags.data as string | undefined, stdin: Boolean(this.flags.stdin) })

    const result = await restRequest({ config, method: 'PUT', path, body })
    printResult(result, this.flags.json)
  }
}
