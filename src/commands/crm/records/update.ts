/* Hand-written: stands in for the generated command of api.crm.records.update (same request, friendlier flags). npm run scaffold-resources keeps this file. */
import { Flags } from '@oclif/core'
import { ResourceCommand, resourceFlags, type ResourceSpec } from '../../../lib/resource-command.js'
import { parseSetPairs } from '../../../lib/crm.js'

const spec: ResourceSpec = {
  "route": "api.crm.records.update",
  "method": "PATCH",
  "path": "/crm/objects/{object}/records/{record}",
  "pathParams": [
    {
      "name": "object",
      "flag": "object"
    },
    {
      "name": "record",
      "flag": "record"
    }
  ],
  "query": [],
  "hasBody": true,
  "idempotent": false,
  "paginated": false
}

export default class CrmRecordsUpdate extends ResourceCommand {
  static description = "Change a record; only the values you send change, null clears one. Use --set field=value (repeatable) or JSON in --data (crm:write)"

  static examples = [
    "<%= config.bin %> crm records update --object projects --record REC_ID --set status=active --set budget:=15000 --json",
    "<%= config.bin %> crm records update --object projects --record REC_ID --set notes:=null --json"
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
