import { Args, Flags } from '@oclif/core'
import { readRequestBody } from '../../../lib/body.js'
import { mcpCallTool } from '../../../lib/mcp.js'
import { printResult } from '../../../lib/output.js'
import { FormspringCommand } from '../../../lib/formspring-command.js'

export default class FunnelsScreensAdd extends FormspringCommand {
  static description = 'Add a funnel screen (MCP add_screen)'

  static examples = ['<%= config.bin %> funnels screens add my-funnel --data @screen.json']

  static args = {
    funnel: Args.string({ required: true, description: 'Funnel slug or public id' }),
  }

  declare args: { funnel: string }

  static flags = {
    ...FormspringCommand.baseFlags,
    data: Flags.string({ description: 'JSON args (@file)' }),
    stdin: Flags.boolean({ default: false }),
  }

  async run(): Promise<void> {
    const extra = (await readRequestBody({
      data: this.flags.data as string | undefined,
      stdin: Boolean(this.flags.stdin),
    })) as Record<string, unknown> | undefined

    const result = await mcpCallTool(this.getRuntimeConfig(), 'add_screen', {
      funnel_id: this.args.funnel,
      ...(extra ?? {}),
    })

    printResult(result, this.flags.json)
  }
}
