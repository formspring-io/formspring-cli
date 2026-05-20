/* Generated from api.billing.team — do not edit by hand; re-run npm run scaffold-commands */
import { Flags } from '@oclif/core'
import { readRequestBody } from '../../lib/body.js'
import { printResult } from '../../lib/output.js'
import { restRequest, substitutePath } from '../../lib/rest.js'
import { FormspringCommand } from '../../lib/formspring-command.js'

export default class BillingTeamGenerated extends FormspringCommand {
  static description = 'GET /billing/team'
  static examples = ['<%= config.bin %> billing team --json']

  static flags = {
    ...FormspringCommand.baseFlags,

  }

  async run(): Promise<void> {
    const config = this.getRuntimeConfig()
    const path = substitutePath('/billing/team', {})
    const body = undefined

    const result = await restRequest({ config, method: 'GET', path, body })
    printResult(result, this.flags.json)
  }
}
