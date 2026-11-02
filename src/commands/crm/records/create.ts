/* Hand-written: stands in for the generated command of api.crm.records.store (same request, friendlier flags). npm run scaffold-resources keeps this file. */
import { Flags } from '@oclif/core'
import { ResourceCommand, resourceFlags, type ResourceSpec } from '../../../lib/resource-command.js'
import { parseSetPairs } from '../../../lib/crm.js'

const spec: ResourceSpec = {
  "route": "api.crm.records.store",
  "method": "POST",
  "path": "/crm/objects/{object}/records",
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

export default class CrmRecordsCreate extends ResourceCommand {
  static description = "Create a record. Give the values with --set field=value (repeatable) or as JSON in --data (crm:write)"

  static examples = [
    "<%= config.bin %> crm records create --object projects --set name=\"Website relaunch\" --set budget:=12000 --idempotency-key proj-1 --json",
    "<%= config.bin %> crm records create --object deals --data @deal.json --json"
  ]

  static spec = spec

  static flags = {
    ...resourceFlags(spec),
    set: Flags.string({ multiple: true, description: 'Value as field=value, or field:=JSON for numbers, booleans, null, lists (repeatable)' }),

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
