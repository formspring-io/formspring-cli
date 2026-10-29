#!/usr/bin/env node
/**
 * Reduce schema/routes.json to the public route table: domain, method, uri and name.
 * Handler and middleware details are server internals and are not needed by the CLI.
 * Safe to run repeatedly.
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const file = join(root, 'schema/routes.json')

if (!existsSync(file)) {
  console.error('schema/routes.json not found')
  process.exit(1)
}

const routes = JSON.parse(readFileSync(file, 'utf8'))
const kept = routes.map((route) => ({
  domain: route.domain ?? null,
  method: route.method,
  uri: route.uri,
  name: route.name ?? null,
}))

writeFileSync(file, `${JSON.stringify(kept, null, 2)}\n`)
console.log(`Sanitized ${kept.length} routes`)
