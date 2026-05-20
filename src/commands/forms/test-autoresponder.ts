/* Generated from api.forms.autoresponder.test — do not edit by hand; re-run npm run scaffold-commands */
import { Flags } from '@oclif/core'
import { readRequestBody } from '../../lib/body.js'
import { printResult } from '../../lib/output.js'
import { restRequest, substitutePath } from '../../lib/rest.js'
import { FormspringCommand } from '../../lib/formspring-command.js'

export default class FormsTestautoresponderGenerated extends FormspringCommand {
  static description = 'POST /forms/{form}/autoresponder/test'
  static examples = ['<%= config.bin %> forms test-autoresponder --json']

  static flags = {
    ...FormspringCommand.baseFlags,
    form: Flags.string({ required: true, description: 'Path parameter form' }),
    data: Flags.string({ description: 'JSON body file (@path)' }),
    stdin: Flags.boolean({ description: 'Read JSON from stdin', default: false }),
  }

  async run(): Promise<void> {
    const config = this.getRuntimeConfig()
    const path = substitutePath('/forms/{form}/autoresponder/test', {
      form: String(this.flags.form),
    })
    const body = await readRequestBody({ data: this.flags.data as string | undefined, stdin: Boolean(this.flags.stdin) })

    const result = await restRequest({ config, method: 'POST', path, body })
    printResult(result, this.flags.json)
  }
}
