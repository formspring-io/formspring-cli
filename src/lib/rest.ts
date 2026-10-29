import { createWriteStream } from 'node:fs'
import { stat } from 'node:fs/promises'
import { Readable } from 'node:stream'
import { pipeline } from 'node:stream/promises'
import type { ReadableStream as WebReadableStream } from 'node:stream/web'
import { apiBaseUrl, type CliConfig } from '../config.js'
import { CliError, formatApiError } from './errors.js'

export type QueryValue = string | number | boolean | undefined

export type RestRequestOptions = {
  method: string
  path: string
  query?: Record<string, QueryValue>
  body?: unknown
  config: CliConfig
  /** Sent as the Idempotency-Key header so a repeated write is replayed, not repeated. */
  idempotencyKey?: string
}

function buildUrl(config: CliConfig, path: string, query?: Record<string, QueryValue>): URL {
  const url = new URL(`${apiBaseUrl(config)}${path.startsWith('/') ? path : `/${path}`}`)

  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== '') {
        url.searchParams.set(key, String(value))
      }
    }
  }

  return url
}

function requireToken(config: CliConfig): string {
  if (!config.token) {
    throw new CliError(
      'No API token configured.',
      1,
      'formspring auth login --base-url https://formspring.io',
    )
  }

  return config.token
}

function logDryRun(options: RestRequestOptions): void {
  const { method, path, query, body, idempotencyKey } = options
  const search = new URLSearchParams()

  for (const [key, value] of Object.entries(query ?? {})) {
    if (value !== undefined && value !== '') {
      search.set(key, String(value))
    }
  }

  const suffix = search.toString() === '' ? '' : `?${search.toString()}`
  process.stderr.write(`[dry-run] ${method.toUpperCase()} ${path}${suffix}\n`)

  if (idempotencyKey) {
    process.stderr.write(`[dry-run] Idempotency-Key: ${idempotencyKey}\n`)
  }

  if (body !== undefined) {
    process.stderr.write(`[dry-run] body: ${JSON.stringify(body)}\n`)
  }
}

export async function restRequest<T = unknown>(options: RestRequestOptions): Promise<T> {
  const { config, method, path, query, body, idempotencyKey } = options

  if (config.dryRun) {
    logDryRun(options)

    return undefined as T
  }

  const token = requireToken(config)
  const url = buildUrl(config, path, query)

  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    Accept: 'application/json',
  }

  if (idempotencyKey) {
    headers['Idempotency-Key'] = idempotencyKey
  }

  const init: RequestInit = { method: method.toUpperCase(), headers }

  if (body !== undefined && !['GET', 'HEAD'].includes(init.method ?? '')) {
    headers['Content-Type'] = 'application/json'
    init.body = JSON.stringify(body)
  }

  const response = await fetch(url, init)

  if (response.status === 204) {
    return undefined as T
  }

  const contentType = response.headers.get('content-type') ?? ''

  if (!contentType.includes('application/json')) {
    const text = await response.text()

    if (!response.ok) {
      throw formatApiError(response.status, text, response.headers)
    }

    return text as T
  }

  const data = (await response.json()) as T

  if (!response.ok) {
    throw formatApiError(response.status, JSON.stringify(data), response.headers)
  }

  return data
}

export type PaginateOptions = Omit<RestRequestOptions, 'body' | 'idempotencyKey'> & {
  /** Stop after this many pages so a runaway cursor cannot loop forever. */
  maxPages?: number
}

type Page = {
  data?: unknown
  meta?: { next_cursor?: string | null; total?: number } & Record<string, unknown>
}

/**
 * Follow `meta.next_cursor` until the last page and return every item in one
 * `{ data, meta }` envelope. Falls back to the plain response for endpoints that
 * do not return a `data` list.
 */
export async function restPaginate(options: PaginateOptions): Promise<unknown> {
  const { maxPages = 100, ...rest } = options
  const items: unknown[] = []
  const query: Record<string, QueryValue> = { ...rest.query }
  let pages = 0
  let total: number | undefined
  let cursor: string | null | undefined

  do {
    if (cursor) {
      query.cursor = cursor
      delete query.page
    }

    const page = (await restRequest<Page | undefined>({ ...rest, query })) as Page | undefined

    if (page === undefined) {
      return undefined
    }

    if (!Array.isArray(page.data)) {
      return page
    }

    items.push(...page.data)
    pages += 1
    total = typeof page.meta?.total === 'number' ? page.meta.total : total
    cursor = page.meta?.next_cursor ?? null
  } while (cursor && pages < maxPages)

  return {
    data: items,
    meta: {
      total: total ?? items.length,
      count: items.length,
      pages,
      next_cursor: cursor ?? null,
      truncated: Boolean(cursor),
    },
  }
}

export type DownloadOptions = {
  path: string
  config: CliConfig
  query?: Record<string, QueryValue>
  /** File to write, or `-` for stdout. */
  output: string
  /** Replace an existing file instead of failing. */
  force?: boolean
}

export type DownloadResult = {
  path: string
  bytes: number
  content_type: string | null
}

/** Stream a file response to disk without holding it in memory. */
export async function restDownload(options: DownloadOptions): Promise<DownloadResult | undefined> {
  const { config, path, query, output, force } = options

  if (config.dryRun) {
    logDryRun({ config, method: 'GET', path, query })
    process.stderr.write(`[dry-run] write to ${output}\n`)

    return undefined
  }

  const token = requireToken(config)
  const response = await fetch(buildUrl(config, path, query), {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}`, Accept: '*/*' },
  })

  if (!response.ok) {
    throw formatApiError(response.status, await response.text(), response.headers)
  }

  const contentType = response.headers.get('content-type')

  if (!response.body) {
    throw new CliError('The server returned an empty download.')
  }

  const source = Readable.fromWeb(response.body as unknown as WebReadableStream)

  if (output === '-') {
    let bytes = 0
    source.on('data', (chunk: Buffer) => {
      bytes += chunk.length
    })
    await pipeline(source, process.stdout, { end: false })

    return { path: '-', bytes, content_type: contentType }
  }

  try {
    await pipeline(source, createWriteStream(output, { flags: force ? 'w' : 'wx' }))
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'EEXIST') {
      throw new CliError(`${output} already exists.`, 1, 'Pass --force to replace it, or choose another --output.')
    }

    throw error
  }

  return { path: output, bytes: (await stat(output)).size, content_type: contentType }
}

export function substitutePath(
  template: string,
  params: Record<string, string | undefined>,
): string {
  let path = template

  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === '') {
      throw new CliError(`Missing required path parameter: ${key}`)
    }

    path = path.replace(`{${key}}`, encodeURIComponent(value))
  }

  return path
}
