import { Flags } from '@oclif/core'
import { mcpCallTool } from '../../lib/mcp.js'
import { printResult } from '../../lib/output.js'
import { FormspringCommand } from '../../lib/formspring-command.js'

export default class TemplatesList extends FormspringCommand {
  static description = 'List starter templates (MCP list_templates)'

  static examples = [
    '<%= config.bin %> templates list --product form --json',
    '<%= config.bin %> templates list --product survey',
  ]

  static flags = {
    ...FormspringCommand.baseFlags,
    product: Flags.string({
      required: true,
      description: 'form | survey | funnel',
      options: ['form', 'survey', 'funnel'],
    }),
    category: Flags.string({ description: 'Optional category filter' }),
    search: Flags.string({ description: 'Optional search needle' }),
  }

  async run(): Promise<void> {
    const result = await mcpCallTool(this.getRuntimeConfig(), 'list_templates', {
      product: this.flags.product,
      ...(this.flags.category ? { category: this.flags.category } : {}),
      ...(this.flags.search ? { search: this.flags.search } : {}),
    })

    printResult(result, this.flags.json)
  }
}
