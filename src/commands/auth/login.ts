import { Flags } from '@oclif/core'
import { deviceLogin } from '../../lib/device-auth.js'
import { printResult } from '../../lib/output.js'
import { FormspringCommand } from '../../lib/formspring-command.js'

export default class AuthLogin extends FormspringCommand {
  static description = 'Sign in via device authorization (browser) and save API token'

  static examples = [
    '<%= config.bin %> auth login --base-url https://formspring.io',
    '<%= config.bin %> auth login --base-url http://pixel-forms.test --json',
  ]

  static flags = {
    ...FormspringCommand.baseFlags,
    client: Flags.string({
      description: 'Device auth client name sent to the app',
      default: 'formspring-cli',
    }),
  }

  async run(): Promise<void> {
    const config = this.getRuntimeConfig()
    const baseUrl = config.baseUrl
    const token = await deviceLogin(baseUrl, String(this.flags.client))

    if (this.flags.json) {
      printResult({ baseUrl, profile: config.profile ?? 'default', token_saved: true }, true)
      return
    }

    process.stderr.write(`Saved token to ~/.config/formspring/config.json (${baseUrl})\n`)
  }
}
