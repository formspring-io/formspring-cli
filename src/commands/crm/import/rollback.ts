/* Hand-written: stands in for the generated command of api.crm.imports.rollback (same request, friendlier flags). npm run scaffold-resources keeps this file. */
import { Flags } from '@oclif/core'
import { ResourceCommand, resourceFlags, type ResourceSpec } from '../../../lib/resource-command.js'
import type { CliConfig } from '../../../config.js'
import { waitForImport } from '../../../lib/crm-wait.js'

const spec: ResourceSpec = {
  "route": "api.crm.imports.rollback",
  "method": "POST",
  "path": "/crm/objects/{object}/imports/{import}/rollback",
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
  "idempotent": true,
  "paginated": false
}

export default class CrmImportRollback extends ResourceCommand {
  static description = "Undo a finished import: records it created that nobody has worked on are removed and changed values put back. --wait follows the import until it stops (crm:write)"

  static examples = [
    "<%= config.bin %> crm import rollback --object projects --import IMPORT_ID --wait --json"
  ]

  static spec = spec

  static flags = {
    ...resourceFlags(spec),
    wait: Flags.boolean({ description: 'Wait until the import has finished and print its final state', default: false }),
    timeout: Flags.integer({ description: 'With --wait, seconds to wait', default: 300, min: 1 }),
  }

  protected async transformResult(result: unknown, context: { config: CliConfig; path: string }): Promise<unknown> {
    if (!this.flags.wait) {
      return result
    }

    return waitForImport({
      config: context.config,
      path: context.path.replace(/\/(dry-run|run|rollback)$/, ''),
      timeoutSeconds: Number(this.flags.timeout),
      rollback: true,
    })
  }
}
