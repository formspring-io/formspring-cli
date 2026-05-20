import { describe, expect, it } from 'vitest'
import { formatApiError } from '../src/lib/errors.js'

describe('formatApiError', () => {
  it('suggests login on 401', () => {
    const error = formatApiError(401, '{"message":"Unauthenticated"}')
    expect(error.hint).toContain('auth login')
  })
})
