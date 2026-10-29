#!/usr/bin/env node
import { spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const schemaDir = join(root, 'schema')
const fromUrl = process.argv.includes('--from-url')
const baseUrl = (process.env.FORMSPRING_BASE_URL ?? 'https://formspring.io').replace(/\/$/, '')

if (fromUrl) {
  const response = await fetch(`${baseUrl}/api/v1/openapi.json`)

  if (!response.ok) {
    console.error(`Failed to fetch OpenAPI (${response.status})`)
    process.exit(1)
  }

  mkdirSync(schemaDir, { recursive: true })
  writeFileSync(join(schemaDir, 'openapi.json'), `${await response.text()}\n`)
  console.log('Downloaded openapi.json. Export from pixel-forms for full manifest.')
  process.exit(0)
}

const appPath =
  process.env.FORMSPRING_APP_PATH ??
  (existsSync(join(root, '../pixel-forms')) ? join(root, '../pixel-forms') : null)

if (!appPath) {
  console.error('Set FORMSPRING_APP_PATH or clone pixel-forms as ../pixel-forms')
  process.exit(1)
}

// Host PHP can write to sibling ../formspring-cli/schema; Sail cannot mount outside the project.
const result = spawnSync(
  'php',
  ['artisan', 'formspring:export-api-manifest', `--target=${schemaDir}`],
  { cwd: appPath, stdio: 'inherit' },
)

if ((result.status ?? 1) !== 0) {
  process.exit(result.status ?? 1)
}

const sanitize = spawnSync('node', [join(root, 'scripts/sanitize-routes.mjs')], { cwd: root, stdio: 'inherit' })

if ((sanitize.status ?? 1) !== 0) {
  process.exit(sanitize.status ?? 1)
}

const generate = spawnSync('npm', ['run', 'generate'], { cwd: root, stdio: 'inherit' })

process.exit(generate.status ?? 0)
