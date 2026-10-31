/* Generated from api.surveys.automations.index — do not edit by hand; re-run npm run scaffold-commands */
import { Flags } from '@oclif/core'
import { readRequestBody } from '../../lib/body.js'
import { printResult } from '../../lib/output.js'
import { restRequest, substitutePath } from '../../lib/rest.js'
import { FormspringCommand } from '../../lib/formspring-command.js'

export default class SurveysAutomationsGenerated extends FormspringCommand {
  static description = 'GET /surveys/{survey}/automations'
  static examples = ['<%= config.bin %> surveys automations --json']

  static flags = {
    ...FormspringCommand.baseFlags,
    survey: Flags.string({ required: true, description: 'Path parameter survey' }),
  }

  async run(): Promise<void> {
    const config = this.getRuntimeConfig()
    const path = substitutePath('/surveys/{survey}/automations', {
      survey: String(this.flags.survey),
    })
    const body = undefined

    const result = await restRequest({ config, method: 'GET', path, body })
    printResult(result, this.flags.json)
  }
}
