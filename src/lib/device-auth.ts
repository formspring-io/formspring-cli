import { appBaseUrl, saveToken, type CliConfig } from '../config.js'
import { CliError } from './errors.js'

type DeviceSession = {
  device_code: string
  user_code: string
  verification_uri_complete: string
  expires_in: number
  interval: number
}

type DeviceTokenResponse = {
  status: 'authorization_pending' | 'success' | 'access_denied' | 'expired_token'
  access_token?: string
  message?: string
}

export async function deviceLogin(
  baseUrl: string,
  client = 'formspring-cli',
): Promise<string> {
  const sessionResponse = await fetch(`${appBaseUrl({ baseUrl } as CliConfig)}/mcp/device/session`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ client, abilities: defaultAbilities() }),
  })

  if (!sessionResponse.ok) {
    const text = await sessionResponse.text()
    throw new CliError(`Device session failed (${sessionResponse.status}): ${text}`)
  }

  const session = (await sessionResponse.json()) as DeviceSession

  process.stderr.write(
    `Open ${session.verification_uri_complete}\n` +
      `Code: ${session.user_code}\n` +
      'Waiting for approval...\n',
  )

  const deadline = Date.now() + session.expires_in * 1000
  let intervalMs = Math.max(session.interval, 2) * 1000

  while (Date.now() < deadline) {
    await sleep(intervalMs)

    const tokenResponse = await fetch(`${appBaseUrl({ baseUrl } as CliConfig)}/mcp/device/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ device_code: session.device_code }),
    })

    if (!tokenResponse.ok) {
      const text = await tokenResponse.text()
      throw new CliError(`Device token poll failed (${tokenResponse.status}): ${text}`)
    }

    const payload = (await tokenResponse.json()) as DeviceTokenResponse

    if (payload.status === 'success' && payload.access_token) {
      saveToken(payload.access_token, 'default', baseUrl)
      return payload.access_token
    }

    if (payload.status === 'access_denied') {
      throw new CliError('Device authorization denied in the browser.')
    }

    if (payload.status === 'expired_token') {
      throw new CliError('Device code expired. Run formspring auth login again.')
    }
  }

  throw new CliError('Device authorization timed out.')
}

function defaultAbilities(): string[] {
  return [
    'forms:read',
    'forms:write',
    'forms:test-email',
    'submissions:read',
    'submissions:write',
    'submissions:export',
    'webhooks:read',
    'webhooks:write',
    'automations:read',
    'automations:write',
    'automations:run',
    'surveys:read',
    'surveys:write',
    'funnels:read',
    'funnels:write',
    'funnels:publish',
    'funnels:analytics',
    'links:read',
    'links:write',
    'links:analytics:read',
    'billing:read',
    'insights:read',
    'insights:write',
    'tokens:read',
  ]
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
