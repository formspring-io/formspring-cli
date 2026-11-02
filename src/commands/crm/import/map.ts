/* Hand-written: stands in for the generated command of api.crm.imports.update (same request, friendlier flags). npm run scaffold-resources keeps this file. */
import { Flags } from '@oclif/core'
import { ResourceCommand, resourceFlags, type ResourceSpec } from '../../../lib/resource-command.js'
import { CliError } from '../../../lib/errors.js'

const spec: ResourceSpec = {
  "route": "api.crm.imports.update",
  "method": "PUT",
  "path": "/crm/objects/{object}/imports/{import}",
  "pathParams": [
    {
      "name": "object",
      "flag": "object"
    },
    {
      "name": "import",
      "flag": "import"
    }
  ],
  "query": [],
  "hasBody": true,
  "idempotent": false,
  "paginated": false
}

export default class CrmImportMap extends ResourceCommand {
  static description = "Map each CSV column to a field (or ignore it) and say which unique field matches rows to existing records (crm:write)"

  static examples = [
    "<%= config.bin %> crm import map --object projects --import IMPORT_ID --map Name=name --map Budget=budget --map Notes=ignore --match-field code --on-match update --json"
  ]

  static spec = spec

  static bodyFlags = {"match-field":"match_field","on-match":"on_match"}

  static flags = {
    ...resourceFlags(spec),
    map: Flags.string({ multiple: true, description: 'Column=field (or Column=ignore); repeatable. Columns not named keep the suggested mapping when you use --data' }),
    'match-field': Flags.string({ description: 'Key of a unique field that is mapped; rows are matched to records on it' }),
    'on-match': Flags.string({ options: ['update', 'skip'], description: 'What to do with a row that matches a record' }),
  }

  protected async bodyFromFlags(): Promise<unknown> {
    const body = ((await super.bodyFromFlags()) ?? {}) as Record<string, unknown>

    const pairs = (this.flags.map as string[] | undefined) ?? []

    if (pairs.length > 0) {
      const mapping: Record<string, string> = { ...((body.mapping as Record<string, string> | undefined) ?? {}) }

      for (const pair of pairs) {
        const index = pair.lastIndexOf('=')

        if (index <= 0) {
          throw new CliError('--map must look like Column=field or Column=ignore.')
        }

        mapping[pair.slice(0, index)] = pair.slice(index + 1)
      }

      body.mapping = mapping
    }

    return Object.keys(body).length === 0 ? undefined : body
  }
}
