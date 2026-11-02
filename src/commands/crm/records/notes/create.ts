/* Hand-written: stands in for the generated command of api.crm.records.notes.store (same request, friendlier flags). npm run scaffold-resources keeps this file. */
import { Flags } from '@oclif/core'
import { ResourceCommand, resourceFlags, type ResourceSpec } from '../../../../lib/resource-command.js'

const spec: ResourceSpec = {
  "route": "api.crm.records.notes.store",
  "method": "POST",
  "path": "/crm/objects/{object}/records/{record}/notes",
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

export default class CrmRecordsNotesCreate extends ResourceCommand {
  static description = "Write a note on a record; the body is rich text and is cleaned before it is stored (crm:write)"

  static examples = [
    "<%= config.bin %> crm records notes create --object deals --record REC_ID --body \"Sent the quote\" --json"
  ]

  static spec = spec

  static bodyFlags = {"body":"body"}

  static flags = {
    ...resourceFlags(spec),
    body: Flags.string({ description: 'The note text (HTML is cleaned)' }),
  }

}
