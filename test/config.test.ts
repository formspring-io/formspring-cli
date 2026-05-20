import { describe, expect, it } from 'vitest'
import { apiBaseUrl, loadConfig } from '../src/config.js'

describe('config', () => {
  it('builds api base url', () => {
    expect(apiBaseUrl({ baseUrl: 'https://formspring.io' })).toBe(
      'https://formspring.io/api/v1',
    )
  })

  it('loads env defaults', () => {
    const config = loadConfig()
    expect(config.baseUrl).toBeTruthy()
  })
})
