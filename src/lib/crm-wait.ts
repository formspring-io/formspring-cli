import type { CliConfig } from '../config.js'
import { CliError } from './errors.js'
import { pollUntil } from './poll.js'
import { restRequest } from './rest.js'
import { unwrap } from './crm.js'

type ImportState = {
  status?: string
  error_message?: string | null
  rollback?: { finished_at?: string | null } | null
}

/**
 * Follow a CRM import until it stops. A run or a dry run is over once the status
 * leaves `queued` and `running`; a rollback once it reports `finished_at`.
 */
export async function waitForImport(options: {
  config: CliConfig
  /** Path of the import, e.g. /crm/objects/projects/imports/abc. */
  path: string
  timeoutSeconds: number
  rollback?: boolean
}): Promise<unknown> {
  const { config, path, timeoutSeconds, rollback = false } = options

  const final = await pollUntil(
    () => restRequest<unknown>({ config, method: 'GET', path }),
    (response) => {
      const state = unwrap<ImportState>(response)

      if (state.status === 'failed') {
        return true
      }

      if (rollback) {
        return Boolean(state.rollback?.finished_at)
      }

      return state.status !== 'queued' && state.status !== 'running'
    },
    { timeoutSeconds },
  )

  const state = unwrap<ImportState>(final)

  if (state.status === 'failed') {
    throw new CliError(`The import failed: ${state.error_message ?? 'no reason given'}`)
  }

  return final
}

type ApplyState = {
  status?: string
  failure?: string | null
}

/** Follow a background schema import until it has succeeded or failed. */
export async function waitForSchemaApply(options: {
  config: CliConfig
  id: string
  timeoutSeconds: number
}): Promise<unknown> {
  const { config, id, timeoutSeconds } = options

  const final = await pollUntil(
    () => restRequest<unknown>({ config, method: 'GET', path: `/crm/schema/applies/${encodeURIComponent(id)}` }),
    (response) => {
      const status = unwrap<ApplyState>(response).status

      return status === 'succeeded' || status === 'failed'
    },
    { timeoutSeconds },
  )

  const state = unwrap<ApplyState>(final)

  if (state.status === 'failed') {
    throw new CliError(`The schema import failed: ${state.failure ?? 'no reason given'}`, 1, 'What was done stays; start the same document again to continue.')
  }

  return final
}
