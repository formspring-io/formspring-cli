import { Command, Flags } from '@oclif/core'
import { loadConfig, type CliConfig } from '../config.js'
import { printError } from './output.js'

export abstract class FormspringCommand extends Command {
  static readonly baseFlags = {
    json: Flags.boolean({
      description: 'Print JSON to stdout (recommended for agents)',
      default: false,
    }),
    'base-url': Flags.string({
      description: 'Formspring app URL',
      env: 'FORMSPRING_BASE_URL',
    }),
    token: Flags.string({
      description: 'Bearer API token',
      env: 'FORMSPRING_TOKEN',
    }),
    profile: Flags.string({
      description: 'Config profile in ~/.config/formspring/config.json',
      env: 'FORMSPRING_PROFILE',
    }),
    verbose: Flags.boolean({
      description: 'Log request details to stderr',
      default: false,
    }),
    yes: Flags.boolean({
      description: 'Skip confirmation prompts',
      default: false,
    }),
  }

  declare flags: {
    json: boolean
    'base-url'?: string
    token?: string
    profile?: string
    verbose: boolean
    yes: boolean
    [key: string]: unknown
  }

  declare args: Record<string, unknown>

  public async init(): Promise<void> {
    await super.init()
    const { flags, args } = await this.parse(
      this.constructor as typeof FormspringCommand,
    )
    this.flags = flags as this['flags']
    this.args = args as this['args']
  }

  protected getRuntimeConfig(): CliConfig {
    const config = loadConfig(this.flags.profile)

    return {
      ...config,
      baseUrl: this.flags['base-url'] ?? config.baseUrl,
      token: this.flags.token ?? config.token,
    }
  }

  protected async catch(error: Error & { exitCode?: number }): Promise<unknown> {
    printError(error)
    return this.exit(error.exitCode ?? 1)
  }
}
