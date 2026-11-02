/* Hand-written: stands in for the generated command of api.crm.records.bulk (same request, friendlier flags). npm run scaffold-resources keeps this file. */
import { Flags } from '@oclif/core'
import { ResourceCommand, resourceFlags, type ResourceSpec } from '../../../lib/resource-command.js'
import { parseSetPairs, splitList } from '../../../lib/crm.js'

const spec: ResourceSpec = {
  "route": "api.crm.records.bulk",
  "method": "POST",
  "path": "/crm/objects/{object}/records/bulk",
  "pathParams": [
    {
      "name": "object",
      "flag": "object"
    }
  ],
  "query": [],
  "hasBody": true,
  "idempotent": false,
  "paginated": false
}

export default class CrmRecordsBulk extends ResourceCommand {
  static description = "Set a field, delete, link or unlink on up to 200 records at once. Each record is its own change; refused ones come back in data.failed (crm:write)"

  static examples = [
    "<%= config.bin %> crm records bulk --object deals --action update --ids id1,id2 --set stage=won --json",
    "<%= config.bin %> crm records bulk --object projects --action link --ids id1,id2 --field client --records CLIENT_ID --json",
    "<%= config.bin %> crm records bulk --object projects --action delete --ids id1,id2 --json"
  ]

  static spec = spec

  static bodyFlags = {"action":"action","field":"field"}

  static flags = {
    ...resourceFlags(spec),
    set: Flags.string({ multiple: true, description: 'Value as field=value, or field:=JSON for numbers, booleans, null, lists (repeatable)' }),
    action: Flags.string({ options: ['update', 'delete', 'link', 'unlink'], description: 'What to do with the records' }),
    ids: Flags.string({ description: 'Comma-separated record ids (up to 200)' }),
    field: Flags.string({ description: 'Relation field key for link and unlink' }),
    records: Flags.string({ description: 'Comma-separated ids of the records to link or unlink' }),
  }

  protected async bodyFromFlags(): Promise<unknown> {
    const body = ((await super.bodyFromFlags()) ?? {}) as Record<string, unknown>

    const ids = splitList(this.flags.ids as string | undefined)
    const records = splitList(this.flags.records as string | undefined)

    if (ids) {
      body.ids = ids
    }

    if (records) {
      body.records = records
    }

    const set = parseSetPairs(this.flags.set as string[] | undefined)

    if (Object.keys(set).length > 0) {
      body.values = { ...((body.values as Record<string, unknown> | undefined) ?? {}), ...set }
    }

    return Object.keys(body).length === 0 ? undefined : body
  }
}
