import { apiBaseUrl, type CliConfig } from '../config.js'
import { CliError, formatApiError } from './errors.js'

export type RestRequestOptions = {
  method: string
  path: string
  query?: Record<string, string | number | boolean | undefined>
  body?: unknown
  config: CliConfig
}

export async function restRequest<T = unknown>(options: RestRequestOptions): Promise<T> {
  const { config, method, path, query, body } = options

  if (config.dryRun) {
    const preview = `${method.toUpperCase()} ${path}`
    process.stderr.write(`[dry-run] ${preview}\n`)

    return undefined as T
  }

  if (!config.token) {
    throw new CliError(
      'No API token configured.',
      1,
      'formspring auth login --base-url https://formspring.io',
    )
  }

  const url = new URL(`${apiBaseUrl(config)}${path.startsWith('/') ? path : `/${path}`}`)

  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== '') {
        url.searchParams.set(key, String(value))
      }
    }
  }

  const headers: Record<string, string> = {
    Authorization: `Bearer ${config.token}`,
    Accept: 'application/json',
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
      throw formatApiError(response.status, text)
    }

    return text as T
  }

  const data = (await response.json()) as T

  if (!response.ok) {
    throw formatApiError(response.status, JSON.stringify(data))
  }

  return data
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
