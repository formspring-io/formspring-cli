/* Hand-written: stands in for the generated command of api.crm.favorites.store (same request, friendlier flags). npm run scaffold-resources keeps this file. */
import { Flags } from '@oclif/core'
import { ResourceCommand, resourceFlags, type ResourceSpec } from '../../../lib/resource-command.js'

const spec: ResourceSpec = {
  "route": "api.crm.favorites.store",
  "method": "POST",
  "path": "/crm/favorites",
  "pathParams": [],
  "query": [],
  "hasBody": true,
  "idempotent": true,
  "paginated": false
}

export default class CrmFavoritesAdd extends ResourceCommand {
  static description = "Star an object, a saved view or a record; it goes to the end of your list (crm:write)"

  static examples = [
    "<%= config.bin %> crm favorites add --type object --object projects --json",
    "<%= config.bin %> crm favorites add --type view --object projects --ref VIEW_ID --json"
  ]

  static spec = spec

  static bodyFlags = {"type":"type","object":"object","ref":"ref"}

  static flags = {
    ...resourceFlags(spec),
    type: Flags.string({ options: ['object', 'view', 'record'], description: 'What to star' }),
    object: Flags.string({ description: 'Object key' }),
    ref: Flags.string({ description: 'View or record id (not needed for an object)' }),
  }

}
