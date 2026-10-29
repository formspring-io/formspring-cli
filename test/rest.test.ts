import { createServer, type IncomingMessage, type Server } from 'node:http'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import type { AddressInfo } from 'node:net'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import type { CliConfig } from '../src/config.js'
import { CliError, formatApiError } from '../src/lib/errors.js'
import { restDownload, restPaginate, restRequest } from '../src/lib/rest.js'

type Seen = { method: string; url: string; headers: IncomingMessage['headers']; body: string }

let server: Server
let config: CliConfig
let workDir: string
const seen: Seen[] = []
const binary = Buffer.from([0x25, 0x50, 0x44, 0x46, 0x00, 0xff, 0xfe, 0x0a, 0x80])

beforeAll(async () => {
  workDir = mkdtempSync(join(tmpdir(), 'formspring-cli-rest-'))
  server = createServer((request, response) => {
    const chunks: Buffer[] = []
    request.on('data', (chunk: Buffer) => chunks.push(chunk))
    request.on('end', () => {
      seen.push({
        method: request.method ?? '',
        url: request.url ?? '',
        headers: request.headers,
        body: Buffer.concat(chunks).toString('utf8'),
      })

      const url = new URL(request.url ?? '/', 'http://localhost')

      if (url.pathname === '/api/v1/items') {
        const cursor = url.searchParams.get('cursor')
        response.setHeader('content-type', 'application/json')

        if (url.searchParams.get('endless')) {
          response.end(JSON.stringify({ data: [1], meta: { next_cursor: 'again', total: 99 } }))
        } else if (!cursor) {
          response.end(JSON.stringify({ data: [1, 2], meta: { next_cursor: 'c2', total: 3 } }))
        } else {
          response.end(JSON.stringify({ data: [3], meta: { next_cursor: null, total: 3 } }))
        }

        return
      }

      if (url.pathname === '/api/v1/file.pdf') {
        response.setHeader('content-type', 'application/pdf')
        response.end(binary)

        return
      }

      if (url.pathname === '/api/v1/missing') {
        response.statusCode = 404
        response.setHeader('content-type', 'application/json')
        response.setHeader('x-request-id', 'req_header')
        response.end(JSON.stringify({ message: 'Not found', error: { code: 'not_found', message: 'Not found', request_id: 'req_body', retryable: false } }))

        return
      }

      response.statusCode = 201
      response.setHeader('content-type', 'application/json')
      response.end(JSON.stringify({ ok: true }))
    })
  })

  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
  config = { baseUrl: `http://127.0.0.1:${(server.address() as AddressInfo).port}`, token: 'test-token' }
})

afterAll(async () => {
  await new Promise((resolve) => server.close(resolve))
  rmSync(workDir, { recursive: true, force: true })
})

describe('restRequest', () => {
  it('sends the bearer token, the JSON body and the Idempotency-Key header', async () => {
    seen.length = 0
    await restRequest({ config, method: 'POST', path: '/contacts', body: { email: 'a@b.c' }, idempotencyKey: 'key-1' })

    expect(seen[0].headers.authorization).toBe('Bearer test-token')
    expect(seen[0].headers['idempotency-key']).toBe('key-1')
    expect(seen[0].body).toBe('{"email":"a@b.c"}')
  })

  it('omits the Idempotency-Key header when none is given', async () => {
    seen.length = 0
    await restRequest({ config, method: 'POST', path: '/contacts', body: {} })

    expect(seen[0].headers['idempotency-key']).toBeUndefined()
  })

  it('sends nothing in dry-run mode', async () => {
    seen.length = 0
    const result = await restRequest({ config: { ...config, dryRun: true }, method: 'POST', path: '/contacts', body: {}, idempotencyKey: 'k' })

    expect(result).toBeUndefined()
    expect(seen).toHaveLength(0)
  })

  it('reports the request id from the error envelope', async () => {
    await expect(restRequest({ config, method: 'GET', path: '/missing' })).rejects.toMatchObject({
      message: 'API error (404): Not found',
      details: { status: 404, code: 'not_found', requestId: 'req_body', retryable: false },
    })
  })
})

describe('formatApiError', () => {
  it('falls back to the X-Request-Id header and explains idempotency conflicts', () => {
    const error = formatApiError(
      409,
      JSON.stringify({ message: 'Conflict', error: { code: 'idempotency_key_reused', message: 'Conflict', retryable: false } }),
      { get: (name) => (name === 'x-request-id' ? 'req_h' : null) },
    )

    expect(error).toBeInstanceOf(CliError)
    expect(error.details.requestId).toBe('req_h')
    expect(error.hint).toContain('new key')
  })

  it('marks retryable errors', () => {
    const error = formatApiError(429, JSON.stringify({ error: { code: 'rate_limited', message: 'Slow down', request_id: 'r', retryable: true } }))

    expect(error.message).toBe('API error (429): Slow down')
    expect(error.hint).toContain('retryable')
  })
})

describe('restPaginate', () => {
  it('follows next_cursor and merges every page', async () => {
    seen.length = 0
    const result = (await restPaginate({ config, method: 'GET', path: '/items', query: { page: 1 } })) as {
      data: number[]
      meta: Record<string, unknown>
    }

    expect(result.data).toEqual([1, 2, 3])
    expect(result.meta).toMatchObject({ total: 3, pages: 2, next_cursor: null, truncated: false })
    expect(seen).toHaveLength(2)
    expect(seen[1].url).toContain('cursor=c2')
    expect(seen[1].url).not.toContain('page=')
  })

  it('stops at max pages and flags the result as truncated', async () => {
    const result = (await restPaginate({ config, method: 'GET', path: '/items', query: { endless: 1 }, maxPages: 3 })) as {
      data: number[]
      meta: Record<string, unknown>
    }

    expect(result.data).toEqual([1, 1, 1])
    expect(result.meta).toMatchObject({ pages: 3, truncated: true })
  })
})

describe('restDownload', () => {
  it('streams a binary response to disk byte for byte', async () => {
    const output = join(workDir, 'file.pdf')
    const result = await restDownload({ config, path: '/file.pdf', output })

    expect(result).toMatchObject({ path: output, bytes: binary.length, content_type: 'application/pdf' })
    expect(readFileSync(output).equals(binary)).toBe(true)
  })

  it('refuses to overwrite an existing file without force', async () => {
    const output = join(workDir, 'existing.pdf')
    writeFileSync(output, 'keep me')

    await expect(restDownload({ config, path: '/file.pdf', output })).rejects.toThrow('already exists')
    expect(readFileSync(output, 'utf8')).toBe('keep me')

    await restDownload({ config, path: '/file.pdf', output, force: true })
    expect(readFileSync(output).equals(binary)).toBe(true)
  })

  it('does not write the file when the server returns an error', async () => {
    const output = join(workDir, 'never.pdf')

    await expect(restDownload({ config, path: '/missing', output })).rejects.toMatchObject({ details: { status: 404 } })
    expect(() => readFileSync(output)).toThrow()
  })
})
