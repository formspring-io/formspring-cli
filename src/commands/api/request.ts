import { Args, Flags } from '@oclif/core'
import { readRequestBody } from '../../lib/body.js'
import { CliError } from '../../lib/errors.js'
import { printResult } from '../../lib/output.js'
import { restDownload, restPaginate, restRequest, substitutePath } from '../../lib/rest.js'
import { FormspringCommand } from '../../lib/formspring-command.js'

const PATH_PARAM_FLAGS = [
  'form',
  'submission',
  'webhook',
  'automation',
  'run',
  'funnel',
  'survey',
  'link',
  'file',
  'token',
  'delivery',
] as const

export default class ApiRequest extends FormspringCommand {
  static description =
    'Call any /api/v1 endpoint (use when no named command exists)'

  static examples = [
    '<%= config.bin %> api request GET /forms --json',
    '<%= config.bin %> api request GET /forms/{form}/webhooks --form PUBLIC_ID --json',
    '<%= config.bin %> api request PATCH /forms/{form} --form PUBLIC_ID --data @patch.json --json',
    '<%= config.bin %> api request GET /contacts/{contact}/notes --param contact=con_123 --json',
    '<%= config.bin %> api request GET /contacts --all --json',
    '<%= config.bin %> api request POST /contacts --data @contact.json --idempotency-key import-0001 --json',
    '<%= config.bin %> api request GET /contacts/exports/{contactExport}/download --param contactExport=ID --output contacts.csv',
  ]

  static args = {
    method: Args.string({
      required: true,
      description: 'HTTP method (GET, POST, PATCH, PUT, DELETE)',
    }),
    path: Args.string({
      required: true,
      description: 'API path under /api/v1, e.g. /forms or /forms/{form}',
    }),
  }

  declare args: {
    method: string
    path: string
  }

  static flags = {
    ...FormspringCommand.baseFlags,
    ...Object.fromEntries(
      PATH_PARAM_FLAGS.map((name) => [
        name,
        Flags.string({ description: `Substitute {${name}} in path` }),
      ]),
    ),
    param: Flags.string({
      description: 'Substitute any {name} in the path: --param name=value (repeatable)',
      multiple: true,
    }),
    query: Flags.string({
      description: 'Query parameters as JSON object',
    }),
    all: Flags.boolean({
      description: 'GET only: follow meta.next_cursor and return every page in one result',
      default: false,
    }),
    'max-pages': Flags.integer({ description: 'With --all, stop after this many pages', default: 100, min: 1 }),
    'idempotency-key': Flags.string({
      description: 'Idempotency-Key header for writes: repeating it with the same payload replays the first result',
    }),
    output: Flags.string({
      char: 'o',
      description: 'GET only: stream the response to this file (use - for stdout), for downloads',
    }),
    force: Flags.boolean({ description: 'Replace --output if it already exists', default: false }),
    data: Flags.string({ description: 'JSON body file (@path)' }),
    stdin: Flags.boolean({ description: 'Read JSON body from stdin', default: false }),
  }

  async run(): Promise<void> {
    const config = this.getRuntimeConfig()
    const method = this.args.method.toUpperCase()
    const pathArg = this.args.path.startsWith('/') ? this.args.path : `/${this.args.path}`

    const pathParams: Record<string, string | undefined> = {}
    for (const name of PATH_PARAM_FLAGS) {
      const value = this.flags[name] as string | undefined
      if (value) {
        pathParams[name] = value
      }
    }

    for (const entry of (this.flags.param as string[] | undefined) ?? []) {
      const separator = entry.indexOf('=')

      if (separator < 1) {
        throw new CliError(`Invalid --param "${entry}"`, 1, 'Use --param name=value')
      }

      pathParams[entry.slice(0, separator)] = entry.slice(separator + 1)
    }

    const path = substitutePath(pathArg, pathParams)

    let query: Record<string, string | number | boolean | undefined> | undefined

    if (this.flags.query) {
      query = JSON.parse(String(this.flags.query)) as Record<
        string,
        string | number | boolean | undefined
      >
    }

    const body = await readRequestBody({
      data: this.flags.data as string | undefined,
      stdin: Boolean(this.flags.stdin),
    })

    if (this.flags.verbose) {
      process.stderr.write(`${method} ${path}\n`)
    }

    if (this.flags.output) {
      if (method !== 'GET') {
        throw new CliError('--output only works with GET requests.')
      }

      const output = String(this.flags.output)
      const file = await restDownload({ config, path, query, output, force: Boolean(this.flags.force) })

      if (file) {
        if (output === '-') {
          process.stderr.write(`${file.bytes} bytes written to stdout\n`)
        } else {
          printResult(file, this.flags.json)
        }
      }

      return
    }

    if (this.flags.all) {
      if (method !== 'GET') {
        throw new CliError('--all only works with GET requests.')
      }

      printResult(
        await restPaginate({ config, method, path, query, maxPages: Number(this.flags['max-pages']) }),
        this.flags.json,
      )

      return
    }

    const result = await restRequest({
      config,
      method,
      path,
      query,
      body,
      idempotencyKey: this.flags['idempotency-key'] as string | undefined,
    })

    printResult(result, this.flags.json)
  }
}
