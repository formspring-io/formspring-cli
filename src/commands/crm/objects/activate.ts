import { Flags } from '@oclif/core'
import { FormspringCommand } from '../../../lib/formspring-command.js'
import { printResult } from '../../../lib/output.js'
import { restRequest, substitutePath } from '../../../lib/rest.js'

export default class CrmObjectsActivate extends FormspringCommand {
  static description = 'Switch an object back on after crm objects deactivate (crm:write)'

  static examples = ['<%= config.bin %> crm objects activate --object projects --json']

  static flags = {
    ...FormspringCommand.baseFlags,
    object: Flags.string({ required: true, description: 'Path parameter object' }),
  }

  async run(): Promise<void> {
    const result = await restRequest({
      config: this.getRuntimeConfig(),
      method: 'PATCH',
      path: substitutePath('/crm/objects/{object}', { object: String(this.flags.object) }),
      body: { is_active: true },
    })

    printResult(result, this.flags.json)
  }
}
