import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterAll, describe, expect, it } from 'vitest'
import {
  buildFilter,
  normalizeSort,
  parseCondition,
  parseOptions,
  parseSetPairs,
  pickDefined,
  splitList,
  unwrap,
} from '../src/lib/crm.js'

const dir = mkdtempSync(join(tmpdir(), 'formspring-cli-crm-'))
afterAll(() => rmSync(dir, { recursive: true, force: true }))

describe('parseCondition', () => {
  it('reads field:operator:value', () => {
    expect(parseCondition('status:is:won')).toEqual({ field: 'status', operator: 'is', value: 'won' })
  })

  it('keeps colons in the value', () => {
    expect(parseCondition('due:before:2026-12-01T09:00:00')).toEqual({ field: 'due', operator: 'before', value: '2026-12-01T09:00:00' })
  })

  it('supports linked fields with a dotted key', () => {
    expect(parseCondition('client.region:is:North')).toEqual({ field: 'client.region', operator: 'is', value: 'North' })
  })

  it('turns numeric operators into numbers', () => {
    expect(parseCondition('amount:gte:1000.5')).toEqual({ field: 'amount', operator: 'gte', value: 1000.5 })
    expect(() => parseCondition('amount:gt:lots')).toThrow(/number/)
  })

  it('turns in into a list', () => {
    expect(parseCondition('stage:in:lead, won')).toEqual({ field: 'stage', operator: 'in', value: ['lead', 'won'] })
  })

  it('takes no value for empty-style operators', () => {
    expect(parseCondition('closed_at:empty')).toEqual({ field: 'closed_at', operator: 'empty' })
    expect(parseCondition('due:today')).toEqual({ field: 'due', operator: 'today' })
  })

  it('accepts raw JSON values', () => {
    expect(parseCondition('done:is:json:true')).toEqual({ field: 'done', operator: 'is', value: true })
    expect(parseCondition('due:relative:json:{"direction":"past","amount":7,"unit":"day"}')).toEqual({
      field: 'due',
      operator: 'relative',
      value: { direction: 'past', amount: 7, unit: 'day' },
    })
  })

  it('explains what is wrong', () => {
    expect(() => parseCondition('nonsense')).toThrow(/Could not read the filter/)
    expect(() => parseCondition('status:is')).toThrow(/needs a value/)
  })
})

describe('buildFilter', () => {
  it('returns nothing without filters', () => {
    expect(buildFilter(undefined)).toBeUndefined()
    expect(buildFilter([])).toBeUndefined()
  })

  it('joins conditions with and, or with or for "any"', () => {
    expect(buildFilter(['a:is:1', 'b:is_not:2'])).toEqual({
      operator: 'and',
      children: [
        { field: 'a', operator: 'is', value: '1' },
        { field: 'b', operator: 'is_not', value: '2' },
      ],
    })
    expect(buildFilter(['a:is:1'], 'any')).toMatchObject({ operator: 'or' })
  })

  it('passes a JSON tree through untouched', () => {
    const tree = { operator: 'not', children: [{ field: 'a', operator: 'empty' }] }

    expect(buildFilter([JSON.stringify(tree)])).toEqual(tree)
  })

  it('reads a JSON tree from a file', () => {
    const file = join(dir, 'filter.json')
    writeFileSync(file, '{"field":"a","operator":"is","value":"x"}')

    expect(buildFilter([`@${file}`])).toEqual({ field: 'a', operator: 'is', value: 'x' })
    expect(() => buildFilter([`@${join(dir, 'missing.json')}`])).toThrow(/Could not read/)
  })

  it('rejects invalid JSON', () => {
    expect(() => buildFilter(['{nope'])).toThrow(/Could not parse JSON/)
  })
})

describe('normalizeSort', () => {
  it('joins keys and understands field:desc', () => {
    expect(normalizeSort(['-created_at', 'name'])).toBe('-created_at,name')
    expect(normalizeSort(['amount:desc', 'name:asc'])).toBe('-amount,name')
    expect(normalizeSort(['a,b'])).toBe('a,b')
  })

  it('returns nothing when empty', () => {
    expect(normalizeSort(undefined)).toBeUndefined()
    expect(normalizeSort([' '])).toBeUndefined()
  })
})

describe('parseSetPairs', () => {
  it('sends text for key=value and JSON for key:=value', () => {
    expect(parseSetPairs(['name=Acme = Co', 'amount:=5000', 'tags:=["a","b"]', 'closed_at:=null', 'ok:=true'])).toEqual({
      name: 'Acme = Co',
      amount: 5000,
      tags: ['a', 'b'],
      closed_at: null,
      ok: true,
    })
  })

  it('keeps an empty text value', () => {
    expect(parseSetPairs(['note='])).toEqual({ note: '' })
  })

  it('refuses a pair without a key or with broken JSON', () => {
    expect(() => parseSetPairs(['novalue'])).toThrow(/--set/)
    expect(() => parseSetPairs(['=x'])).toThrow(/--set/)
    expect(() => parseSetPairs(['a:={bad'])).toThrow(/JSON value/)
  })
})

describe('parseOptions', () => {
  it('turns a comma list into labelled options', () => {
    expect(parseOptions('Open, Won,Lost')).toEqual([{ label: 'Open' }, { label: 'Won' }, { label: 'Lost' }])
  })

  it('accepts a JSON array of objects or strings', () => {
    expect(parseOptions('[{"value":"a","label":"A","color":"green"},"B"]')).toEqual([{ value: 'a', label: 'A', color: 'green' }, { label: 'B' }])
  })

  it('reads a file and rejects a non-array', () => {
    const file = join(dir, 'options.json')
    writeFileSync(file, '[{"label":"X"}]')
    expect(parseOptions(`@${file}`)).toEqual([{ label: 'X' }])

    writeFileSync(file, '{"label":"X"}')
    expect(() => parseOptions(`@${file}`)).toThrow(/JSON array/)
  })

  it('returns nothing when the flag is absent', () => {
    expect(parseOptions(undefined)).toBeUndefined()
  })
})

describe('small helpers', () => {
  it('splitList', () => {
    expect(splitList('a, b,,c')).toEqual(['a', 'b', 'c'])
    expect(splitList('')).toBeUndefined()
    expect(splitList(undefined)).toBeUndefined()
  })

  it('unwrap', () => {
    expect(unwrap({ data: { id: 1 } })).toEqual({ id: 1 })
    expect(unwrap({ id: 1 })).toEqual({ id: 1 })
  })

  it('pickDefined keeps only the flags that were given (false included)', () => {
    expect(pickDefined({ a: 1, b: false, c: undefined }, { a: 'x', b: 'y', c: 'z' })).toEqual({ x: 1, y: false })
  })
})
