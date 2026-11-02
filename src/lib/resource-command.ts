import { Flags } from '@oclif/core'
import type { CliConfig } from '../config.js'
import { readRequestBody } from './body.js'
import { pickDefined } from './crm.js'
import { CliError } from './errors.js'
import { FormspringCommand } from './formspring-command.js'
import { printResult } from './output.js'
import { restDownload, restPaginate, restRequest, substitutePath, type QueryValue } from './rest.js'

/**
 * One REST operation, described by `schema/openapi.json`.
 * `scripts/scaffold-resource-commands.mts` writes one command file per operation.
 */
export type ResourceSpec = {
  /** Route name from the parity map, e.g. `api.contacts.index`. */
  route: string
  method: string
  path: string
  pathParams: ReadonlyArray<{ name: string; flag: string }>
  query: ReadonlyArray<{
    name: string
    flag: string
    type: 'string' | 'integer'
    description?: string
  }>
  /** The operation accepts a JSON body (--data / --stdin). */
  hasBody: boolean
  /** The operation accepts an Idempotency-Key header. */
  idempotent: boolean
  /** The list follows `meta.next_cursor`, so --all can walk every page. */
  paginated: boolean
  /** The response is a file, not JSON. */
  download?: { contentType: string }
}

const BASE_FLAG_NAMES = new Set([
  'json',
  'base-url',
  'token',
  'profile',
  'verbose',
  'yes',
  'dry-run',
  'data',
  'stdin',
  'idempotency-key',
  'all',
  'max-pages',
  'output',
  'force',
])

/** A flag name for an API parameter that cannot clash with the shared CLI flags. */
export function flagNameFor(parameter: string, kind: 'path' | 'query'): string {
  const kebab = parameter
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/_/g, '-')
    .toLowerCase()

  if (!BASE_FLAG_NAMES.has(kebab)) {
    return kebab
  }

  return kind === 'path' ? `${kebab}-id` : `query-${kebab}`
}

export function resourceFlags(spec: ResourceSpec) {
  // oclif flag types differ per flag kind, so the map is intentionally loose.
  const flags: Record<string, any> = {
    ...FormspringCommand.baseFlags,
  }

  for (const param of spec.pathParams) {
    flags[param.flag] = Flags.string({ required: true, description: `Path parameter ${param.name}` })
  }

  for (const param of spec.query) {
    flags[param.flag] =
      param.type === 'integer'
        ? Flags.integer({ description: param.description ?? `Query parameter ${param.name}` })
        : Flags.string({ description: param.description ?? `Query parameter ${param.name}` })
  }

  if (spec.paginated) {
    flags.all = Flags.boolean({
      description: 'Follow the cursor and return every page in one result',
      default: false,
    })
    flags['max-pages'] = Flags.integer({
      description: 'With --all, stop after this many pages',
      default: 100,
      min: 1,
    })
  }

  if (spec.hasBody) {
    flags.data = Flags.string({ description: 'JSON body (inline or @path)' })
    flags.stdin = Flags.boolean({ description: 'Read the JSON body from stdin', default: false })
  }

  if (spec.idempotent) {
    flags['idempotency-key'] = Flags.string({
      description:
        'Idempotency-Key header (max 255 chars): repeating it with the same payload replays the first result',
    })
  }

  if (spec.download) {
    const text = spec.download.contentType.startsWith('text/')
    flags.output = Flags.string({
      char: 'o',
      description: text
        ? 'File to write (default: stream to stdout)'
        : 'File to write the download to (use - for stdout)',
      required: !text,
    })
    flags.force = Flags.boolean({ description: 'Replace --output if it already exists', default: false })
  }

  return flags
}

/** The generated flags without the ones a hand-written command replaces. */
export function withoutFlags<T extends Record<string, unknown>>(flags: T, names: readonly string[]): Record<string, any> {
  return Object.fromEntries(Object.entries(flags).filter(([name]) => !names.includes(name)))
}

export abstract class ResourceCommand extends FormspringCommand {
  static spec: ResourceSpec

  /** Hand-written commands: flags that fill a body key (flag name to body key), merged over --data. */
  static bodyFlags: Record<string, string> = {}

  /** Query string built from the spec's query flags. Override to add computed parameters. */
  protected async queryFromFlags(): Promise<Record<string, QueryValue>> {
    const { spec } = this.constructor as typeof ResourceCommand
    const query: Record<string, QueryValue> = {}

    for (const param of spec.query) {
      const value = this.flags[param.flag]

      if (value !== undefined) {
        query[param.name] = value as QueryValue
      }
    }

    return query
  }

  /** JSON body from --data / --stdin. Override to build the body from friendlier flags. */
  protected async bodyFromFlags(): Promise<unknown> {
    const base = await readRequestBody({
      data: this.flags.data as string | undefined,
      stdin: Boolean(this.flags.stdin),
    })
    const { bodyFlags } = this.constructor as typeof ResourceCommand
    const picked = pickDefined(this.flags, bodyFlags)

    if (Object.keys(picked).length === 0) {
      return base
    }

    if (base !== undefined && (base === null || typeof base !== 'object' || Array.isArray(base))) {
      throw new CliError('Cannot combine the body flags with a --data body that is not a JSON object.')
    }

    return { ...(base as Record<string, unknown> | undefined), ...picked }
  }

  /** Change the result before it is printed (for example to wait for a queued job). */
  protected async transformResult(result: unknown, _context: { config: CliConfig; path: string }): Promise<unknown> {
    return result
  }

  async run(): Promise<void> {
    const { spec } = this.constructor as typeof ResourceCommand
    const config = this.getRuntimeConfig()

    const path = substitutePath(
      spec.path,
      Object.fromEntries(
        spec.pathParams.map((param) => [param.name, String(this.flags[param.flag])]),
      ),
    )

    const query = await this.queryFromFlags()

    if (spec.download) {
      const output = String(this.flags.output ?? '-')
      const result = await restDownload({
        config,
        path,
        query,
        output,
        force: Boolean(this.flags.force),
      })

      if (result) {
        if (output === '-') {
          process.stderr.write(`${result.bytes} bytes written to stdout\n`)
        } else {
          printResult(result, this.flags.json)
        }
      }

      return
    }

    const idempotencyKey = this.flags['idempotency-key'] as string | undefined

    if (idempotencyKey !== undefined && (idempotencyKey === '' || idempotencyKey.length > 255)) {
      throw new CliError('--idempotency-key must be 1 to 255 characters.')
    }

    const body = spec.hasBody ? await this.bodyFromFlags() : undefined

    if (this.flags.verbose) {
      process.stderr.write(`${spec.method} ${path}\n`)
    }

    const result =
      spec.paginated && this.flags.all
        ? await restPaginate({
            config,
            method: spec.method,
            path,
            query,
            maxPages: Number(this.flags['max-pages']),
          })
        : await restRequest({ config, method: spec.method, path, query, body, idempotencyKey })

    printResult(result === undefined ? result : await this.transformResult(result, { config, path }), this.flags.json)
  }
}
