export class CliError extends Error {
  constructor(
    message: string,
    public readonly exitCode = 1,
    public readonly hint?: string,
  ) {
    super(message)
    this.name = 'CliError'
  }
}

export function formatApiError(status: number, body: string): CliError {
  let parsed: Record<string, unknown> | null = null

  try {
    parsed = JSON.parse(body) as Record<string, unknown>
  } catch {
    // not json
  }

  const message =
    (typeof parsed?.message === 'string' && parsed.message) ||
    (typeof parsed?.error === 'string' && parsed.error) ||
    body ||
    `HTTP ${status}`

  const hint = matchHint(status, parsed)

  return new CliError(`API error (${status}): ${message}`, 1, hint)
}

function matchHint(status: number, parsed: Record<string, unknown> | null): string | undefined {
  if (status === 401) {
    return 'formspring auth login --base-url <your-app-url>'
  }

  if (status === 402) {
    return 'Upgrade API or MCP access on your Formspring plan, then retry.'
  }

  if (status === 403) {
    return 'Mint a token with the required ability: https://formspring.io/docs/api/tokens-and-abilities'
  }

  if (status === 422 && parsed?.errors) {
    return 'Fix validation errors and retry with --data @payload.json'
  }

  return undefined
}
