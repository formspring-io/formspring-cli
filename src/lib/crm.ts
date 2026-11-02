import { readFileSync } from 'node:fs'
import { CliError } from './errors.js'

/** Operators that take no value. */
const VALUELESS_OPERATORS = new Set(['empty', 'not_empty', 'today', 'in_past', 'in_future'])
/** Operators whose value is a number. */
const NUMERIC_OPERATORS = new Set(['gt', 'gte', 'lt', 'lte'])
/** Operators whose value is a list. */
const LIST_OPERATORS = new Set(['in', 'not_in'])

export type FilterCondition = { field: string; operator: string; value?: unknown }
export type FilterGroup = { operator: 'and' | 'or' | 'not'; children: Array<FilterGroup | FilterCondition> }

/**
 * One `field:operator:value` condition.
 *
 *   status:is:won              amount:gte:1000        stage:in:lead,won
 *   closed_at:empty            client.region:is:North  due:relative:last_month
 *   done:is:json:true          (prefix the value with json: to send raw JSON)
 */
export function parseCondition(input: string): FilterCondition {
  const first = input.indexOf(':')

  if (first <= 0) {
    throw new CliError(
      `Could not read the filter "${input}".`,
      1,
      'Use field:operator:value, for example status:is:won, amount:gte:1000 or closed_at:empty. Pass a JSON tree for anything else.',
    )
  }

  const field = input.slice(0, first).trim()
  const rest = input.slice(first + 1)
  const second = rest.indexOf(':')
  const operator = (second === -1 ? rest : rest.slice(0, second)).trim()
  const raw = second === -1 ? undefined : rest.slice(second + 1)

  if (!operator) {
    throw new CliError(`The filter "${input}" has no operator.`, 1, 'Use field:operator:value, for example status:is:won.')
  }

  if (VALUELESS_OPERATORS.has(operator)) {
    return { field, operator }
  }

  if (raw === undefined) {
    throw new CliError(`The filter "${input}" needs a value.`, 1, `Use ${field}:${operator}:VALUE.`)
  }

  if (raw.startsWith('json:')) {
    try {
      return { field, operator, value: JSON.parse(raw.slice(5)) as unknown }
    } catch (error) {
      throw new CliError(`The JSON value in the filter "${input}" is not valid: ${(error as Error).message}`)
    }
  }

  if (LIST_OPERATORS.has(operator)) {
    return { field, operator, value: raw.split(',').map((part) => part.trim()).filter(Boolean) }
  }

  if (NUMERIC_OPERATORS.has(operator)) {
    const number = Number(raw)

    if (raw.trim() === '' || Number.isNaN(number)) {
      throw new CliError(`The filter "${input}" needs a number after "${operator}".`)
    }

    return { field, operator, value: number }
  }

  return { field, operator, value: raw }
}

/**
 * Turns the `--filter` flag values into the filter tree the API takes.
 *
 * One value that starts with `{`, or `@file`, is a JSON tree and is used as is.
 * Anything else is a list of `field:operator:value` conditions joined with `and`
 * (`or` when `match` is `any`).
 */
export function buildFilter(values: string[] | undefined, match: 'all' | 'any' = 'all'): FilterGroup | FilterCondition | undefined {
  if (!values || values.length === 0) {
    return undefined
  }

  const first = values[0].trim()

  if (values.length === 1 && (first.startsWith('{') || first.startsWith('@'))) {
    return readJsonOperand(first, '--filter') as FilterGroup | FilterCondition
  }

  return { operator: match === 'any' ? 'or' : 'and', children: values.map(parseCondition) }
}

/** Reads inline JSON or `@path` to a JSON file. */
export function readJsonOperand(value: string, label: string): unknown {
  let raw = value

  if (value.startsWith('@')) {
    try {
      raw = readFileSync(value.slice(1), 'utf8')
    } catch (error) {
      throw new CliError(`Could not read ${label} from ${value.slice(1)}: ${(error as Error).message}`)
    }
  }

  try {
    return JSON.parse(raw) as unknown
  } catch (error) {
    throw new CliError(`Could not parse JSON for ${label}: ${(error as Error).message}`, 1, `Example: ${label} '{"operator":"and","children":[]}' or ${label} @file.json`)
  }
}

/** `name:desc`, `name:asc` and `-name` all work; the API takes `-name`. */
export function normalizeSort(values: string[] | undefined): string | undefined {
  if (!values || values.length === 0) {
    return undefined
  }

  const keys = values
    .flatMap((value) => value.split(','))
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const match = /^(.+):(asc|desc)$/i.exec(part)

      if (!match) {
        return part
      }

      return match[2].toLowerCase() === 'desc' ? `-${match[1]}` : match[1]
    })

  return keys.length === 0 ? undefined : keys.join(',')
}

/** Splits `a,b, c` into `['a','b','c']`. */
export function splitList(value: string | undefined): string[] | undefined {
  if (value === undefined) {
    return undefined
  }

  const parts = value.split(',').map((part) => part.trim()).filter(Boolean)

  return parts.length === 0 ? undefined : parts
}

/**
 * `--set key=value` pairs for record values. `key=text` sends a string,
 * `key:=JSON` sends raw JSON (numbers, booleans, null, lists, objects):
 *
 *   --set name=Acme --set amount:=5000 --set 'tags:=["a","b"]' --set closed_at:=null
 */
export function parseSetPairs(pairs: string[] | undefined): Record<string, unknown> {
  const values: Record<string, unknown> = {}

  for (const pair of pairs ?? []) {
    const json = /^([^=:\s][^=]*?):=([\s\S]*)$/.exec(pair)

    if (json) {
      try {
        values[json[1]] = JSON.parse(json[2]) as unknown
      } catch (error) {
        throw new CliError(`The JSON value of --set ${json[1]} is not valid: ${(error as Error).message}`)
      }

      continue
    }

    const index = pair.indexOf('=')

    if (index <= 0) {
      throw new CliError(`Could not read --set "${pair}".`, 1, 'Use --set key=value, or --set key:=JSON for numbers, booleans, lists and null.')
    }

    values[pair.slice(0, index)] = pair.slice(index + 1)
  }

  return values
}

/** Select options from `--options`: `Open,Won,Lost`, a JSON array, or `@file.json`. */
export function parseOptions(value: string | undefined): Array<Record<string, unknown>> | undefined {
  if (value === undefined) {
    return undefined
  }

  const trimmed = value.trim()

  if (trimmed.startsWith('[') || trimmed.startsWith('@')) {
    const parsed = readJsonOperand(trimmed, '--options')

    if (!Array.isArray(parsed)) {
      throw new CliError('--options must be a JSON array.', 1, 'Example: --options \'[{"label":"Open","color":"green"}]\' or --options Open,Won,Lost')
    }

    return parsed.map((option) => (typeof option === 'string' ? { label: option } : (option as Record<string, unknown>)))
  }

  return trimmed
    .split(',')
    .map((label) => label.trim())
    .filter(Boolean)
    .map((label) => ({ label }))
}

/** The record or object inside a `{ data: ... }` envelope. */
export function unwrap<T = Record<string, unknown>>(response: unknown): T {
  if (response && typeof response === 'object' && 'data' in response) {
    return (response as { data: T }).data
  }

  return response as T
}

/** Keep only the flags that were given, renamed to the body keys. */
export function pickDefined(flags: Record<string, unknown>, mapping: Record<string, string>): Record<string, unknown> {
  const body: Record<string, unknown> = {}

  for (const [flag, key] of Object.entries(mapping)) {
    if (flags[flag] !== undefined) {
      body[key] = flags[flag]
    }
  }

  return body
}
