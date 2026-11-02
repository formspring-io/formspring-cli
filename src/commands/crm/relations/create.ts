/* Hand-written: stands in for the generated command of api.crm.relations.store (same request, friendlier flags). npm run scaffold-resources keeps this file. */
import { Flags } from '@oclif/core'
import { ResourceCommand, resourceFlags, type ResourceSpec } from '../../../lib/resource-command.js'

const spec: ResourceSpec = {
  "route": "api.crm.relations.store",
  "method": "POST",
  "path": "/crm/objects/{object}/relations",
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

export default class CrmRelationsCreate extends ResourceCommand {
  static description = "Relate this object to another (or itself): a field is added on each side (crm:write)"

  static examples = [
    "<%= config.bin %> crm relations create --object clients --target projects --kind one_to_many --source-label Projects --target-label Client --json"
  ]

  static spec = spec

  static bodyFlags = {"target":"target","kind":"kind","source-label":"source_label","target-label":"target_label","source-key":"source_key","target-key":"target_key","on-delete":"on_delete"}

  static flags = {
    ...resourceFlags(spec),
    target: Flags.string({ description: 'Key of the object on the other side' }),
    kind: Flags.string({ options: ['one_to_many', 'many_to_one', 'many_to_many'], description: 'Cardinality seen from this object' }),
    'source-label': Flags.string({ description: 'Label of the field added on this object' }),
    'target-label': Flags.string({ description: 'Label of the field added on the other object' }),
    'source-key': Flags.string({ description: 'Key of the field on this object (default: from the label)' }),
    'target-key': Flags.string({ description: 'Key of the field on the other object' }),
    'on-delete': Flags.string({ options: ['set_null', 'cascade', 'restrict'], description: 'What deleting the "one" side does to the "many" side' }),
  }

}
