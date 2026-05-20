import { Args, Flags } from '@oclif/core'
import { readRequestBody } from '../../lib/body.js'
import { mcpCallTool } from '../../lib/mcp.js'
import { printResult } from '../../lib/output.js'
import { FormspringCommand } from '../../lib/formspring-command.js'

export default class McpInvoke extends FormspringCommand {
  static description = 'Invoke an MCP tool by name (for tools without a named CLI command)'

  static examples = [
    '<%= config.bin %> mcp invoke list_forms --json',
    '<%= config.bin %> mcp invoke get_framework_integration_catalog --data \'{"page":1}\' --json',
  ]

  static args = {
    tool: Args.string({ required: true, description: 'MCP tool name' }),
  }

  declare args: {
    tool: string
  }

  static flags = {
    ...FormspringCommand.baseFlags,
    data: Flags.string({ description: 'Tool arguments as JSON (@file or inline)' }),
    stdin: Flags.boolean({ description: 'Read JSON arguments from stdin', default: false }),
  }

  async run(): Promise<void> {
    const args =
      ((await readRequestBody({
        data: this.flags.data as string | undefined,
        stdin: Boolean(this.flags.stdin),
      })) as Record<string, unknown> | undefined) ?? {}

    const result = await mcpCallTool(this.getRuntimeConfig(), this.args.tool, args)
    printResult(result, this.flags.json)
  }
}
