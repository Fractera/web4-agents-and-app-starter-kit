// THE NODE'S MEMORY (node step 595).
//   npm run memory -- adopt     the native memory of Claude Code that each agent kept under ~/.claude/projects/<its folder>/memory moves
//                               into the node: data/services/<id>/memory (the main agent's id is build). A copy — the old folder stays;
//                               a file already in the node is never overwritten. The bridge points every session there
//                               (autoMemoryDirectory), so a moved or renamed folder no longer loses an agent's memory (595-5).
// Nothing runs by itself: a person or the main agent calls it.
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { homedir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const [cmd] = process.argv.slice(2)
// Claude Code names a project folder by its path with every other character turned into «-» (measured on this machine).
const projectName = (path) => path.replace(/[^A-Za-z0-9]/g, '-')

function registry() {
  try {
    const r = JSON.parse(readFileSync(join(ROOT, 'WEB4-ITEMS-REGISTRY', 'web4-items.json'), 'utf8'))
    return Array.isArray(r) ? r : r.services ?? r.items ?? []
  } catch {
    return []
  }
}

function copyTree(from, to) {
  let copied = 0
  let kept = 0
  mkdirSync(to, { recursive: true })
  for (const name of readdirSync(from)) {
    const src = join(from, name)
    const dst = join(to, name)
    if (statSync(src).isDirectory()) {
      const r = copyTree(src, dst)
      copied += r.copied
      kept += r.kept
    } else if (existsSync(dst)) kept += 1
    else { copyFileSync(src, dst); copied += 1 }
  }
  return { copied, kept }
}

if (cmd === 'adopt') {
  const projects = join(homedir(), '.claude', 'projects')
  const targets = [{ id: 'build', folder: join(ROOT, 'data', 'main-agent') }]
  for (const s of registry()) {
    if (!s?.id) continue
    for (const kind of ['core', 'user']) {
      const folder = join(ROOT, 'WEB4-ITEMS', kind, s.folder ?? s.id)
      if (existsSync(folder)) targets.push({ id: s.id, folder })
    }
  }
  for (const { id, folder } of targets) {
    const from = join(projects, projectName(folder), 'memory')
    if (!existsSync(from) || !readdirSync(from).length) { console.log(`${id}: no native memory in ${from}`); continue }
    const r = copyTree(from, join(ROOT, 'data', 'services', id, 'memory'))
    console.log(`${id}: ${r.copied} copied, ${r.kept} already in the node`)
  }
  console.log('===MEMORY_ADOPT_OK===')
} else {
  console.log('===MEMORY_FAIL=== commands: adopt')
  process.exit(2)
}
