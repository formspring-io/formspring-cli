/* Hand-written: stands in for the generated command of api.crm.relations.update (same request, friendlier flags). npm run scaffold-resources keeps this file. */
import { Flags } from '@oclif/core'
import { ResourceCommand, resourceFlags, type ResourceSpec } from '../../../lib/resource-command.js'

const spec: ResourceSpec = {
  "route": "api.crm.relations.update",
  "method": "PATCH",
  "path": "/crm/objects/{object}/relations/{relation}",
  "pathParams": [
    {
      "name": "object",
      "flag": "object"
    },
    {
      "name": "relation",
      "flag": "relation"
    }
  ],
  "query": [],
  "hasBody": true,
  "idempotent": false,
  "paginated": false
}

export default class CrmRelationsUpdate extends ResourceCommand {
  static description = "Choose what deleting the \"one\" side does to the \"many\" side (crm:write)"

  static examples = [
    "<%= config.bin %> crm relations update --object clients --relation REL_ID --on-delete restrict --json"
  ]

  static spec = spec

  static bodyFlags = {"on-delete":"on_delete"}

  static flags = {
    ...resourceFlags(spec),
    'on-delete': Flags.string({ options: ['set_null', 'cascade', 'restrict'], description: 'What deleting the "one" side does to the "many" side' }),
  }

}
