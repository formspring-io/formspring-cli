/* Hand-written: stands in for the generated command of api.crm.views.update (same request, friendlier flags). npm run scaffold-resources keeps this file. */
import { Flags } from '@oclif/core'
import { ResourceCommand, resourceFlags, type ResourceSpec } from '../../../lib/resource-command.js'
import { buildFilter, normalizeSort, splitList } from '../../../lib/crm.js'

const spec: ResourceSpec = {
  "route": "api.crm.views.update",
  "method": "PATCH",
  "path": "/crm/objects/{object}/views/{view}",
  "pathParams": [
    {
      "name": "object",
      "flag": "object"
    },
    {
      "name": "view",
      "flag": "view"
    }
  ],
  "query": [],
  "hasBody": true,
  "idempotent": false,
  "paginated": false
}

export default class CrmViewsUpdate extends ResourceCommand {
  static description = "Change a view; only what you send is replaced (crm:write)"

  static examples = [
    "<%= config.bin %> crm views update --object projects --view VIEW_ID --name \"Open projects\" --filter status:is:active --json"
  ]

  static spec = spec

  static bodyFlags = {"name":"name","visibility":"visibility","group-by":"group_by"}

  static flags = {
    ...resourceFlags(spec),
    name: Flags.string({ description: 'View name' }),
    visibility: Flags.string({ options: ['workspace', 'private'], description: 'Who can open it' }),
    'group-by': Flags.string({ description: 'Field key to group by (boards)' }),
    columns: Flags.string({ description: 'Comma-separated field keys to show, in order' }),
    filter: Flags.string({
      multiple: true,
      description:
        'Condition field:operator:value (repeat for more, they are ANDed), or a JSON filter tree / @file. Operators: is, is_not, contains, not_contains, in, gt, gte, lt, lte, before, after, relative, empty, not_empty, today, in_past, in_future. Use json: before a value for raw JSON.',
    }),
    'filter-any': Flags.boolean({ description: 'Match records that satisfy any --filter condition (OR) instead of all', default: false }),
    sort: Flags.string({
      multiple: true,
      description: 'Field key, - for descending: --sort=-created_at --sort name. field:desc and field:asc also work',
    }),
  }

  protected async bodyFromFlags(): Promise<unknown> {
    const body = ((await super.bodyFromFlags()) ?? {}) as Record<string, unknown>

    const filter = buildFilter(this.flags.filter as string[] | undefined, this.flags['filter-any'] ? 'any' : 'all')

    if (filter) {
      body.filter = filter
    }

    const sort = normalizeSort(this.flags.sort as string[] | undefined)

    if (sort) {
      body.sorts = sort.split(',').map((key) => (key.startsWith('-') ? { field: key.slice(1), direction: 'desc' } : { field: key, direction: 'asc' }))
    }

    const columns = splitList(this.flags.columns as string | undefined)

    if (columns) {
      body.fields = columns.map((field) => ({ field, visible: true }))
    }

    return Object.keys(body).length === 0 ? undefined : body
  }
}
