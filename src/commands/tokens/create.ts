import { Flags } from '@oclif/core'
import { readRequestBody } from '../../lib/body.js'
import { printResult } from '../../lib/output.js'
import { restRequest } from '../../lib/rest.js'
import { FormspringCommand } from '../../lib/formspring-command.js'

export default class TokensCreate extends FormspringCommand {
  static description = 'Create API token (tokens:write); plaintext returned once'

  static examples = ['<%= config.bin %> tokens create --data @token.json']

  static flags = {
    ...FormspringCommand.baseFlags,
    data: Flags.string({ description: 'JSON body (@file)' }),
    stdin: Flags.boolean({ default: false }),
  }

  async run(): Promise<void> {
    const body = await readRequestBody({
      data: this.flags.data as string | undefined,
      stdin: Boolean(this.flags.stdin),
    })

    const result = await restRequest({
      config: this.getRuntimeConfig(),
      method: 'POST',
      path: '/tokens',
      body,
    })

    printResult(result, this.flags.json)
  }
}
