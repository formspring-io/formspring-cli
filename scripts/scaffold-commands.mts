import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

type RouteRow = {
  method: string
  uri: string
  name: string
}

type ParityRow = {
  method: string | null
  path: string | null
  name: string | null
  cli_command: string | null
  transport: string
}

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const routeRows = JSON.parse(readFileSync(join(root, 'schema/routes.json'), 'utf8')) as RouteRow[]
const parityRows = JSON.parse(readFileSync(join(root, 'schema/parity-map.json'), 'utf8')) as ParityRow[]

const skipNames = new Set(['api.openapi.spec', 'api.openapi.docs'])
const skipCliCommands = new Set(['me get'])
const pathParams = ['form', 'submission', 'webhook', 'automation', 'run', 'funnel', 'survey', 'link', 'file', 'token', 'delivery']

function routeToOpenApiPath(uri: string): string {
  const match = uri.match(/^api\/v1(\/.*)?$/)

  return match ? (match[1] ?? '/') : uri
}

function parityFor(route: RouteRow): ParityRow | undefined {
  const method = route.method.split('|')[0].toUpperCase()
  const path = routeToOpenApiPath(route.uri)

  return parityRows.find(
    (row) => row.name === route.name && row.method === method && row.path === path,
  )
}

function commandPath(cliCommand: string): string {
  const parts = cliCommand.split(' ')
  const fileName = `${parts.pop()}.ts`

  return join(root, 'src/commands', ...parts, fileName)
}

const written = new Set<string>()

for (const route of routeRows) {
  if (!route.name || skipNames.has(route.name)) {
    continue
  }

  const parity = parityFor(route)

  if (!parity?.cli_command || parity.cli_command === 'api request' || skipCliCommands.has(parity.cli_command)) {
    continue
  }

  if (parity.cli_command.includes('forms webhooks') || parity.cli_command.includes('forms automations') || parity.cli_command === 'funnels' || parity.cli_command === 'surveys' || parity.cli_command === 'links') {
    continue
  }

  const path = routeToOpenApiPath(route.uri)
  const method = route.method.split('|')[0].toUpperCase()
  const out = commandPath(parity.cli_command)

  if (written.has(out)) {
    continue
  }

  if (existsSync(out) && !readFileSync(out, 'utf8').includes('Generated from')) {
    continue
  }

  written.add(out)

  const className = parity.cli_command
    .split(/\s+/)
    .map((part) => part.replace(/[^a-z0-9]/gi, '').replace(/^./, (c) => c.toUpperCase()))
    .join('')

  const segments = parity.cli_command.split(' ').length
  const libPrefix = `${'../'.repeat(segments)}`

  const flagLines = pathParams
    .filter((param) => path.includes(`{${param}}`))
    .map(
      (param) =>
        `    ${param}: Flags.string({ required: true, description: 'Path parameter ${param}' }),`,
    )

  const subsParams = pathParams.filter((param) => path.includes(`{${param}}`))
  const subsBlock =
    subsParams.length > 0
      ? `{\n${subsParams.map((param) => `      ${param}: String(this.flags.${param}),`).join('\n')}\n    }`
      : '{}'

  const needsBody = !['GET', 'HEAD', 'DELETE'].includes(method)

  if (needsBody) {
    flagLines.push(
      "    data: Flags.string({ description: 'JSON body file (@path)' }),",
      "    stdin: Flags.boolean({ description: 'Read JSON from stdin', default: false }),",
    )
  }

  const content = `/* Generated from ${route.name} — do not edit by hand; re-run npm run scaffold-commands */
import { Flags } from '@oclif/core'
import { readRequestBody } from '${libPrefix}lib/body.js'
import { printResult } from '${libPrefix}lib/output.js'
import { restRequest, substitutePath } from '${libPrefix}lib/rest.js'
import { FormspringCommand } from '${libPrefix}lib/formspring-command.js'

export default class ${className}Generated extends FormspringCommand {
  static description = '${method} ${path}'
  static examples = ['<%= config.bin %> ${parity.cli_command} --json']

  static flags = {
    ...FormspringCommand.baseFlags,
${flagLines.join('\n')}
  }

  async run(): Promise<void> {
    const config = this.getRuntimeConfig()
    const path = substitutePath('${path}', ${subsBlock})
${needsBody ? "    const body = await readRequestBody({ data: this.flags.data as string | undefined, stdin: Boolean(this.flags.stdin) })" : '    const body = undefined'}

    const result = await restRequest({ config, method: '${method}', path, body })
    printResult(result, this.flags.json)
  }
}
`

  mkdirSync(dirname(out), { recursive: true })
  writeFileSync(out, content)
}

console.log(`Scaffolded ${written.size} named REST commands`)
