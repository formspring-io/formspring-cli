/* Hand-written: stands in for the generated command of api.crm.trash.restore (same request, friendlier flags). npm run scaffold-resources keeps this file. */
import { Flags } from '@oclif/core'
import { ResourceCommand, resourceFlags, type ResourceSpec } from '../../../lib/resource-command.js'
import { splitList } from '../../../lib/crm.js'

const spec: ResourceSpec = {
  "route": "api.crm.trash.restore",
  "method": "POST",
  "path": "/crm/objects/{object}/trash/restore",
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

export default class CrmTrashRestore extends ResourceCommand {
  static description = "Bring up to 100 deleted records back with their links; all or none (crm:write)"

  static examples = [
    "<%= config.bin %> crm trash restore --object projects --ids id1,id2 --json"
  ]

  static spec = spec

  static flags = {
    ...resourceFlags(spec),
    ids: Flags.string({ description: 'Comma-separated ids of deleted records (up to 100)' }),
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
