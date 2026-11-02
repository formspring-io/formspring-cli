import { Flags } from '@oclif/core'
import { readRequestBody } from '../../../lib/body.js'
import { unwrap } from '../../../lib/crm.js'
import { waitForSchemaApply } from '../../../lib/crm-wait.js'
import { CliError } from '../../../lib/errors.js'
import { FormspringCommand } from '../../../lib/formspring-command.js'
import { printResult } from '../../../lib/output.js'
import { restRequest } from '../../../lib/rest.js'

export default class CrmSchemaApply extends FormspringCommand {
  static description =
    'Import a data model document: all or nothing, and importing the same file twice changes nothing. What the file leaves out stays unless --prune. Use --check (or crm schema plan) to compare without changing anything. Owner and administrators only (crm:write)'

  static examples = [
    '<%= config.bin %> crm schema apply --file data-model.json --check --json',
    '<%= config.bin %> crm schema apply --file data-model.json --json',
    '<%= config.bin %> crm schema apply --file data-model.json --prune --allow-destructive --async --wait --json',
    'cat template.json | <%= config.bin %> crm schema apply --stdin --json',
  ]

  static flags = {
    ...FormspringCommand.baseFlags,
    file: Flags.string({ char: 'f', description: 'The document, as a path (same as --data @path)', exclusive: ['data', 'stdin'] }),
    data: Flags.string({ description: 'The document as JSON (inline or @path)', exclusive: ['file', 'stdin'] }),
    stdin: Flags.boolean({ description: 'Read the document from stdin', default: false, exclusive: ['file', 'data'] }),
    check: Flags.boolean({
      description: 'Compare only: answer with the plan and write nothing (the API dry_run). The shared --dry-run only prints the request',
      default: false,
    }),
    prune: Flags.boolean({ description: 'Also switch off what the file leaves out (data is kept; unused shared views are removed)', default: false }),
    'allow-destructive': Flags.boolean({
      description: 'Confirm changes that switch off a field with values, remove options, or make a field unique',
      default: false,
    }),
    async: Flags.boolean({ description: 'Apply in the background (always done above 60 changes)', default: false }),
    wait: Flags.boolean({ description: 'When the import runs in the background, wait until it has finished', default: false }),
    timeout: Flags.integer({ description: 'With --wait, seconds to wait', default: 600, min: 1 }),
  }

  /** `crm schema plan` is this command with the comparison switched on. */
  protected forceCheck = false

  async run(): Promise<void> {
    const source = this.flags.file ? `@${String(this.flags.file)}` : (this.flags.data as string | undefined)
    let document = (await readRequestBody({ data: source, stdin: Boolean(this.flags.stdin) })) as Record<string, any> | undefined

    if (!document || typeof document !== 'object' || Array.isArray(document)) {
      throw new CliError('Give the data model document with --file, --data or --stdin.', 1, 'Create one with: formspring crm schema export --output data-model.json')
    }

    // A document saved from `crm schema export --json` still sits in its { data } envelope.
    if (document.format === undefined && document.data?.format !== undefined) {
      document = document.data as Record<string, any>
    }

    const check = this.forceCheck || Boolean(this.flags.check)
    const query: Record<string, boolean | undefined> = {
      dry_run: check ? true : undefined,
      prune: this.flags.prune ? true : undefined,
      allow_destructive: this.flags['allow-destructive'] ? true : undefined,
      async: this.flags.async ? true : undefined,
    }

    const result = await restRequest<unknown>({
      config: this.getRuntimeConfig(),
      method: 'PUT',
      path: '/crm/schema',
      query,
      body: document,
    })

    if (result === undefined) {
      return
    }

    const applyId = this.flags.wait && !check ? this.queuedApplyId(result) : undefined

    if (applyId) {
      printResult(await waitForSchemaApply({ config: this.getRuntimeConfig(), id: applyId, timeoutSeconds: Number(this.flags.timeout) }), this.flags.json)

      return
    }

    printResult(result, this.flags.json)

    if (!check && this.queuedApplyId(result)) {
      process.stderr.write('Running in the background. Follow it with crm schema status --apply ID (or pass --wait).\n')
    }
  }

  private queuedApplyId(result: unknown): string | undefined {
    const state = unwrap<{ id?: string; status?: string; applied?: boolean }>(result)

    return state.status === 'queued' || state.status === 'running' ? state.id : undefined
  }
}
