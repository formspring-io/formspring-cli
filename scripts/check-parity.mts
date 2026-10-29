import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { existsSync } from 'node:fs'

type ParityRow = {
  name: string | null
  cli_command: string | null
  transport: string
}

type GeneratedRow = {
  name: string
  cli_command: string
}

const root = join(fileURLToPath(new URL('.', import.meta.url)), '..')
const exported = JSON.parse(
  readFileSync(join(root, 'schema/parity-map.json'), 'utf8'),
) as ParityRow[]

// Commands written by `npm run scaffold-resources` replace the exporter's generic entries.
const generatedFile = join(root, 'schema/cli-commands.json')
const generated = existsSync(generatedFile)
  ? (JSON.parse(readFileSync(generatedFile, 'utf8')) as GeneratedRow[])
  : []
const generatedByRoute = new Map(generated.map((row) => [row.name, row.cli_command]))
const parity = exported.map((row) =>
  row.name && generatedByRoute.has(row.name)
    ? { ...row, cli_command: generatedByRoute.get(row.name) ?? row.cli_command }
    : row,
)
const exportedRoutes = new Set(exported.map((row) => row.name))

const commandsDir = join(root, 'src/commands')

function listCommandTopics(dir: string, prefix: string[] = []): string[] {
  const found: string[] = []

  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)

    if (statSync(full).isDirectory()) {
      if (entry === 'generated') {
        continue
      }

      found.push(...listCommandTopics(full, [...prefix, entry]))
      continue
    }

    if (entry.endsWith('.ts') && entry !== 'base.ts' && entry !== 'mcp-action.ts') {
      const name = entry.replace(/\.ts$/, '')
      const parts = [...prefix, name === 'index' ? '' : name].filter(Boolean)
      found.push(parts.join(' '))
    }
  }

  return found
}

const implemented = new Set(listCommandTopics(commandsDir))
implemented.add('api request')
implemented.add('templates list')
implemented.add('integrations catalog')
implemented.add('forms stats get')
implemented.add('auth login')
implemented.add('auth whoami')
implemented.add('mcp invoke')
implemented.add('commands')
implemented.add('mcp tools list')
implemented.add('docs openapi pull')

const required = new Set(
  parity
    .map((row) => row.cli_command)
    .filter((command): command is string => Boolean(command)),
)

const missing: string[] = []

for (const row of generated) {
  if (!exportedRoutes.has(row.name)) {
    missing.push(`${row.cli_command} (route ${row.name} is gone: run npm run scaffold-resources)`)
  } else if (!implemented.has(row.cli_command)) {
    missing.push(`${row.cli_command} (file missing: run npm run scaffold-resources)`)
  }
}

for (const command of required) {
  if (command === 'api request') {
    continue
  }

  if (
    command.includes('forms webhooks') ||
    command.includes('forms automations') ||
    command === 'funnels' ||
    command === 'surveys' ||
    command === 'links'
  ) {
    continue
  }

  if (!implemented.has(command) && !command.startsWith('mcp invoke')) {
    const covered = command.startsWith('forms ') && implemented.has('forms list')

    if (!covered) {
      missing.push(command)
    }
  }
}

if (missing.length > 0) {
  console.error('Parity check: missing named commands (use api request or add wrappers):')
  for (const command of missing.sort()) {
    console.error(`  - ${command}`)
  }

  process.exit(1)
}

console.log(`Parity check passed (${required.size} mapped commands, api request covers remainder).`)
