/* Hand-written: stands in for the generated command of api.crm.records.notes.pin (same request, friendlier flags). npm run scaffold-resources keeps this file. */
import { Flags } from '@oclif/core'
import { ResourceCommand, resourceFlags, type ResourceSpec } from '../../../../lib/resource-command.js'

const spec: ResourceSpec = {
  "route": "api.crm.records.notes.pin",
  "method": "PUT",
  "path": "/crm/objects/{object}/records/{record}/notes/{note}/pin",
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
      "name": "note",
      "flag": "note"
    }
  ],
  "query": [],
  "hasBody": true,
  "idempotent": false,
  "paginated": false
}

export default class CrmRecordsNotesPin extends ResourceCommand {
  static description = "Pin a note to the top of the record, or take it off with --no-pinned (crm:write)"

  static examples = [
    "<%= config.bin %> crm records notes pin --object deals --record REC_ID --note NOTE_ID --json",
    "<%= config.bin %> crm records notes pin --object deals --record REC_ID --note NOTE_ID --no-pinned --json"
  ]

  static spec = spec

  static bodyFlags = {"pinned":"pinned"}

  static flags = {
    ...resourceFlags(spec),
    pinned: Flags.boolean({ allowNo: true, default: true, description: 'Pin the note (--no-pinned unpins it)' }),
  }

}
