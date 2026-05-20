import { Args } from '@oclif/core'
import { printResult } from '../../lib/output.js'
import { restRequest, substitutePath } from '../../lib/rest.js'
import { FormspringCommand } from '../../lib/formspring-command.js'

export default class TokensRevoke extends FormspringCommand {
  static description = 'Revoke an API token (tokens:write)'

  static examples = ['<%= config.bin %> tokens revoke 42 --json']

  static args = {
    token: Args.string({ required: true, description: 'Token ID' }),
  }

  declare args: { token: string }

  static flags = FormspringCommand.baseFlags

  async run(): Promise<void> {
    const path = substitutePath('/tokens/{token}', { token: this.args.token })
    const result = await restRequest({
      config: this.getRuntimeConfig(),
      method: 'DELETE',
      path,
    })

    printResult(result, this.flags.json)
  }
}
