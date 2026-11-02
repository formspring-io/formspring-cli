/* Hand-written: stands in for the generated command of api.crm.imports.dry-run (same request, friendlier flags). npm run scaffold-resources keeps this file. */
import { Flags } from '@oclif/core'
import { ResourceCommand, resourceFlags, type ResourceSpec } from '../../../lib/resource-command.js'
import type { CliConfig } from '../../../config.js'
import { waitForImport } from '../../../lib/crm-wait.js'

const spec: ResourceSpec = {
  "route": "api.crm.imports.dry-run",
  "method": "POST",
  "path": "/crm/objects/{object}/imports/{import}/dry-run",
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

export default class CrmImportDryRun extends ResourceCommand {
  static description = "Check every row of the import without writing anything; read the import (crm import status) for the counts and reasons. --wait follows the import until it stops (crm:write)"

  static examples = [
    "<%= config.bin %> crm import dry-run --object projects --import IMPORT_ID --wait --json"
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
      rollback: false,
    })
  }
}
