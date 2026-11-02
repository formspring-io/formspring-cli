import { writeFileSync, existsSync } from 'node:fs'
import { Flags } from '@oclif/core'
import { splitList, unwrap } from '../../../lib/crm.js'
import { CliError } from '../../../lib/errors.js'
import { FormspringCommand } from '../../../lib/formspring-command.js'
import { printResult } from '../../../lib/output.js'
import { restRequest } from '../../../lib/rest.js'

export default class CrmSchemaExport extends FormspringCommand {
  static description =
    'Export the whole data model (objects, fields, relations, shared views, layouts, permissions, dashboards) as one versioned document. No records, no secrets. Owner and administrators only (crm:read)'

  static examples = [
    '<%= config.bin %> crm schema export --output data-model.json',
    '<%= config.bin %> crm schema export --objects projects,clients --output template.json',
    '<%= config.bin %> crm schema export --json',
  ]

  static flags = {
    ...FormspringCommand.baseFlags,
    objects: Flags.string({ description: 'Comma-separated object keys; the objects they relate to come along' }),
    output: Flags.string({
      char: 'o',
      description: 'Write the document to this file (use - for stdout). It can be fed to crm schema plan and crm schema apply',
    }),
    force: Flags.boolean({ description: 'Replace --output if it already exists', default: false }),
  }

  async run(): Promise<void> {
    const objects = splitList(this.flags.objects as string | undefined)

    const response = await restRequest<unknown>({
      config: this.getRuntimeConfig(),
      method: 'GET',
      path: '/crm/schema',
      query: objects ? { objects: objects.join(',') } : undefined,
    })

    if (response === undefined) {
      return
    }

    const output = this.flags.output as string | undefined

    if (output === undefined) {
      printResult(response, this.flags.json)

      return
    }

    const document = `${JSON.stringify(unwrap(response), null, 2)}\n`

    if (output === '-') {
      process.stdout.write(document)

      return
    }

    if (existsSync(output) && !this.flags.force) {
      throw new CliError(`${output} already exists.`, 1, 'Pass --force to replace it, or choose another --output.')
    }

    writeFileSync(output, document)
    printResult({ path: output, bytes: Buffer.byteLength(document) }, this.flags.json)
  }
}
