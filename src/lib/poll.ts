import { CliError } from './errors.js'

export type PollOptions = {
  /** Seconds to wait before giving up. */
  timeoutSeconds: number
  /** Milliseconds between checks. Override with FORMSPRING_POLL_INTERVAL_MS. */
  intervalMs?: number
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export function pollInterval(options: PollOptions): number {
  const fromEnv = Number(process.env.FORMSPRING_POLL_INTERVAL_MS)

  return Number.isFinite(fromEnv) && fromEnv > 0 ? fromEnv : (options.intervalMs ?? 2000)
}

/** Call `check` until it returns a value `isDone` accepts, or the timeout passes. */
export async function pollUntil<T>(
  check: () => Promise<T>,
  isDone: (value: T) => boolean,
  options: PollOptions,
): Promise<T> {
  const deadline = Date.now() + options.timeoutSeconds * 1000
  const interval = pollInterval(options)
  let value = await check()

  while (!isDone(value)) {
    if (Date.now() + interval > deadline) {
      throw new CliError(
        `Still running after ${options.timeoutSeconds}s.`,
        1,
        'The work continues on the server. Check it later with the matching "get" command.',
      )
    }

    await sleep(interval)
    value = await check()
  }

  return value
}
