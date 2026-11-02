/* Hand-written: stands in for the generated command of api.crm.merges.store (same request, friendlier flags). npm run scaffold-resources keeps this file. */
import { Flags } from '@oclif/core'
import { ResourceCommand, resourceFlags, type ResourceSpec } from '../../../lib/resource-command.js'
import { CliError } from '../../../lib/errors.js'

const spec: ResourceSpec = {
  "route": "api.crm.merges.store",
  "method": "POST",
  "path": "/crm/objects/{object}/merges",
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

export default class CrmMergeRun extends ResourceCommand {
  static description = "Merge two records: the survivor keeps its values (or those picked per field with --choice) and takes over the other record's links, notes, tasks and history. Queued; undo with crm merge undo (crm:write)"

  static examples = [
    "<%= config.bin %> crm merge run --object projects --survivor REC_A --loser REC_B --choice budget=loser --json"
  ]

  static spec = spec

  static bodyFlags = {"survivor":"survivor","loser":"loser"}

  static flags = {
    ...resourceFlags(spec),
    survivor: Flags.string({ description: 'Id of the record that stays' }),
    loser: Flags.string({ description: 'Id of the record that is merged into the survivor' }),
    choice: Flags.string({ multiple: true, description: 'field=survivor or field=loser: which side keeps that field (repeatable)' }),
  }

  protected async bodyFromFlags(): Promise<unknown> {
    const body = ((await super.bodyFromFlags()) ?? {}) as Record<string, unknown>

    const choices: Record<string, string> = {}

    for (const choice of (this.flags.choice as string[] | undefined) ?? []) {
      const [field, side] = choice.split('=')

      if (!field || (side !== 'survivor' && side !== 'loser')) {
        throw new CliError('--choice must look like field=survivor or field=loser.')
      }

      choices[field] = side
    }

    if (Object.keys(choices).length > 0) {
      body.choices = choices
    }

    return Object.keys(body).length === 0 ? undefined : body
  }
}
