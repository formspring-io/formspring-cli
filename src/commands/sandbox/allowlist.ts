/* Generated from api.sandbox.workspaces.allowlist.show — do not edit by hand; re-run npm run scaffold-commands */
import { Flags } from '@oclif/core'
import { readRequestBody } from '../../lib/body.js'
import { printResult } from '../../lib/output.js'
import { restRequest, substitutePath } from '../../lib/rest.js'
import { FormspringCommand } from '../../lib/formspring-command.js'

export default class SandboxAllowlistGenerated extends FormspringCommand {
  static description = 'GET /sandbox/workspaces/{team}/allowlist'
  static examples = ['<%= config.bin %> sandbox allowlist --json']

  static flags = {
    ...FormspringCommand.baseFlags,

  }

  async run(): Promise<void> {
    const config = this.getRuntimeConfig()
    const path = substitutePath('/sandbox/workspaces/{team}/allowlist', {})
    const body = undefined

    const result = await restRequest({ config, method: 'GET', path, body })
    printResult(result, this.flags.json)
  }
}
