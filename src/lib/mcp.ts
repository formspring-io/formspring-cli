import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js'
import { appBaseUrl, type CliConfig } from '../config.js'
import { CliError } from './errors.js'

let cachedClient: Client | null = null

async function getClient(config: CliConfig): Promise<Client> {
  if (!config.token) {
    throw new CliError('No API token configured.', 1, 'formspring auth login')
  }

  if (cachedClient) {
    return cachedClient
  }

  const transport = new StreamableHTTPClientTransport(
    new URL(`${appBaseUrl(config)}/mcp-server`),
    {
      requestInit: {
        headers: {
          Authorization: `Bearer ${config.token}`,
        },
      },
    },
  )

  const client = new Client({ name: 'formspring-cli', version: '0.1.0' })
  await client.connect(transport)
  cachedClient = client

  return client
}

export async function mcpListTools(config: CliConfig) {
  const client = await getClient(config)
  return client.listTools()
}

export async function mcpCallTool(
  config: CliConfig,
  name: string,
  args: Record<string, unknown>,
) {
  const client = await getClient(config)
  return client.callTool({ name, arguments: args })
}
