import { Flags } from '@oclif/core'
import { mcpCallTool } from '../../../lib/mcp.js'
import { printResult } from '../../../lib/output.js'
import { FormspringCommand } from '../../../lib/formspring-command.js'

export default class FormsStatsGet extends FormspringCommand {
  static description = '30-day form stats (MCP get_form_stats)'

  static examples = ['<%= config.bin %> forms stats get --form frm_abc123 --json']

  static flags = {
    ...FormspringCommand.baseFlags,
    form: Flags.string({ required: true, description: 'Form public_id' }),
  }

  async run(): Promise<void> {
    const result = await mcpCallTool(this.getRuntimeConfig(), 'get_form_stats', {
      form_id: this.flags.form,
    })

    printResult(result, this.flags.json)
  }
}
