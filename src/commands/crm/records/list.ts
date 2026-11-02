/* Hand-written: stands in for the generated command of api.crm.records.index (same request, friendlier flags). npm run scaffold-resources keeps this file. */
import { Flags } from '@oclif/core'
import { ResourceCommand, resourceFlags, type ResourceSpec, withoutFlags } from '../../../lib/resource-command.js'
import { buildFilter, normalizeSort } from '../../../lib/crm.js'
import type { QueryValue } from '../../../lib/rest.js'

const spec: ResourceSpec = {
  "route": "api.crm.records.index",
  "method": "GET",
  "path": "/crm/objects/{object}/records",
  "pathParams": [
    {
      "name": "object",
      "flag": "object"
    }
  ],
  "query": [
    {
      "name": "filter",
      "flag": "filter",
      "type": "string",
      "description": "The filter tree as JSON or nested query parameters: a group {operator: and|or|not, children: [...]} or a condition {field, sub_field?, operator, value?}. A field of a linked record is named with a dotted key, one hop deep (client.industry): it matches records linked to at least one record where the condition holds, with the operators of the linked field. Operators per field type: see GET /crm/f..."
    },
    {
      "name": "sort",
      "flag": "sort",
      "type": "string",
      "description": "Comma-separated field keys, \"-\" for descending: -created_at,name. Records without a value come last. Up to 5 fields. A field that links to at most one record (\"sortable\" is true for it) sorts by the label of the linked record. A field whose \"sortable\" is false (for example a contact's email and phone, which are stored encrypted) is refused with a 422 on sorts.N.field"
    },
    {
      "name": "search",
      "flag": "search",
      "type": "string",
      "description": "Text search over the record"
    },
    {
      "name": "group_by",
      "flag": "group-by",
      "type": "string",
      "description": "Group by a select, boolean, member, date or single-valued relation field; meta.groups carries each group's value, count and totals"
    },
    {
      "name": "group_bucket",
      "flag": "group-bucket",
      "type": "string",
      "description": "Bucket for a date group: day, week, month, year"
    },
    {
      "name": "aggregate",
      "flag": "aggregate",
      "type": "string",
      "description": "Totals over every matching record: count, field:op (op: sum, avg, min, max, count_empty, count_not_empty, percent_empty, count_unique, and total_links on attached_notes, attached_tasks and attached_files), comma-separated"
    },
    {
      "name": "per_page",
      "flag": "per-page",
      "type": "string",
      "description": "Page size, 1 to 100"
    },
    {
      "name": "cursor",
      "flag": "cursor",
      "type": "string",
      "description": "Opaque cursor from meta.next_cursor / meta.prev_cursor"
    },
    {
      "name": "with_total",
      "flag": "with-total",
      "type": "string",
      "description": "false skips the total count"
    },
    {
      "name": "include",
      "flag": "include",
      "type": "string",
      "description": "Relation field keys to load, one level deep, under `relations`"
    },
    {
      "name": "fields",
      "flag": "fields",
      "type": "string",
      "description": "Field keys to return in `values`"
    },
    {
      "name": "view",
      "flag": "view",
      "type": "string",
      "description": "A saved view to start from; the other parameters replace the matching part of it"
    },
    {
      "name": "timezone",
      "flag": "timezone",
      "type": "string",
      "description": "IANA timezone in which dates are read (default UTC)"
    }
  ],
  "hasBody": false,
  "idempotent": false,
  "paginated": true
}

export default class CrmRecordsList extends ResourceCommand {
  static description = "List records of an object with filters, sort, search, grouping, totals and cursor pagination; --all returns every page (crm:read)"

  static examples = [
    "<%= config.bin %> crm records list --object deals --filter stage:is:won --filter amount:gte:1000 --sort=-amount --limit 50 --json",
    "<%= config.bin %> crm records list --object projects --view VIEW_ID --fields name,budget --include client --all --json",
    "<%= config.bin %> crm records list --object projects --group-by status --aggregate count,budget:sum --json",
    "<%= config.bin %> crm records list --object projects --filter '{\"operator\":\"or\",\"children\":[{\"field\":\"status\",\"operator\":\"is\",\"value\":\"active\"}]}' --json"
  ]

  static spec = spec

  static flags = {
    ...withoutFlags(resourceFlags(spec), ["filter","sort","per-page"]),
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
    limit: Flags.integer({ description: 'Records per page, 1 to 100', min: 1, max: 100, aliases: ['per-page'] }),
  }

  protected async queryFromFlags(): Promise<Record<string, QueryValue>> {
    const query = await super.queryFromFlags()
    const filter = buildFilter(this.flags.filter as string[] | undefined, this.flags['filter-any'] ? 'any' : 'all')

    if (filter) {
      query.filter = JSON.stringify(filter)
    }

    const sort = normalizeSort(this.flags.sort as string[] | undefined)

    if (sort) {
      query.sort = sort
    }

    if (this.flags.limit !== undefined) {
      query.per_page = this.flags.limit as number
    }

    return query
  }
}
