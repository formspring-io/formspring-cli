/* Hand-written: stands in for the generated command of api.crm.fields.store (same request, friendlier flags). npm run scaffold-resources keeps this file. */
import { Flags } from '@oclif/core'
import { ResourceCommand, resourceFlags, type ResourceSpec } from '../../../lib/resource-command.js'
import { parseOptions } from '../../../lib/crm.js'

const spec: ResourceSpec = {
  "route": "api.crm.fields.store",
  "method": "POST",
  "path": "/crm/objects/{object}/fields",
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

export default class CrmFieldsCreate extends ResourceCommand {
  static description = "Add a field to an object. Its key and type never change. Select and multi-select fields take --options (crm:write)"

  static examples = [
    "<%= config.bin %> crm fields create --object projects --label Budget --type currency --json",
    "<%= config.bin %> crm fields create --object projects --label Status --type select --options Planned,Active,Done --json",
    "<%= config.bin %> crm fields create --object projects --label Code --type text --unique --required --json"
  ]

  static spec = spec

  static bodyFlags = {"label":"label","type":"type","key":"key","description":"description","icon":"icon","required":"is_required","unique":"is_unique"}

  static flags = {
    ...resourceFlags(spec),
    label: Flags.string({ description: 'Field label' }),
    type: Flags.string({
      description:
        'Field type: text, long_text, rich_text, number, currency, boolean, date, datetime, select, multi_select, rating, file, emails, phones, links, url, full_name, address, uuid, json, array, user',
    }),
    key: Flags.string({ description: 'Field key (default: from the label)' }),
    description: Flags.string({ description: 'Help text' }),
    icon: Flags.string({ description: 'Icon name' }),
    required: Flags.boolean({ allowNo: true, description: 'A value is required' }),
    unique: Flags.boolean({ allowNo: true, description: 'Values must be unique' }),
    options: Flags.string({ description: 'Select options: Open,Won,Lost, a JSON array of {value,label,color,default}, or @file.json' }),
  }

  protected async bodyFromFlags(): Promise<unknown> {
    const body = ((await super.bodyFromFlags()) ?? {}) as Record<string, unknown>

    const options = parseOptions(this.flags.options as string | undefined)

    if (options) {
      body.options = options
    }

    return Object.keys(body).length === 0 ? undefined : body
  }
}
