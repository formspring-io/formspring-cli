/* Hand-written: stands in for the generated command of api.crm.records.tasks.update (same request, friendlier flags). npm run scaffold-resources keeps this file. */
import { Flags } from '@oclif/core'
import { ResourceCommand, resourceFlags, type ResourceSpec } from '../../../../lib/resource-command.js'

const spec: ResourceSpec = {
  "route": "api.crm.records.tasks.update",
  "method": "PATCH",
  "path": "/crm/objects/{object}/records/{record}/tasks/{task}",
  "pathParams": [
    {
      "name": "object",
      "flag": "object"
    },
    {
      "name": "record",
      "flag": "record"
    },
    {
      "name": "task",
      "flag": "task"
    }
  ],
  "query": [],
  "hasBody": true,
  "idempotent": false,
  "paginated": false
}

export default class CrmRecordsTasksUpdate extends ResourceCommand {
  static description = "Change a task; only what you send changes (crm:write)"

  static examples = [
    "<%= config.bin %> crm records tasks update --object deals --record REC_ID --task TASK_ID --due 2026-12-02T09:00:00 --json"
  ]

  static spec = spec

  static bodyFlags = {"title":"title","description":"description","due":"due_at","assignee":"assignee_user_id"}

  static flags = {
    ...resourceFlags(spec),
    title: Flags.string({ description: 'Task title' }),
    description: Flags.string({ description: 'Longer description' }),
    due: Flags.string({ description: 'Due time, ISO 8601' }),
    assignee: Flags.integer({ description: 'Member id of the assignee' }),
  }

}
