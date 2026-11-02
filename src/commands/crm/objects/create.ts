/* Hand-written: stands in for the generated command of api.crm.objects.store (same request, friendlier flags). npm run scaffold-resources keeps this file. */
import { Flags } from '@oclif/core'
import { ResourceCommand, resourceFlags, type ResourceSpec } from '../../../lib/resource-command.js'

const spec: ResourceSpec = {
  "route": "api.crm.objects.store",
  "method": "POST",
  "path": "/crm/objects",
  "pathParams": [],
  "query": [],
  "hasBody": true,
  "idempotent": true,
  "paginated": false
}

export default class CrmObjectsCreate extends ResourceCommand {
  static description = "Create a custom object; its key comes from the plural label unless --key is given (crm:write, Team plan)"

  static examples = [
    "<%= config.bin %> crm objects create --label-singular Project --label-plural Projects --idempotency-key obj-projects --json"
  ]

  static spec = spec

  static bodyFlags = {"label-singular":"label_singular","label-plural":"label_plural","key":"key","description":"description","icon":"icon","color":"color","label-field-key":"label_field_key"}

  static flags = {
    ...resourceFlags(spec),
    'label-singular': Flags.string({ description: 'Singular label, e.g. Project' }),
    'label-plural': Flags.string({ description: 'Plural label, e.g. Projects' }),
    key: Flags.string({ description: 'Object key (default: from the plural label)' }),
    description: Flags.string({ description: 'What the object is for' }),
    icon: Flags.string({ description: 'Icon name' }),
    color: Flags.string({ description: 'Colour' }),
    'label-field-key': Flags.string({ description: 'Key of the field that names a record' }),
  }

}
