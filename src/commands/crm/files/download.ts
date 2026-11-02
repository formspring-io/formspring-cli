import { Flags } from '@oclif/core'
import { CliError } from '../../../lib/errors.js'
import { FormspringCommand } from '../../../lib/formspring-command.js'
import { printResult } from '../../../lib/output.js'
import { restDownloadSigned } from '../../../lib/rest.js'

export default class CrmFilesDownload extends FormspringCommand {
  static description =
    'Download a file of a Files field through its signed, expiring url (the url in a record value or an upload answer; it needs no token and lasts 15 minutes)'

  static examples = [
    '<%= config.bin %> crm files download --url "$(formspring crm records get --object projects --record REC_ID --json | jq -r \'.data.values.attachments[0].url\')" --output brief.pdf',
  ]

  static flags = {
    ...FormspringCommand.baseFlags,
    url: Flags.string({ required: true, description: 'The signed url of the file' }),
    output: Flags.string({ char: 'o', required: true, description: 'File to write the download to (use - for stdout)' }),
    force: Flags.boolean({ description: 'Replace --output if it already exists', default: false }),
  }

  async run(): Promise<void> {
    const url = String(this.flags.url)

    if (!/^https?:\/\//.test(url)) {
      throw new CliError('--url must be the full signed link of the file.', 1, 'Read it from the file value of a record (crm records get) or from crm files upload.')
    }

    const output = String(this.flags.output)
    const result = await restDownloadSigned({
      config: this.getRuntimeConfig(),
      url,
      output,
      force: Boolean(this.flags.force),
    })

    if (result) {
      if (output === '-') {
        process.stderr.write(`${result.bytes} bytes written to stdout\n`)
      } else {
        printResult(result, this.flags.json)
      }
    }
  }
}
