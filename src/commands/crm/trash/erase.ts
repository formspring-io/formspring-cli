/* Hand-written: stands in for the generated command of api.crm.trash.purge (same request, friendlier flags). npm run scaffold-resources keeps this file. */
import { Flags } from '@oclif/core'
import { ResourceCommand, resourceFlags, type ResourceSpec } from '../../../lib/resource-command.js'
import { splitList } from '../../../lib/crm.js'
import { CliError } from '../../../lib/errors.js'

const spec: ResourceSpec = {
  "route": "api.crm.trash.purge",
  "method": "DELETE",
  "path": "/crm/objects/{object}/trash",
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

export default class CrmTrashErase extends ResourceCommand {
  static description = "Erase deleted records for good (queued): the ones in --ids (up to 100), or the whole trash of the object with --all. This frees their unique values and cannot be undone (crm:write)"

  static examples = [
    "<%= config.bin %> crm trash erase --object projects --ids id1,id2 --json",
    "<%= config.bin %> crm trash erase --object projects --all --json"
  ]

  static spec = spec

  static flags = {
    ...resourceFlags(spec),
    ids: Flags.string({ description: 'Comma-separated ids of deleted records (up to 100)' }),
    all: Flags.boolean({ description: 'Erase the whole trash of the object', default: false }),
  }

  protected async bodyFromFlags(): Promise<unknown> {
    const body = ((await super.bodyFromFlags()) ?? {}) as Record<string, unknown>

    const ids = splitList(this.flags.ids as string | undefined)

    if (ids) {
      body.ids = ids
    }

    if (this.flags.all) {
      body.all = true
    }

    if (!ids && !this.flags.all && Object.keys(body).length === 0) {
      throw new CliError('Say what to erase: --ids id1,id2 or --all.')
    }

    return Object.keys(body).length === 0 ? undefined : body
  }
}
