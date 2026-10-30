// Federal step 613-4: each element's own sections (from its CLAUDE.md in git HEAD) stand word for word in section 11 of the new file,
// and no old common heading is left. --spoil <element> drops one line of that element's own text before the check.
import { readFileSync } from 'node:fs'
import { execSync } from 'node:child_process'
import path from 'node:path'
import { ownOf } from './build.mjs'
const E = path.resolve(process.argv[2])
const spoil = process.argv.indexOf('--spoil') > 0 ? process.argv[process.argv.indexOf('--spoil') + 1] : null
let bad = 0
for (const rel of process.argv.slice(3).filter((a) => !a.startsWith('--') && a !== spoil)) {
  const dir = path.join(E, rel)
  const old = execSync('git show HEAD:CLAUDE.md', { cwd: dir, encoding: 'utf8' })
  let fresh = readFileSync(path.join(dir, 'CLAUDE.md'), 'utf8').replace(/\r\n/g, '\n')
  const own = ownOf(old).replace('🪦 «Thinking never goes to OpenAI» (owner 2026-09-09) — lifted by the owner\n  2026-10-26 (node step 597-2), his words:', 'Thinking goes to OpenAI (the owner\n  2026-10-26, node step 597-2, lifting his rule of 2026-09-09), his words:')
  if (spoil && rel.endsWith(spoil)) fresh = fresh.split(own.split('\n').filter((l) => l.trim())[2]).join('')
  const lines = own.split('\n').filter((l) => l.trim())
  const lost = lines.filter((l) => !fresh.includes(l))
  const stale = ['## Two natures', '## On wake —', '## How you report', '## Skills by group'].filter((h) => fresh.includes(h))
  console.log(`${rel}: own lines ${lines.length}, lost ${lost.length}${stale.length ? ', old headings ' + stale.join(' ') : ''}`)
  bad += lost.length + stale.length
}
console.log(bad ? '===ELEMENTS_FAIL===' : '===ELEMENTS_OK===')
process.exitCode = bad ? 1 : 0
