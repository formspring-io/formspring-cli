import { execFile } from 'node:child_process'
import { createServer, type IncomingMessage, type Server } from 'node:http'
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import type { AddressInfo } from 'node:net'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const built = existsSync(join(root, 'dist/commands/contacts/list.js'))

type Seen = { method: string; path: string; query: URLSearchParams; headers: IncomingMessage['headers']; body: string }

let server: Server
let baseUrl: string
let workDir: string
let seen: Seen[] = []
const polls: Record<string, number> = {}
const pdf = Buffer.from([0x25, 0x50, 0x44, 0x46, 0x2d, 0x00, 0xff, 0xfe, 0x80, 0x0a])

function json(response: import('node:http').ServerResponse, status: number, payload: unknown): void {
  response.statusCode = status
  response.setHeader('content-type', 'application/json')
  response.end(JSON.stringify(payload))
}

beforeAll(async () => {
  workDir = mkdtempSync(join(tmpdir(), 'formspring-cli-e2e-'))
  server = createServer((request, response) => {
    const chunks: Buffer[] = []
    request.on('data', (chunk: Buffer) => chunks.push(chunk))
    request.on('end', () => {
      const url = new URL(request.url ?? '/', 'http://localhost')
      const path = url.pathname.replace('/api/v1', '')
      const method = request.method ?? 'GET'
      seen.push({ method, path, query: url.searchParams, headers: request.headers, body: Buffer.concat(chunks).toString('utf8') })

      if (method === 'GET' && path === '/contacts') {
        return url.searchParams.get('cursor')
          ? json(response, 200, { data: [{ id: 'c3' }], meta: { next_cursor: null, total: 3 } })
          : json(response, 200, { data: [{ id: 'c1' }, { id: 'c2' }], meta: { next_cursor: 'cur2', total: 3 } })
      }

      if (method === 'POST' && path === '/contacts') {
        return request.headers['idempotency-key'] === 'reused'
          ? json(response, 409, { message: 'Conflict', error: { code: 'idempotency_key_reused', message: 'Conflict', request_id: 'req_409', retryable: false } })
          : json(response, 201, { id: 'c9' })
      }

      if (method === 'GET' && path === '/forms/frm_1/attribution') {
        return json(response, 200, { sources: [{ source: 'newsletter', count: 4 }], totals: { rows: 4 } })
      }

      if (method === 'POST' && path === '/links/imports') {
        return json(response, 202, { data: { id: 'lim_1', status: 'queued' } })
      }

      if (method === 'GET' && path === '/links/imports/lim_1') {
        polls.links = (polls.links ?? 0) + 1

        return json(response, 200, { data: { id: 'lim_1', status: polls.links < 2 ? 'running' : 'dry_run', would_create: 2 } })
      }

      if (method === 'POST' && path === '/contacts/exports') {
        return json(response, 202, { id: 'ex_1', status: 'queued' })
      }

      if (method === 'GET' && path === '/contacts/exports/ex_1') {
        polls.export = (polls.export ?? 0) + 1

        return json(response, 200, { id: 'ex_1', status: polls.export < 2 ? 'processing' : 'ready', row_count: 2 })
      }

      if (method === 'GET' && path === '/contacts/exports/ex_1/download') {
        response.setHeader('content-type', 'text/csv')

        return response.end('id,name\n1,Ada\n2,Grace\n')
      }

      if (method === 'GET' && path === '/forms/frm_1/submissions/sub_1/documents/doc_1/download') {
        response.setHeader('content-type', 'application/pdf')

        return response.end(pdf)
      }

      return json(response, 404, { message: 'Not found', error: { code: 'not_found', message: 'Not found', request_id: 'req_404', retryable: false } })
    })
  })

  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
  baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`
})

afterAll(async () => {
  await new Promise((resolve) => server.close(resolve))
  rmSync(workDir, { recursive: true, force: true })
})

beforeEach(() => {
  seen = []
  Object.keys(polls).forEach((key) => delete polls[key])
})

function run(args: string[]): Promise<{ code: number; stdout: string; stderr: string }> {
  return new Promise((resolve) => {
    execFile(
      process.execPath,
      [join(root, 'bin/run.js'), ...args],
      {
        cwd: root,
        env: {
          PATH: process.env.PATH,
          HOME: workDir,
          FORMSPRING_BASE_URL: baseUrl,
          FORMSPRING_TOKEN: 'test-token',
          FORMSPRING_POLL_INTERVAL_MS: '10',
        },
      },
      (error, stdout, stderr) => {
        resolve({ code: error ? ((error as { code?: number }).code ?? 1) : 0, stdout, stderr })
      },
    )
  })
}

describe.skipIf(!built)('formspring CLI against a local API stub', () => {
  it('lists every page with --all', async () => {
    const result = await run(['contacts', 'list', '--all', '--json'])
    const payload = JSON.parse(result.stdout) as { data: Array<{ id: string }>; meta: { pages: number } }

    expect(result.code).toBe(0)
    expect(payload.data.map((row) => row.id)).toEqual(['c1', 'c2', 'c3'])
    expect(payload.meta.pages).toBe(2)
  })

  it('passes filters and a single cursor page through', async () => {
    await run(['contacts', 'list', '--q', 'ada', '--lifecycle-stage', 'lead', '--per-page', '10', '--json'])

    expect(seen[0].query.get('q')).toBe('ada')
    expect(seen[0].query.get('lifecycle_stage')).toBe('lead')
    expect(seen[0].query.get('per_page')).toBe('10')
  })

  it('sends the body and the Idempotency-Key header on writes', async () => {
    const result = await run(['contacts', 'create', '--data', '{"email":"ada@example.com"}', '--idempotency-key', 'import-1', '--json'])

    expect(result.code).toBe(0)
    expect(seen[0].headers['idempotency-key']).toBe('import-1')
    expect(JSON.parse(seen[0].body)).toEqual({ email: 'ada@example.com' })
  })

  it('exits 1 and shows the request id when the API refuses a write', async () => {
    const result = await run(['contacts', 'create', '--data', '{}', '--idempotency-key', 'reused', '--json'])

    expect(result.code).toBe(1)
    expect(result.stdout).toBe('')
    expect(result.stderr).toContain('API error (409)')
    expect(result.stderr).toContain('request_id: req_409')
    expect(result.stderr).toContain('different payload')
  })

  it('prints the request and sends nothing with --dry-run', async () => {
    const result = await run(['contacts', 'create', '--data', '{"email":"x@y.z"}', '--idempotency-key', 'k', '--dry-run', '--json'])

    expect(result.code).toBe(0)
    expect(seen).toHaveLength(0)
    expect(result.stderr).toContain('[dry-run] POST /contacts')
    expect(result.stderr).toContain('Idempotency-Key: k')
    expect(JSON.parse(result.stdout)).toBeNull()
  })

  it('reads a report with path parameters', async () => {
    const result = await run(['forms', 'attribution', '--form', 'frm_1', '--json'])

    expect(JSON.parse(result.stdout)).toMatchObject({ totals: { rows: 4 } })
  })

  it('requires path parameters', async () => {
    const result = await run(['forms', 'attribution', '--json'])

    expect(result.code).not.toBe(0)
    expect(result.stderr).toContain('Missing required flag form')
  })

  it('imports links with a server-side check and waits for the result', async () => {
    const file = join(workDir, 'links.csv')
    writeFileSync(file, 'target_url,slug\nhttps://example.com/a,a\n')

    const result = await run(['links', 'import', '--file', file, '--check-only', '--import-key', 'launch', '--wait', '--json'])
    const post = seen.find((row) => row.method === 'POST')

    expect(result.code).toBe(0)
    expect(JSON.parse(post?.body ?? '{}')).toMatchObject({ dry_run: true, import_key: 'launch', csv: 'target_url,slug\nhttps://example.com/a,a\n' })
    expect(JSON.parse(result.stdout)).toMatchObject({ data: { status: 'dry_run', would_create: 2 } })
    expect(polls.links).toBe(2)
  })

  it('exports contacts to a file after the export is ready', async () => {
    const output = join(workDir, 'contacts.csv')
    const result = await run(['contacts', 'export', '--output', output, '--columns', 'name, email', '--filters', '{"tag":"vip"}', '--json'])

    expect(result.code).toBe(0)
    expect(readFileSync(output, 'utf8')).toBe('id,name\n1,Ada\n2,Grace\n')
    expect(JSON.parse(seen[0].body)).toEqual({ filters: { tag: 'vip' }, columns: ['name', 'email'] })
    expect(JSON.parse(result.stdout)).toMatchObject({ export_id: 'ex_1', rows: 2, bytes: 22 })
  })

  it('streams a signed PDF to disk without corrupting it', async () => {
    const output = join(workDir, 'document.pdf')
    const result = await run([
      'forms', 'submissions', 'documents', 'download',
      '--form', 'frm_1', '--submission', 'sub_1', '--document', 'doc_1',
      '--output', output, '--json',
    ])

    expect(result.code).toBe(0)
    expect(readFileSync(output).equals(pdf)).toBe(true)
  })

  it('asks for --output on binary downloads', async () => {
    const result = await run(['forms', 'submissions', 'documents', 'download', '--form', 'a', '--submission', 'b', '--document', 'c'])

    expect(result.code).not.toBe(0)
    expect(result.stderr).toContain('Missing required flag output')
  })

  it('fills any path parameter and follows pages through api request', async () => {
    const result = await run(['api', 'request', 'GET', '/contacts', '--all', '--json'])
    expect(JSON.parse(result.stdout).data).toHaveLength(3)

    seen = []
    await run(['api', 'request', 'GET', '/forms/{form}/attribution', '--param', 'form=frm_1', '--json'])
    expect(seen[0].path).toBe('/forms/frm_1/attribution')
  })

  it('lists the generated commands for agents', async () => {
    const result = await run(['commands', '--json'])
    const payload = JSON.parse(result.stdout) as { commands: string[]; parity: Array<{ name: string | null; cli_command: string | null }> }

    expect(payload.commands).toEqual(expect.arrayContaining(['contacts list', 'links import', 'contacts export', 'forms automations runs get']))
    expect(payload.parity.find((row) => row.name === 'api.contacts.index')?.cli_command).toBe('contacts list')
  })
})
