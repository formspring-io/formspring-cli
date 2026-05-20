import { printResult } from '../../lib/output.js'
import { restRequest } from '../../lib/rest.js'
import { FormspringCommand } from '../../lib/formspring-command.js'

export default class MeGet extends FormspringCommand {
  static description = 'Current user, team, plan, and token abilities (GET /me)'

  static examples = ['<%= config.bin %> me get --json']

  static flags = FormspringCommand.baseFlags

  async run(): Promise<void> {
    const me = await restRequest({ config: this.getRuntimeConfig(), method: 'GET', path: '/me' })
    printResult(me, this.flags.json)
  }
}
