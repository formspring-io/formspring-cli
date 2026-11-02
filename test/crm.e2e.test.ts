import { execFile } from 'node:child_process'
import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http'
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import type { AddressInfo } from 'node:net'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

// Some tests start several CLI processes in a row.
vi.setConfig({ testTimeout: 30_000 })

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const built = existsSync(join(root, 'dist/commands/crm/records/list.js'))

type Seen = { method: string; path: string; query: URLSearchParams; headers: IncomingMessage['headers']; body: string }

let server: Server
let baseUrl: string
let workDir: string
let seen: Seen[] = []
const polls: Record<string, number> = {}

function json(response: ServerResponse, status: number, payload: unknown): void {
  response.statusCode = status
  response.setHeader('content-type', 'application/json')
  response.end(JSON.stringify(payload))
}

const OBJ = '/crm/objects/projects'

beforeAll(async () => {
  workDir = mkdtempSync(join(tmpdir(), 'formspring-cli-crm-e2e-'))
  server = createServer((request, response) => {
    const chunks: Buffer[] = []
    request.on('data', (chunk: Buffer) => chunks.push(chunk))
    request.on('end', () => {
      const url = new URL(request.url ?? '/', 'http://localhost')
      const method = request.method ?? 'GET'
      const path = url.pathname.replace('/api/v1', '')
      seen.push({ method, path, query: url.searchParams, headers: request.headers, body: Buffer.concat(chunks).toString('latin1') })
      const key = `${method} ${path}`

      if (key === `GET ${OBJ}/records`) {
        return url.searchParams.get('cursor')
          ? json(response, 200, { data: [{ id: 'r3' }], meta: { next_cursor: null, total: 3 } })
          : json(response, 200, { data: [{ id: 'r1' }, { id: 'r2' }], meta: { next_cursor: 'cur2', total: 3 } })
      }

      if (key === `POST ${OBJ}/records`) {
        return json(response, 201, { data: { id: 'r9' } })
      }

      if (key === `POST ${OBJ}/imports`) {
        return json(response, 201, { data: { id: 'imp_1', status: 'uploaded', columns: ['Name'] } })
      }

      if (key === `POST ${OBJ}/imports/imp_1/run` || key === `POST ${OBJ}/imports/imp_1/dry-run`) {
        return json(response, 202, { data: { id: 'imp_1', status: 'queued' } })
      }

      if (key === `POST ${OBJ}/imports/imp_1/rollback`) {
        return json(response, 202, { data: { id: 'imp_1', status: 'completed', rollback: { requested_at: 'now', finished_at: null } } })
      }

      if (key === `GET ${OBJ}/imports/imp_1`) {
        polls.import = (polls.import ?? 0) + 1
        const lastPost = seen.filter((row) => row.method === 'POST').at(-1)?.path ?? ''

        if (lastPost.endsWith('/rollback')) {
          return json(response, 200, {
            data: { id: 'imp_1', status: 'completed', rollback: { finished_at: polls.import < 2 ? null : 'later', counts: { removed: 2 } } },
          })
        }

        return json(response, 200, { data: { id: 'imp_1', status: polls.import < 2 ? 'running' : 'completed', created: 2 } })
      }

      if (key === `POST ${OBJ}/exports`) {
        return json(response, 202, { data: { id: 'exp_1', status: 'queued' } })
      }

      if (key === `GET ${OBJ}/exports/exp_1`) {
        polls.export = (polls.export ?? 0) + 1

        return json(response, 200, {
          data: { id: 'exp_1', status: polls.export < 2 ? 'processing' : 'ready', row_count: 2, download_url: `${baseUrl}/signed/exp_1.csv?sig=abc` },
        })
      }

      if (method === 'GET' && path === '/signed/exp_1.csv') {
        response.setHeader('content-type', 'text/csv')

        return response.end('name\nAlpha\nBeta\n')
      }

      if (key === `POST ${OBJ}/fields/attachments/files`) {
        return json(response, 201, { data: { id: 'file_1', name: 'brief.txt' } })
      }

      if (key === 'GET /crm/schema') {
        return json(response, 200, { data: { format: 'formspring.crm.schema', version: 1, objects: [] } })
      }

      if (key === 'PUT /crm/schema') {
        if (url.searchParams.get('dry_run')) {
          return json(response, 200, { data: { summary: { create: 1 }, changes: [] } })
        }

        return url.searchParams.get('async')
          ? json(response, 202, { data: { id: 'apply_1', status: 'queued', progress: { done: 0, total: 70 } } })
          : json(response, 200, { data: { applied: true } })
      }

      if (key === 'GET /crm/schema/applies/apply_1') {
        polls.apply = (polls.apply ?? 0) + 1

        return json(response, 200, { data: { id: 'apply_1', status: polls.apply < 2 ? 'running' : 'succeeded' } })
      }

      if (method === 'GET' && path === `${OBJ}/records/bad`) {
        return json(response, 404, { message: 'Not found', error: { code: 'not_found', message: 'Not found', request_id: 'req_404', retryable: false } })
      }

      return json(response, 200, { data: { ok: true } })
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

function run(args: string[], input?: string): Promise<{ code: number; stdout: string; stderr: string }> {
  return new Promise((resolve) => {
    const child = execFile(
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

    child.stdin?.end(input ?? '')
  })
}

const body = (index = 0): Record<string, unknown> => JSON.parse(seen[index].body) as Record<string, unknown>

describe.skipIf(!built)('crm records', () => {
  it('turns the list flags into the query the API takes', async () => {
    const result = await run([
      'crm', 'records', 'list', '--object', 'projects',
      '--filter', 'status:is:active', '--filter', 'budget:gte:1000', '--sort=-budget', '--sort', 'name:asc',
      '--group-by', 'status', '--view', 'view_1', '--fields', 'name,budget', '--include', 'client', '--limit', '25', '--json',
    ])

    expect(result.code).toBe(0)
    expect(seen[0].path).toBe(`${OBJ}/records`)
    expect(JSON.parse(seen[0].query.get('filter') ?? '')).toEqual({
      operator: 'and',
      children: [
        { field: 'status', operator: 'is', value: 'active' },
        { field: 'budget', operator: 'gte', value: 1000 },
      ],
    })
    expect(seen[0].query.get('sort')).toBe('-budget,name')
    expect(seen[0].query.get('group_by')).toBe('status')
    expect(seen[0].query.get('view')).toBe('view_1')
    expect(seen[0].query.get('fields')).toBe('name,budget')
    expect(seen[0].query.get('include')).toBe('client')
    expect(seen[0].query.get('per_page')).toBe('25')
    expect(seen[0].headers.authorization).toBe('Bearer test-token')
  })

  it('accepts a JSON filter tree and the --per-page alias', async () => {
    const tree = { operator: 'or', children: [{ field: 'a', operator: 'empty' }] }
    await run(['crm', 'records', 'list', '--object', 'projects', '--filter', JSON.stringify(tree), '--per-page', '5', '--json'])

    expect(JSON.parse(seen[0].query.get('filter') ?? '')).toEqual(tree)
    expect(seen[0].query.get('per_page')).toBe('5')
  })

  it('follows the cursor with --all and keeps the filter on every page', async () => {
    const result = await run(['crm', 'records', 'list', '--object', 'projects', '--filter', 'status:is:active', '--all', '--json'])
    const payload = JSON.parse(result.stdout) as { data: Array<{ id: string }>; meta: { pages: number; total: number } }

    expect(payload.data.map((row) => row.id)).toEqual(['r1', 'r2', 'r3'])
    expect(payload.meta).toMatchObject({ pages: 2, total: 3 })
    expect(seen).toHaveLength(2)
    expect(seen[1].query.get('cursor')).toBe('cur2')
    expect(seen[1].query.get('filter')).toBe(seen[0].query.get('filter'))
  })

  it('passes one page cursor through', async () => {
    await run(['crm', 'records', 'list', '--object', 'projects', '--cursor', 'cur2', '--json'])

    expect(seen[0].query.get('cursor')).toBe('cur2')
  })

  it('rejects a filter it cannot read before sending anything', async () => {
    const result = await run(['crm', 'records', 'list', '--object', 'projects', '--filter', 'garbage', '--json'])

    expect(result.code).toBe(1)
    expect(seen).toHaveLength(0)
    expect(result.stderr).toContain('Could not read the filter')
  })

  it('creates a record from --set pairs with an idempotency key', async () => {
    const result = await run([
      'crm', 'records', 'create', '--object', 'projects',
      '--set', 'name=Relaunch', '--set', 'budget:=12000', '--set', 'tags:=["a"]', '--idempotency-key', 'proj-1', '--json',
    ])

    expect(result.code).toBe(0)
    expect(seen[0].method).toBe('POST')
    expect(seen[0].headers['idempotency-key']).toBe('proj-1')
    expect(body()).toEqual({ values: { name: 'Relaunch', budget: 12000, tags: ['a'] } })
  })

  it('merges --set over a --data body', async () => {
    await run(['crm', 'records', 'create', '--object', 'projects', '--data', '{"values":{"a":1,"b":2}}', '--set', 'b:=3', '--json'])

    expect(body()).toEqual({ values: { a: 1, b: 3 } })
  })

  it('updates, upserts and bulk-changes records', async () => {
    await run(['crm', 'records', 'update', '--object', 'projects', '--record', 'r1', '--set', 'status=done', '--set', 'notes:=null', '--json'])
    await run(['crm', 'records', 'upsert', '--object', 'projects', '--match', 'code', '--set', 'code=P-1', '--json'])
    await run([
      'crm', 'records', 'bulk', '--object', 'projects', '--action', 'link', '--ids', 'r1, r2', '--field', 'client', '--records', 'c1', '--json',
    ])
    await run(['crm', 'records', 'bulk', '--object', 'projects', '--action', 'update', '--ids', 'r1', '--set', 'status=won', '--json'])

    expect(seen.map((row) => `${row.method} ${row.path}`)).toEqual([
      `PATCH ${OBJ}/records/r1`,
      `POST ${OBJ}/records/upsert`,
      `POST ${OBJ}/records/bulk`,
      `POST ${OBJ}/records/bulk`,
    ])
    expect(body(0)).toEqual({ values: { status: 'done', notes: null } })
    expect(body(1)).toEqual({ match: 'code', values: { code: 'P-1' } })
    expect(body(2)).toEqual({ action: 'link', ids: ['r1', 'r2'], field: 'client', records: ['c1'] })
    expect(body(3)).toEqual({ action: 'update', ids: ['r1'], values: { status: 'won' } })
  })

  it('reads, deletes and restores a record', async () => {
    await run(['crm', 'records', 'get', '--object', 'projects', '--record', 'r1', '--include', 'client', '--json'])
    await run(['crm', 'records', 'delete', '--object', 'projects', '--record', 'r1', '--json'])
    await run(['crm', 'records', 'restore', '--object', 'projects', '--record', 'r1', '--json'])

    expect(seen.map((row) => `${row.method} ${row.path}`)).toEqual([
      `GET ${OBJ}/records/r1`,
      `DELETE ${OBJ}/records/r1`,
      `POST ${OBJ}/records/r1/restore`,
    ])
    expect(seen[0].query.get('include')).toBe('client')
  })

  it('batches records with --data', async () => {
    await run(['crm', 'records', 'batch', 'create', '--object', 'projects', '--data', '{"records":[{"values":{"name":"A"}}]}', '--json'])
    await run(['crm', 'records', 'batch', 'delete', '--object', 'projects', '--data', '{"ids":["r1"]}', '--json'])

    expect(seen[0].path).toBe(`${OBJ}/records/batch`)
    expect(body(1)).toEqual({ ids: ['r1'] })
  })

  it('exits 1 with the request id when a record does not exist', async () => {
    const result = await run(['crm', 'records', 'get', '--object', 'projects', '--record', 'bad', '--json'])

    expect(result.code).toBe(1)
    expect(result.stderr).toContain('request_id: req_404')
  })

  it('prints the request and sends nothing with --dry-run', async () => {
    const result = await run(['crm', 'records', 'create', '--object', 'projects', '--set', 'name=X', '--dry-run', '--json'])

    expect(seen).toHaveLength(0)
    expect(result.stderr).toContain(`[dry-run] POST ${OBJ}/records`)
    expect(result.stderr).toContain('"values":{"name":"X"}')
  })

  it('writes and reads notes and tasks', async () => {
    await run(['crm', 'records', 'notes', 'create', '--object', 'projects', '--record', 'r1', '--body', 'Called them', '--json'])
    await run(['crm', 'records', 'notes', 'pin', '--object', 'projects', '--record', 'r1', '--note', 'n1', '--no-pinned', '--json'])
    await run(['crm', 'records', 'notes', 'pin', '--object', 'projects', '--record', 'r1', '--note', 'n1', '--json'])
    await run(['crm', 'records', 'notes', 'list', '--object', 'projects', '--record', 'r1', '--json'])
    await run([
      'crm', 'records', 'tasks', 'create', '--object', 'projects', '--record', 'r1', '--title', 'Call back', '--due', '2026-12-01T09:00:00', '--assignee', '7', '--json',
    ])
    await run(['crm', 'records', 'tasks', 'list', '--object', 'projects', '--record', 'r1', '--status', 'open', '--json'])
    await run(['crm', 'records', 'tasks', 'complete', '--object', 'projects', '--record', 'r1', '--task', 't1', '--json'])

    expect(body(0)).toEqual({ body: 'Called them' })
    expect(seen[1].method).toBe('PUT')
    expect(body(1)).toEqual({ pinned: false })
    expect(body(2)).toEqual({ pinned: true })
    expect(seen[3].path).toBe(`${OBJ}/records/r1/notes`)
    expect(body(4)).toEqual({ title: 'Call back', due_at: '2026-12-01T09:00:00', assignee_user_id: 7 })
    expect(seen[5].query.get('status')).toBe('open')
    expect(seen[6].path).toBe(`${OBJ}/records/r1/tasks/t1/complete`)
  })
})

describe.skipIf(!built)('crm data model commands', () => {
  it('creates and changes objects', async () => {
    await run(['crm', 'objects', 'create', '--label-singular', 'Project', '--label-plural', 'Projects', '--idempotency-key', 'o1', '--json'])
    await run(['crm', 'objects', 'update', '--object', 'projects', '--label-plural', 'Jobs', '--no-active', '--json'])
    await run(['crm', 'objects', 'deactivate', '--object', 'projects', '--json'])
    await run(['crm', 'objects', 'activate', '--object', 'projects', '--json'])
    await run(['crm', 'objects', 'delete', '--object', 'projects', '--json'])
    await run(['crm', 'objects', 'list', '--include', 'fields', '--active', 'true', '--json'])

    expect(body(0)).toEqual({ label_singular: 'Project', label_plural: 'Projects' })
    expect(seen[0].headers['idempotency-key']).toBe('o1')
    expect(body(1)).toEqual({ label_plural: 'Jobs', is_active: false })
    expect(seen[2].method).toBe('PATCH')
    expect(body(2)).toEqual({ is_active: false })
    expect(body(3)).toEqual({ is_active: true })
    expect(seen[4]).toMatchObject({ method: 'DELETE', path: OBJ })
    expect(seen[5].query.get('include')).toBe('fields')
  })

  it('creates select fields with options and archives them', async () => {
    await run(['crm', 'fields', 'create', '--object', 'projects', '--label', 'Status', '--type', 'select', '--options', 'Planned, Active,Done', '--unique', '--no-required', '--json'])
    await run(['crm', 'fields', 'options', '--object', 'projects', '--field', 'status', '--options', '[{"value":"planned","label":"Planned"}]', '--json'])
    await run(['crm', 'fields', 'update', '--object', 'projects', '--field', 'status', '--label', 'State', '--json'])
    await run(['crm', 'fields', 'archive', '--object', 'projects', '--field', 'status', '--json'])
    await run(['crm', 'fields', 'restore', '--object', 'projects', '--field', 'status', '--json'])
    await run(['crm', 'fields', 'delete', '--object', 'projects', '--field', 'status', '--json'])
    await run(['crm', 'fields', 'list', '--object', 'projects', '--archived', '1', '--json'])

    expect(body(0)).toEqual({
      label: 'Status',
      type: 'select',
      is_unique: true,
      is_required: false,
      options: [{ label: 'Planned' }, { label: 'Active' }, { label: 'Done' }],
    })
    expect(seen[1]).toMatchObject({ method: 'PUT', path: `${OBJ}/fields/status/options` })
    expect(body(1)).toEqual({ options: [{ value: 'planned', label: 'Planned' }] })
    expect(body(2)).toEqual({ label: 'State' })
    expect(seen.slice(3, 6).map((row) => `${row.method} ${row.path}`)).toEqual([
      `POST ${OBJ}/fields/status/archive`,
      `POST ${OBJ}/fields/status/restore`,
      `DELETE ${OBJ}/fields/status`,
    ])
    expect(seen[6].query.get('archived')).toBe('1')
  })

  it('creates and removes relations', async () => {
    await run([
      'crm', 'relations', 'create', '--object', 'clients', '--target', 'projects', '--kind', 'one_to_many',
      '--source-label', 'Projects', '--target-label', 'Client', '--on-delete', 'restrict', '--json',
    ])
    await run(['crm', 'relations', 'update', '--object', 'clients', '--relation', 'rel_1', '--on-delete', 'cascade', '--json'])
    await run(['crm', 'relations', 'delete', '--object', 'clients', '--relation', 'rel_1', '--json'])
    await run(['crm', 'relations', 'list', '--object', 'clients', '--json'])

    expect(body(0)).toEqual({ target: 'projects', kind: 'one_to_many', source_label: 'Projects', target_label: 'Client', on_delete: 'restrict' })
    expect(body(1)).toEqual({ on_delete: 'cascade' })
    expect(seen[2]).toMatchObject({ method: 'DELETE', path: '/crm/objects/clients/relations/rel_1' })
  })

  it('saves views with the same filter shorthand as the list', async () => {
    await run([
      'crm', 'views', 'create', '--object', 'projects', '--name', 'Big', '--type', 'table', '--filter', 'budget:gt:5000',
      '--sort=-budget', '--columns', 'name,budget', '--json',
    ])
    await run(['crm', 'views', 'update', '--object', 'projects', '--view', 'v1', '--name', 'Bigger', '--json'])
    await run(['crm', 'views', 'delete', '--object', 'projects', '--view', 'v1', '--json'])
    await run(['crm', 'views', 'get', '--object', 'projects', '--view', 'v1', '--json'])
    await run(['crm', 'views', 'list', '--object', 'projects', '--json'])

    expect(body(0)).toEqual({
      name: 'Big',
      type: 'table',
      filter: { operator: 'and', children: [{ field: 'budget', operator: 'gt', value: 5000 }] },
      sorts: [{ field: 'budget', direction: 'desc' }],
      fields: [{ field: 'name', visible: true }, { field: 'budget', visible: true }],
    })
    expect(body(1)).toEqual({ name: 'Bigger' })
    expect(seen[2].method).toBe('DELETE')
  })

  it('manages the trash, favorites, merges and automations', async () => {
    await run(['crm', 'trash', 'list', '--object', 'projects', '--search', 'old', '--json'])
    await run(['crm', 'trash', 'restore', '--object', 'projects', '--ids', 'r1,r2', '--json'])
    await run(['crm', 'trash', 'erase', '--object', 'projects', '--ids', 'r1', '--json'])
    await run(['crm', 'trash', 'erase', '--object', 'projects', '--all', '--json'])
    const empty = await run(['crm', 'trash', 'erase', '--object', 'projects', '--json'])
    await run(['crm', 'trash', 'erase-one', '--object', 'projects', '--record', 'r1', '--json'])

    expect(seen[0].query.get('search')).toBe('old')
    expect(body(1)).toEqual({ ids: ['r1', 'r2'] })
    expect(seen[2]).toMatchObject({ method: 'DELETE', path: `${OBJ}/trash` })
    expect(body(2)).toEqual({ ids: ['r1'] })
    expect(body(3)).toEqual({ all: true })
    expect(empty.code).toBe(1)
    expect(empty.stderr).toContain('Say what to erase')
    expect(seen[4]).toMatchObject({ method: 'DELETE', path: `${OBJ}/trash/r1` })

    seen = []
    await run(['crm', 'favorites', 'add', '--type', 'view', '--object', 'projects', '--ref', 'v1', '--json'])
    await run(['crm', 'favorites', 'remove', '--favorite', 'f1', '--json'])
    await run(['crm', 'favorites', 'list', '--json'])
    await run(['crm', 'favorites', 'reorder', '--data', '{"ids":["f2","f1"]}', '--json'])
    expect(body(0)).toEqual({ type: 'view', object: 'projects', ref: 'v1' })
    expect(seen[1]).toMatchObject({ method: 'DELETE', path: '/crm/favorites/f1' })
    expect(seen[3]).toMatchObject({ method: 'PUT', path: '/crm/favorites/order' })

    seen = []
    await run(['crm', 'merge', 'run', '--object', 'projects', '--survivor', 'a', '--loser', 'b', '--choice', 'budget=loser', '--idempotency-key', 'm1', '--json'])
    await run(['crm', 'merge', 'undo', '--object', 'projects', '--merge', 'mg1', '--json'])
    await run(['crm', 'merge', 'list', '--object', 'projects', '--json'])
    await run(['crm', 'duplicates', 'list', '--object', 'projects', '--json'])
    expect(body(0)).toEqual({ survivor: 'a', loser: 'b', choices: { budget: 'loser' } })
    expect(seen[0].headers['idempotency-key']).toBe('m1')
    expect(seen[1]).toMatchObject({ method: 'POST', path: `${OBJ}/merges/mg1/undo` })

    seen = []
    const bad = await run(['crm', 'merge', 'run', '--object', 'projects', '--survivor', 'a', '--loser', 'b', '--choice', 'budget=nobody', '--json'])
    expect(bad.code).toBe(1)
    expect(seen).toHaveLength(0)

    await run(['crm', 'run-automation', '--object', 'projects', '--automation', '12', '--ids', 'r1,r2', '--idempotency-key', 'a1', '--json'])
    expect(seen[0]).toMatchObject({ method: 'POST', path: `${OBJ}/records/run-automation` })
    expect(body(0)).toEqual({ automation: 12, ids: ['r1', 'r2'] })
  })

  it('reads and replaces the layout and permissions', async () => {
    await run(['crm', 'layout', 'get', '--object', 'projects', '--json'])
    await run(['crm', 'layout', 'update', '--object', 'projects', '--data', '{"tabs":[],"base_version":2}', '--json'])
    await run(['crm', 'layout', 'reset', '--object', 'projects', '--json'])
    await run(['crm', 'permissions', 'get', '--object', 'projects', '--json'])
    await run(['crm', 'permissions', 'update', '--object', 'projects', '--data', '{"roles":{"editor":{"can_delete":false}}}', '--json'])

    expect(seen.map((row) => `${row.method} ${row.path}`)).toEqual([
      `GET ${OBJ}/layout`,
      `PUT ${OBJ}/layout`,
      `DELETE ${OBJ}/layout`,
      `GET ${OBJ}/permissions`,
      `PUT ${OBJ}/permissions`,
    ])
    expect(body(4)).toEqual({ roles: { editor: { can_delete: false } } })
  })

  it('works with dashboards and widgets', async () => {
    await run(['crm', 'dashboards', 'create', '--data', '{"name":"Sales","template":"sales"}', '--json'])
    await run(['crm', 'dashboards', 'duplicate', '--dashboard', 'd1', '--json'])
    await run(['crm', 'dashboards', 'widgets', 'add', '--dashboard', 'd1', '--data', '{"type":"kpi","config":{}}', '--json'])
    await run(['crm', 'dashboards', 'widgets', 'update', '--dashboard', 'd1', '--widget', 'w1', '--data', '{"title":"Won"}', '--json'])
    await run(['crm', 'dashboards', 'widgets', 'remove', '--dashboard', 'd1', '--widget', 'w1', '--json'])
    await run(['crm', 'dashboards', 'widgets', 'preview', '--data', '{"type":"kpi","config":{}}', '--json'])
    await run(['crm', 'dashboards', 'delete', '--dashboard', 'd1', '--json'])

    expect(seen.map((row) => `${row.method} ${row.path}`)).toEqual([
      'POST /crm/dashboards',
      'POST /crm/dashboards/d1/duplicate',
      'POST /crm/dashboards/d1/widgets',
      'PATCH /crm/dashboards/d1/widgets/w1',
      'DELETE /crm/dashboards/d1/widgets/w1',
      'POST /crm/dashboards/preview',
      'DELETE /crm/dashboards/d1',
    ])
  })
})

describe.skipIf(!built)('crm import and export', () => {
  it('uploads a CSV as an import', async () => {
    const file = join(workDir, 'projects.csv')
    writeFileSync(file, 'Name\nAlpha\n')
    const result = await run(['crm', 'import', 'start', '--object', 'projects', '--file', file, '--idempotency-key', 'i1', '--json'])

    expect(result.code).toBe(0)
    expect(seen[0].headers['idempotency-key']).toBe('i1')
    expect(body()).toEqual({ csv: 'Name\nAlpha\n', file_name: 'projects.csv' })
    expect(JSON.parse(result.stdout)).toMatchObject({ data: { id: 'imp_1' } })
  })

  it('maps columns from --map pairs', async () => {
    await run(['crm', 'import', 'map', '--object', 'projects', '--import', 'imp_1', '--map', 'Name=name', '--map', 'Notes=ignore', '--match-field', 'code', '--on-match', 'skip', '--json'])

    expect(seen[0]).toMatchObject({ method: 'PUT', path: `${OBJ}/imports/imp_1` })
    expect(body()).toEqual({ mapping: { Name: 'name', Notes: 'ignore' }, match_field: 'code', on_match: 'skip' })
  })

  it('checks and runs an import and waits until it has stopped', async () => {
    const dry = await run(['crm', 'import', 'dry-run', '--object', 'projects', '--import', 'imp_1', '--json'])
    expect(JSON.parse(dry.stdout)).toMatchObject({ data: { status: 'queued' } })
    expect(seen).toHaveLength(1)

    seen = []
    const result = await run(['crm', 'import', 'run', '--object', 'projects', '--import', 'imp_1', '--wait', '--idempotency-key', 'run-1', '--json'])

    expect(result.code).toBe(0)
    expect(seen[0].headers['idempotency-key']).toBe('run-1')
    expect(JSON.parse(result.stdout)).toMatchObject({ data: { status: 'completed', created: 2 } })
    expect(polls.import).toBe(2)
  })

  it('waits for a rollback to finish', async () => {
    const result = await run(['crm', 'import', 'rollback', '--object', 'projects', '--import', 'imp_1', '--wait', '--json'])

    expect(JSON.parse(result.stdout)).toMatchObject({ data: { rollback: { finished_at: 'later' } } })
  })

  it('lists imports and reads their status and errors', async () => {
    await run(['crm', 'import', 'list', '--object', 'projects', '--json'])
    await run(['crm', 'import', 'status', '--object', 'projects', '--import', 'imp_1', '--json'])

    expect(seen.map((row) => row.path)).toEqual([`${OBJ}/imports`, `${OBJ}/imports/imp_1`])
  })

  it('exports with a list\'s filters, waits and downloads the CSV without sending the token', async () => {
    const output = join(workDir, 'projects-export.csv')
    const result = await run([
      'crm', 'export', 'create', '--object', 'projects', '--filter', 'status:is:active', '--sort=-budget', '--columns', 'name,budget',
      '--output', output, '--idempotency-key', 'e1', '--json',
    ])

    expect(result.code).toBe(0)
    expect(readFileSync(output, 'utf8')).toBe('name\nAlpha\nBeta\n')
    expect(JSON.parse(result.stdout)).toMatchObject({ export_id: 'exp_1', rows: 2 })
    expect(body()).toEqual({
      filter: { operator: 'and', children: [{ field: 'status', operator: 'is', value: 'active' }] },
      sort: '-budget',
      columns: ['name', 'budget'],
    })
    expect(seen[0].headers['idempotency-key']).toBe('e1')

    const download = seen.find((row) => row.path === '/signed/exp_1.csv')
    expect(download?.headers.authorization).toBeUndefined()
  })

  it('only queues the export without --wait or --output', async () => {
    const result = await run(['crm', 'export', 'create', '--object', 'projects', '--records', 'r1,r2', '--json'])

    expect(seen).toHaveLength(1)
    expect(body()).toEqual({ records: ['r1', 'r2'] })
    expect(JSON.parse(result.stdout)).toMatchObject({ data: { id: 'exp_1', status: 'queued' } })
  })

  it('--wait prints the export state with its download link', async () => {
    const result = await run(['crm', 'export', 'create', '--object', 'projects', '--wait', '--json'])

    expect(JSON.parse(result.stdout)).toMatchObject({ data: { status: 'ready', download_url: `${baseUrl}/signed/exp_1.csv?sig=abc` } })
  })

  it('downloads a finished export and keeps an existing file unless --force', async () => {
    const output = join(workDir, 'again.csv')
    polls.export = 5
    const first = await run(['crm', 'export', 'download', '--object', 'projects', '--export', 'exp_1', '--output', output, '--json'])

    expect(first.code).toBe(0)
    expect(readFileSync(output, 'utf8')).toBe('name\nAlpha\nBeta\n')

    const second = await run(['crm', 'export', 'download', '--object', 'projects', '--export', 'exp_1', '--output', output, '--json'])
    expect(second.code).toBe(1)
    expect(second.stderr).toContain('already exists')

    const forced = await run(['crm', 'export', 'download', '--object', 'projects', '--export', 'exp_1', '--output', output, '--force', '--json'])
    expect(forced.code).toBe(0)
  })

  it('refuses to download an export that is not ready', async () => {
    const result = await run(['crm', 'export', 'download', '--object', 'projects', '--export', 'exp_1', '--output', join(workDir, 'early.csv'), '--json'])

    expect(result.code).toBe(1)
    expect(result.stderr).toContain('processing')
  })

  it('reads an export', async () => {
    await run(['crm', 'export', 'get', '--object', 'projects', '--export', 'exp_1', '--json'])

    expect(seen[0].path).toBe(`${OBJ}/exports/exp_1`)
  })

  it('uploads a file for a Files field as multipart', async () => {
    const file = join(workDir, 'brief.txt')
    writeFileSync(file, 'hello brief')
    const result = await run(['crm', 'files', 'upload', '--object', 'projects', '--field', 'attachments', '--file', file, '--json'])

    expect(result.code).toBe(0)
    expect(seen[0].headers['content-type']).toContain('multipart/form-data')
    expect(seen[0].body).toContain('name="file"; filename="brief.txt"')
    expect(seen[0].body).toContain('hello brief')
    expect(JSON.parse(result.stdout)).toMatchObject({ data: { id: 'file_1' } })
  })

  it('downloads a signed file link without a token and checks the url', async () => {
    const output = join(workDir, 'signed.csv')
    const result = await run(['crm', 'files', 'download', '--url', `${baseUrl}/signed/exp_1.csv?sig=abc`, '--output', output, '--json'])

    expect(result.code).toBe(0)
    expect(seen[0].headers.authorization).toBeUndefined()

    const bad = await run(['crm', 'files', 'download', '--url', 'nope', '--output', join(workDir, 'x'), '--json'])
    expect(bad.code).toBe(1)
  })
})

describe.skipIf(!built)('crm schema', () => {
  it('exports the document to a file that can be applied again', async () => {
    const output = join(workDir, 'model.json')
    const result = await run(['crm', 'schema', 'export', '--objects', 'projects,clients', '--output', output, '--json'])

    expect(result.code).toBe(0)
    expect(seen[0].query.get('objects')).toBe('projects,clients')
    expect(JSON.parse(readFileSync(output, 'utf8'))).toEqual({ format: 'formspring.crm.schema', version: 1, objects: [] })

    const again = await run(['crm', 'schema', 'export', '--output', output, '--json'])
    expect(again.code).toBe(1)
    expect(again.stderr).toContain('already exists')
  })

  it('compares a file with plan and with --check without writing', async () => {
    const file = join(workDir, 'doc.json')
    writeFileSync(file, JSON.stringify({ format: 'formspring.crm.schema', version: 1, objects: [] }))

    const plan = await run(['crm', 'schema', 'plan', '--file', file, '--prune', '--json'])
    const check = await run(['crm', 'schema', 'apply', '--file', file, '--check', '--json'])

    expect(plan.code).toBe(0)
    expect(JSON.parse(plan.stdout)).toMatchObject({ data: { summary: { create: 1 } } })
    expect(seen[0].method).toBe('PUT')
    expect(seen[0].query.get('dry_run')).toBe('true')
    expect(seen[0].query.get('prune')).toBe('true')
    expect(seen[1].query.get('dry_run')).toBe('true')
    expect(JSON.parse(check.stdout)).toMatchObject({ data: { summary: { create: 1 } } })
  })

  it('applies a document, unwrapping an exported envelope', async () => {
    const file = join(workDir, 'envelope.json')
    writeFileSync(file, JSON.stringify({ data: { format: 'formspring.crm.schema', version: 1, objects: [] } }))
    const result = await run(['crm', 'schema', 'apply', '--file', file, '--allow-destructive', '--json'])

    expect(JSON.parse(result.stdout)).toMatchObject({ data: { applied: true } })
    expect(body()).toEqual({ format: 'formspring.crm.schema', version: 1, objects: [] })
    expect(seen[0].query.get('allow_destructive')).toBe('true')
    expect(seen[0].query.get('dry_run')).toBeNull()
  })

  it('reads the document from stdin and waits for a background import', async () => {
    const result = await run(['crm', 'schema', 'apply', '--stdin', '--async', '--wait', '--json'], '{"format":"formspring.crm.schema","version":1}')

    expect(result.code).toBe(0)
    expect(seen[0].query.get('async')).toBe('true')
    expect(JSON.parse(result.stdout)).toMatchObject({ data: { status: 'succeeded' } })
    expect(polls.apply).toBe(2)
  })

  it('asks for a document', async () => {
    const result = await run(['crm', 'schema', 'apply', '--json'])

    expect(result.code).toBe(1)
    expect(seen).toHaveLength(0)
    expect(result.stderr).toContain('Give the data model document')
  })

  it('reads the status of a background import', async () => {
    await run(['crm', 'schema', 'status', '--apply', 'apply_1', '--json'])

    expect(seen[0].path).toBe('/crm/schema/applies/apply_1')
  })
})

describe.skipIf(!built)('other crm reads', () => {
  it('reaches the remaining operations by name', async () => {
    await run(['crm', 'field-types', '--json'])
    await run(['crm', 'automations', 'list', '--object', 'projects', '--json'])
    await run(['crm', 'calendar', 'list', '--object', 'projects', '--date-field', 'due', '--from', '2026-12-01', '--to', '2026-12-31', '--json'])
    await run(['crm', 'records', 'timeline', '--object', 'projects', '--record', 'r1', '--json'])
    await run(['crm', 'fields', 'reorder', '--object', 'projects', '--data', '{"keys":["b","a"]}', '--json'])

    expect(seen.map((row) => `${row.method} ${row.path}`)).toEqual([
      'GET /crm/field-types',
      `GET ${OBJ}/automations`,
      `GET ${OBJ}/calendar`,
      `GET ${OBJ}/records/r1/timeline`,
      `PUT ${OBJ}/fields/order`,
    ])
    expect(seen[2].query.get('date_field')).toBe('due')
  })
})
