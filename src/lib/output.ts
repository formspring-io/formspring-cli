export function printResult(data: unknown, json: boolean): void {
  if (json) {
    process.stdout.write(`${JSON.stringify(data ?? null, null, 2)}\n`)
    return
  }

  if (data === undefined || data === null) {
    process.stdout.write('ok\n')
    return
  }

  if (typeof data === 'string') {
    process.stdout.write(`${data}\n`)
    return
  }

  process.stdout.write(`${JSON.stringify(data, null, 2)}\n`)
}

export function printError(error: Error): void {
  const lines = [error.message]

  if (error instanceof Error && 'hint' in error && typeof (error as { hint?: string }).hint === 'string') {
    lines.push((error as { hint: string }).hint)
  }

  const details = (error as { details?: { code?: string; requestId?: string } }).details

  if (details?.requestId) {
    lines.push(
      `request_id: ${details.requestId}${details.code ? ` (${details.code})` : ''} - quote it to support`,
    )
  }

  process.stderr.write(`${lines.join('\n')}\n`)
}
