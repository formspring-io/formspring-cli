/* Hand-written: stands in for the generated command of api.crm.objects.update (same request, friendlier flags). npm run scaffold-resources keeps this file. */
import { Flags } from '@oclif/core'
import { ResourceCommand, resourceFlags, type ResourceSpec } from '../../../lib/resource-command.js'

const spec: ResourceSpec = {
  "route": "api.crm.objects.update",
  "method": "PATCH",
  "path": "/crm/objects/{object}",
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

export default class CrmObjectsUpdate extends ResourceCommand {
  static description = "Change labels, description, icon, colour, name field or position of an object, or switch it off with --no-active (crm:write)"

  static examples = [
    "<%= config.bin %> crm objects update --object projects --label-plural \"Client projects\" --json",
    "<%= config.bin %> crm objects update --object projects --no-active --json"
  ]

  static spec = spec

  static bodyFlags = {"label-singular":"label_singular","label-plural":"label_plural","description":"description","icon":"icon","color":"color","label-field-key":"label_field_key","position":"position","active":"is_active"}

  static flags = {
    ...resourceFlags(spec),
    'label-singular': Flags.string({ description: 'Singular label' }),
    'label-plural': Flags.string({ description: 'Plural label' }),
    description: Flags.string({ description: 'What the object is for' }),
    icon: Flags.string({ description: 'Icon name' }),
    color: Flags.string({ description: 'Colour' }),
    'label-field-key': Flags.string({ description: 'Key of the field that names a record' }),
    position: Flags.integer({ description: 'Position in the object list' }),
    active: Flags.boolean({ allowNo: true, description: 'Switch the object on (--active) or off (--no-active)' }),
  }

}
