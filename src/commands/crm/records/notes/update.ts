/* Hand-written: stands in for the generated command of api.crm.records.notes.update (same request, friendlier flags). npm run scaffold-resources keeps this file. */
import { Flags } from '@oclif/core'
import { ResourceCommand, resourceFlags, type ResourceSpec } from '../../../../lib/resource-command.js'

const spec: ResourceSpec = {
  "route": "api.crm.records.notes.update",
  "method": "PATCH",
  "path": "/crm/objects/{object}/records/{record}/notes/{note}",
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

export default class CrmRecordsNotesUpdate extends ResourceCommand {
  static description = "Change the text of a note; only its author can (crm:write)"

  static examples = [
    "<%= config.bin %> crm records notes update --object deals --record REC_ID --note NOTE_ID --body \"Quote accepted\" --json"
  ]

  static spec = spec

  static bodyFlags = {"body":"body"}

  static flags = {
    ...resourceFlags(spec),
    body: Flags.string({ description: 'The new note text' }),
  }

}
