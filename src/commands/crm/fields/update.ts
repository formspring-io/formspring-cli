/* Hand-written: stands in for the generated command of api.crm.fields.update (same request, friendlier flags). npm run scaffold-resources keeps this file. */
import { Flags } from '@oclif/core'
import { ResourceCommand, resourceFlags, type ResourceSpec } from '../../../lib/resource-command.js'

const spec: ResourceSpec = {
  "route": "api.crm.fields.update",
  "method": "PATCH",
  "path": "/crm/objects/{object}/fields/{field}",
  "pathParams": [
    {
      "name": "object",
      "flag": "object"
    },
    {
      "name": "field",
      "flag": "field"
    }
  ],
  "query": [],
  "hasBody": true,
  "idempotent": false,
  "paginated": false
}

export default class CrmFieldsUpdate extends ResourceCommand {
  static description = "Change label, description, icon, settings, default, required or unique of a field (crm:write)"

  static examples = [
    "<%= config.bin %> crm fields update --object projects --field budget --label \"Budget (EUR)\" --required --json"
  ]

  static spec = spec

  static bodyFlags = {"label":"label","description":"description","icon":"icon","required":"is_required","unique":"is_unique"}

  static flags = {
    ...resourceFlags(spec),
    label: Flags.string({ description: 'Field label' }),
    description: Flags.string({ description: 'Help text' }),
    icon: Flags.string({ description: 'Icon name' }),
    required: Flags.boolean({ allowNo: true, description: 'A value is required' }),
    unique: Flags.boolean({ allowNo: true, description: 'Values must be unique' }),
  }

}
