import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { packageRoot } from '../lib/paths.js'
import { printResult } from '../lib/output.js'
import { FormspringCommand } from '../lib/formspring-command.js'

type ParityRow = {
  method: string | null
  path: string | null
  name: string | null
  cli_command: string | null
  transport: string
  mcp_tool: string | null
}

const schemaRoot = join(packageRoot(import.meta.url), 'schema')

function listImplementedCommands(commandsDir: string, prefix: string[] = []): string[] {
  const found: string[] = []

  for (const entry of readdirSync(commandsDir)) {
    if (entry === 'commands.ts' || entry === 'commands.js') {
      continue
    }

    const full = join(commandsDir, entry)

    if (statSync(full).isDirectory()) {
      if (entry === 'commands') {
        continue
      }

      found.push(...listImplementedCommands(full, [...prefix, entry]))
      continue
    }

    if (!entry.endsWith('.ts') && !entry.endsWith('.js')) {
      continue
    }

    if (entry.endsWith('.d.ts')) {
      continue
    }

    const name = entry.replace(/\.(ts|js)$/, '')
    const parts = [...prefix, name === 'index' ? '' : name].filter(Boolean)
    found.push(parts.join(' '))
  }

  return found.sort()
}

export default class CommandsDiscover extends FormspringCommand {
  static id = 'commands'

  static description = 'List CLI commands and API parity map (for agents)'

  static examples = ['<%= config.bin %> commands --json']

  static flags = FormspringCommand.baseFlags

  async run(): Promise<void> {
    const parity = JSON.parse(
      readFileSync(join(schemaRoot, 'parity-map.json'), 'utf8'),
    ) as ParityRow[]

    const commandsDir = join(fileURLToPath(new URL('.', import.meta.url)))
    const implemented = listImplementedCommands(commandsDir)

    const payload = {
      commands: implemented,
      parity,
      escape_hatches: {
        rest: 'formspring api request <METHOD> <path>',
        mcp: 'formspring mcp invoke <tool>',
      },
    }

    printResult(payload, this.flags.json)

    if (!this.flags.json) {
      process.stderr.write(
        `${implemented.length} named commands; use --json for machine-readable output.\n`,
      )
    }
  }
}
