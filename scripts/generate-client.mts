import { execSync } from 'node:child_process'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const input = join(root, 'schema/openapi.json')
const output = join(root, 'src/generated/openapi.ts')

execSync(
  `npx openapi-typescript "${input}" -o "${output}"`,
  { stdio: 'inherit', cwd: root },
)

console.log(`Generated ${output}`)
