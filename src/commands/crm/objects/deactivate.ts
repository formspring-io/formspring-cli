import { Flags } from '@oclif/core'
import { FormspringCommand } from '../../../lib/formspring-command.js'
import { printResult } from '../../../lib/output.js'
import { restRequest, substitutePath } from '../../../lib/rest.js'

export default class CrmObjectsDeactivate extends FormspringCommand {
  static description =
    'Switch an object off: it leaves menus and pickers, but its records, fields and views stay and come back with crm objects activate. Use crm objects delete to remove it for good (crm:write)'

  static examples = ['<%= config.bin %> crm objects deactivate --object projects --json']

  static flags = {
    ...FormspringCommand.baseFlags,
    object: Flags.string({ required: true, description: 'Path parameter object' }),
  }

  async run(): Promise<void> {
    const result = await restRequest({
      config: this.getRuntimeConfig(),
      method: 'PATCH',
      path: substitutePath('/crm/objects/{object}', { object: String(this.flags.object) }),
      body: { is_active: false },
    })

    printResult(result, this.flags.json)
  }
}
