import { Args, Flags } from '@oclif/core'
import { readRequestBody } from '../../../lib/body.js'
import { mcpCallTool } from '../../../lib/mcp.js'
import { printResult } from '../../../lib/output.js'
import { FormspringCommand } from '../../../lib/formspring-command.js'

export default class FunnelsPixelSet extends FormspringCommand {
  static description = 'Configure funnel tracking pixel (MCP set_pixel)'

  static examples = ['<%= config.bin %> funnels pixel set my-funnel --data @pixel.json']

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

    const result = await mcpCallTool(this.getRuntimeConfig(), 'set_pixel', {
      funnel_id: this.args.funnel,
      ...(extra ?? {}),
    })

    printResult(result, this.flags.json)
  }
}
