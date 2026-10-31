/* Generated from api.funnels.automations.index — do not edit by hand; re-run npm run scaffold-commands */
import { Flags } from '@oclif/core'
import { readRequestBody } from '../../lib/body.js'
import { printResult } from '../../lib/output.js'
import { restRequest, substitutePath } from '../../lib/rest.js'
import { FormspringCommand } from '../../lib/formspring-command.js'

export default class FunnelsAutomationsGenerated extends FormspringCommand {
  static description = 'GET /funnels/{funnel}/automations'
  static examples = ['<%= config.bin %> funnels automations --json']

  static flags = {
    ...FormspringCommand.baseFlags,
    funnel: Flags.string({ required: true, description: 'Path parameter funnel' }),
  }

  async run(): Promise<void> {
    const config = this.getRuntimeConfig()
    const path = substitutePath('/funnels/{funnel}/automations', {
      funnel: String(this.flags.funnel),
    })
    const body = undefined

    const result = await restRequest({ config, method: 'GET', path, body })
    printResult(result, this.flags.json)
  }
}
