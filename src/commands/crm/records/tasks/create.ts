/* Hand-written: stands in for the generated command of api.crm.records.tasks.store (same request, friendlier flags). npm run scaffold-resources keeps this file. */
import { Flags } from '@oclif/core'
import { ResourceCommand, resourceFlags, type ResourceSpec } from '../../../../lib/resource-command.js'

const spec: ResourceSpec = {
  "route": "api.crm.records.tasks.store",
  "method": "POST",
  "path": "/crm/objects/{object}/records/{record}/tasks",
  "pathParams": [
    {
      "name": "object",
      "flag": "object"
    },
    {
      "name": "record",
      "flag": "record"
    }
  ],
  "query": [],
  "hasBody": true,
  "idempotent": true,
  "paginated": false
}

export default class CrmRecordsTasksCreate extends ResourceCommand {
  static description = "Add a task about a record; it also shows in the workspace task list (crm:write)"

  static examples = [
    "<%= config.bin %> crm records tasks create --object deals --record REC_ID --title \"Call back\" --due 2026-12-01T09:00:00 --json"
  ]

  static spec = spec

  static bodyFlags = {"title":"title","description":"description","due":"due_at","assignee":"assignee_user_id"}

  static flags = {
    ...resourceFlags(spec),
    title: Flags.string({ description: 'Task title' }),
    description: Flags.string({ description: 'Longer description' }),
    due: Flags.string({ description: 'Due time, ISO 8601 (workspace time zone unless it carries an offset)' }),
    assignee: Flags.integer({ description: 'Member id of the assignee (default: you)' }),
  }

}
