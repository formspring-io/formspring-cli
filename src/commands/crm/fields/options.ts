/* Hand-written: stands in for the generated command of api.crm.fields.options (same request, friendlier flags). npm run scaffold-resources keeps this file. */
import { Flags } from '@oclif/core'
import { ResourceCommand, resourceFlags, type ResourceSpec } from '../../../lib/resource-command.js'
import { parseOptions } from '../../../lib/crm.js'

const spec: ResourceSpec = {
  "route": "api.crm.fields.options",
  "method": "PUT",
  "path": "/crm/objects/{object}/fields/{field}/options",
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

export default class CrmFieldsOptions extends ResourceCommand {
  static description = "Replace the options of a select or multi-select field. An option with a value keeps its records; one without becomes new (crm:write)"

  static examples = [
    "<%= config.bin %> crm fields options --object projects --field status --options Planned,Active,Done --json",
    "<%= config.bin %> crm fields options --object projects --field status --options @options.json --json"
  ]

  static spec = spec

  static flags = {
    ...resourceFlags(spec),
    options: Flags.string({ description: 'Open,Won,Lost, a JSON array of {value,label,color,default}, or @file.json' }),
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
