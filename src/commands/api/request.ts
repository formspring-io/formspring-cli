import { Args, Flags } from '@oclif/core'
import { readRequestBody } from '../../lib/body.js'
import { printResult } from '../../lib/output.js'
import { restRequest, substitutePath } from '../../lib/rest.js'
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
    query: Flags.string({
      description: 'Query parameters as JSON object',
    }),
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

    const result = await restRequest({
      config,
      method,
      path,
      query,
      body,
    })

    printResult(result, this.flags.json)
  }
}
