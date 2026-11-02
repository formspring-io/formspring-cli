/* Hand-written: stands in for the generated command of api.crm.records.run-automation (same request, friendlier flags). npm run scaffold-resources keeps this file. */
import { Flags } from '@oclif/core'
import { ResourceCommand, resourceFlags, type ResourceSpec } from '../../lib/resource-command.js'
import { splitList } from '../../lib/crm.js'

const spec: ResourceSpec = {
  "route": "api.crm.records.run-automation",
  "method": "POST",
  "path": "/crm/objects/{object}/records/run-automation",
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

export default class CrmRunAutomation extends ResourceCommand {
  static description = "Run a workspace automation on up to 100 records, one run per record you may read. The token also needs automations:run (crm:read)"

  static examples = [
    "<%= config.bin %> crm automations list --object deals --json",
    "<%= config.bin %> crm run-automation --object deals --automation 12 --ids id1,id2 --json"
  ]

  static spec = spec

  static bodyFlags = {"automation":"automation"}

  static flags = {
    ...resourceFlags(spec),
    automation: Flags.integer({ description: 'Automation id from crm automations list' }),
    ids: Flags.string({ description: 'Comma-separated record ids (up to 100)' }),
  }

  protected async bodyFromFlags(): Promise<unknown> {
    const body = ((await super.bodyFromFlags()) ?? {}) as Record<string, unknown>

    const ids = splitList(this.flags.ids as string | undefined)

    if (ids) {
      body.ids = ids
    }

    return Object.keys(body).length === 0 ? undefined : body
  }
}
