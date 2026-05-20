import { printResult } from '../../lib/output.js'
import { restRequest } from '../../lib/rest.js'
import { FormspringCommand } from '../../lib/formspring-command.js'

export default class AuthWhoami extends FormspringCommand {
  static description = 'Show current user and team (alias for me get)'

  static examples = ['<%= config.bin %> auth whoami --json']

  static flags = FormspringCommand.baseFlags

  async run(): Promise<void> {
    const me = await restRequest({ config: this.getRuntimeConfig(), method: 'GET', path: '/me' })
    printResult(me, this.flags.json)
  }
}
