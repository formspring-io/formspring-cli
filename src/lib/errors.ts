export class CliError extends Error {
  constructor(
    message: string,
    public readonly exitCode = 1,
    public readonly hint?: string,
    public readonly details: ApiErrorDetails = {},
  ) {
    super(message)
    this.name = 'CliError'
  }
}

/** Fields of the typed error envelope returned by the API with every status >= 400. */
export type ApiErrorDetails = {
  status?: number
  code?: string
  requestId?: string
  retryable?: boolean
}

export function formatApiError(
  status: number,
  body: string,
  headers?: { get(name: string): string | null },
): CliError {
  let parsed: Record<string, unknown> | null = null

  try {
    parsed = JSON.parse(body) as Record<string, unknown>
  } catch {
    // not json
  }

  const envelope =
    parsed && typeof parsed.error === 'object' && parsed.error !== null
      ? (parsed.error as Record<string, unknown>)
      : null

  const message =
    (typeof parsed?.message === 'string' && parsed.message) ||
    (typeof parsed?.error === 'string' && parsed.error) ||
    (typeof envelope?.message === 'string' && envelope.message) ||
    body ||
    `HTTP ${status}`

  const details: ApiErrorDetails = {
    status,
    code:
      (typeof envelope?.code === 'string' && envelope.code) ||
      (typeof parsed?.code === 'string' && parsed.code) ||
      undefined,
    requestId:
      (typeof envelope?.request_id === 'string' && envelope.request_id) ||
      (typeof parsed?.request_id === 'string' && parsed.request_id) ||
      headers?.get('x-request-id') ||
      undefined,
    retryable:
      typeof envelope?.retryable === 'boolean'
        ? envelope.retryable
        : typeof parsed?.retryable === 'boolean'
          ? parsed.retryable
          : undefined,
  }

  const hint = matchHint(status, parsed, details)

  return new CliError(`API error (${status}): ${message}`, 1, hint, details)
}

function matchHint(
  status: number,
  parsed: Record<string, unknown> | null,
  details: ApiErrorDetails,
): string | undefined {
  if (status === 401) {
    return 'formspring auth login --base-url <your-app-url>'
  }

  if (status === 402) {
    return 'Upgrade API or MCP access on your Formspring plan, then retry.'
  }

  if (status === 403) {
    return 'Mint a token with the required ability: https://formspring.io/docs/api/tokens-and-abilities'
  }

  if (status === 409 && details.code === 'idempotency_key_reused') {
    return 'This --idempotency-key was already used with a different payload. Use a new key, or resend the original payload.'
  }

  if (status === 409 && details.code === 'operation_pending') {
    return 'The first request with this --idempotency-key is still running. Wait a moment and retry with the same key.'
  }

  if (status === 422 && (parsed?.errors || parsed?.error)) {
    return 'Fix validation errors and retry with --data @payload.json'
  }

  if (details.retryable) {
    return 'This error is retryable. Wait a moment and try again.'
  }

  return undefined
}
