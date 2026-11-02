/* Hand-written: stands in for the generated command of api.crm.records.upsert (same request, friendlier flags). npm run scaffold-resources keeps this file. */
import { Flags } from '@oclif/core'
import { ResourceCommand, resourceFlags, type ResourceSpec } from '../../../lib/resource-command.js'
import { parseSetPairs } from '../../../lib/crm.js'

const spec: ResourceSpec = {
  "route": "api.crm.records.upsert",
  "method": "POST",
  "path": "/crm/objects/{object}/records/upsert",
  "pathParams": [
    {
      "name": "object",
      "flag": "object"
    }
  ],
  "query": [],
  "hasBody": true,
  "idempotent": true,
  "paginated": false
}

export default class CrmRecordsUpsert extends ResourceCommand {
  static description = "Change the record that has this value in a unique field (--match), or create it. Give the values with --set field=value or as JSON in --data (crm:write)"

  static examples = [
    "<%= config.bin %> crm records upsert --object projects --match code --set code=P-100 --set name=\"Website relaunch\" --idempotency-key sync-100 --json"
  ]

  static spec = spec

  static bodyFlags = {"match":"match"}

  static flags = {
    ...resourceFlags(spec),
    set: Flags.string({ multiple: true, description: 'Value as field=value, or field:=JSON for numbers, booleans, null, lists (repeatable)' }),
    match: Flags.string({ description: 'Key of the unique field that identifies the record; its value must be in the values' }),
  }

  protected async bodyFromFlags(): Promise<unknown> {
    const body = ((await super.bodyFromFlags()) ?? {}) as Record<string, unknown>

    const set = parseSetPairs(this.flags.set as string[] | undefined)

    if (Object.keys(set).length > 0) {
      body.values = { ...((body.values as Record<string, unknown> | undefined) ?? {}), ...set }
    }

    return Object.keys(body).length === 0 ? undefined : body
  }
}
