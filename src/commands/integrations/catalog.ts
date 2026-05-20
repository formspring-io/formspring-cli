import { Flags } from '@oclif/core'
import { mcpCallTool } from '../../lib/mcp.js'
import { printResult } from '../../lib/output.js'
import { FormspringCommand } from '../../lib/formspring-command.js'

export default class IntegrationsCatalog extends FormspringCommand {
  static description = 'Framework integration catalog (MCP get_framework_integration_catalog)'

  static examples = [
    '<%= config.bin %> integrations catalog --json',
    '<%= config.bin %> integrations catalog --category frontend --page 1',
  ]

  static flags = {
    ...FormspringCommand.baseFlags,
    category: Flags.string({ description: 'Filter by category' }),
    page: Flags.integer({ description: 'Page number', default: 1 }),
    'per-page': Flags.integer({ description: 'Items per page (max 100)', default: 25 }),
  }

  async run(): Promise<void> {
    const result = await mcpCallTool(
      this.getRuntimeConfig(),
      'get_framework_integration_catalog',
      {
        ...(this.flags.category ? { category: this.flags.category } : {}),
        page: this.flags.page,
        per_page: this.flags['per-page'],
      },
    )

    printResult(result, this.flags.json)
  }
}
