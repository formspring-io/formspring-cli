import { mcpListTools } from '../../../lib/mcp.js'
import { printResult } from '../../../lib/output.js'
import { FormspringCommand } from '../../../lib/formspring-command.js'

export default class McpToolsList extends FormspringCommand {
  static description = 'List MCP tools available for the current token'

  static examples = ['<%= config.bin %> mcp tools list --json']

  static flags = FormspringCommand.baseFlags

  async run(): Promise<void> {
    const result = await mcpListTools(this.getRuntimeConfig())
    printResult(result, this.flags.json)
  }
}
