import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { homedir } from 'node:os'
import { dirname, join } from 'node:path'

export type CliConfig = {
  baseUrl: string
  token?: string
  profile?: string
}

const CONFIG_DIR = join(homedir(), '.config', 'formspring')
const CONFIG_FILE = join(CONFIG_DIR, 'config.json')

const DEFAULT_BASE_URL = 'https://formspring.io'

export function loadConfig(profile?: string): CliConfig {
  const fromEnv: CliConfig = {
    baseUrl: process.env.FORMSPRING_BASE_URL ?? DEFAULT_BASE_URL,
    token: process.env.FORMSPRING_TOKEN,
    profile: profile ?? process.env.FORMSPRING_PROFILE,
  }

  if (!existsSync(CONFIG_FILE)) {
    return fromEnv
  }

  const file = JSON.parse(readFileSync(CONFIG_FILE, 'utf8')) as Record<
    string,
    CliConfig
  >

  const key = profile ?? fromEnv.profile ?? 'default'
  const stored = file[key] ?? file.default

  return {
    baseUrl: fromEnv.baseUrl ?? stored?.baseUrl ?? DEFAULT_BASE_URL,
    token: fromEnv.token ?? stored?.token,
    profile: key,
  }
}

export function saveToken(token: string, profile = 'default', baseUrl?: string): void {
  mkdirSync(CONFIG_DIR, { recursive: true })

  let file: Record<string, CliConfig> = {}

  if (existsSync(CONFIG_FILE)) {
    file = JSON.parse(readFileSync(CONFIG_FILE, 'utf8')) as Record<string, CliConfig>
  }

  file[profile] = {
    baseUrl: baseUrl ?? file[profile]?.baseUrl ?? DEFAULT_BASE_URL,
    token,
    profile,
  }

  writeFileSync(CONFIG_FILE, `${JSON.stringify(file, null, 2)}\n`, 'utf8')
}

export function apiBaseUrl(config: CliConfig): string {
  return `${config.baseUrl.replace(/\/$/, '')}/api/v1`
}

export function appBaseUrl(config: CliConfig): string {
  return config.baseUrl.replace(/\/$/, '')
}
