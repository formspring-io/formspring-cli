import { printResult } from '../../lib/output.js'
import { restRequest } from '../../lib/rest.js'
import { FormspringCommand } from '../../lib/formspring-command.js'

export default class TokensList extends FormspringCommand {
  static description = 'List API tokens (tokens:read)'

  static examples = ['<%= config.bin %> tokens list --json']

  static flags = FormspringCommand.baseFlags

  async run(): Promise<void> {
    const result = await restRequest({ config: this.getRuntimeConfig(), method: 'GET', path: '/tokens' })
    printResult(result, this.flags.json)
  }
}
