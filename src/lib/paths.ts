import { existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

export function packageRoot(fromModuleUrl: string): string {
  let dir = dirname(fileURLToPath(fromModuleUrl))

  while (!existsSync(join(dir, 'package.json'))) {
    const parent = dirname(dir)

    if (parent === dir) {
      throw new Error('Could not find package.json for formspring-cli')
    }

    dir = parent
  }

  return dir
}
