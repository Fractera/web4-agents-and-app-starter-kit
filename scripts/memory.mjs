// THE NODE'S MEMORY (node step 595).
//   npm run memory -- adopt     the native memory of Claude Code that each agent kept under ~/.claude/projects/<its folder>/memory moves
//                               into the node: data/services/<id>/memory (the main agent's id is build). A copy — the old folder stays;
//                               a file already in the node is never overwritten. The bridge points every session there
//                               (autoMemoryDirectory), so a moved or renamed folder no longer loses an agent's memory (595-5).
//   npm run memory -- backfill  the main agent's past sessions into the diary data/node/memory/episodes (595-6).
//   npm run memory -- brief <id> what the agent <id> gets at the start of a new session, before its first request (595-7): the text
//                               of the SessionStart hook (lib/agent-kit/memory/brief.cjs) and its size; nothing remembered — «empty».
//   npm run memory -- recall <id> "<message>"  what the agent <id> gets before this message of the person (595-8): the text of the
//                               UserPromptSubmit hook (lib/agent-kit/memory/recall.cjs); nothing related — «nothing».
// Nothing runs by itself: a person or the main agent calls it.
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { createRequire } from 'node:module'
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
} else if (cmd === 'backfill') {
  // 595-6: the main agent's past sessions into the diary, once, by the same reader as the hook; a second run writes nothing.
  const { recordSession } = createRequire(import.meta.url)('../lib/agent-kit/memory/record.cjs')
  const dir = join(homedir(), '.claude', 'projects', projectName(join(ROOT, 'data', 'main-agent')))
  const logs = existsSync(dir) ? readdirSync(dir).filter((f) => f.endsWith('.jsonl')).map((f) => join(dir, f)).sort((a, b) => statSync(a).mtimeMs - statSync(b).mtimeMs) : []
  let total = 0
  for (const file of logs) total += recordSession(file, 'build')
  console.log(`===MEMORY_BACKFILL_OK=== ${logs.length} sessions of the main agent, ${total} lines written`)
} else if (cmd === 'brief') {
  const id = process.argv[3]
  if (!id) { console.log('===MEMORY_FAIL=== brief <agent id> (the main agent is build)'); process.exit(2) }
  const text = createRequire(import.meta.url)('../lib/agent-kit/memory/brief.cjs').brief(id)
  if (text) console.log(text)
  console.log(`===MEMORY_BRIEF=== ${id}: ${text ? `${text.length} characters` : 'empty — no block at the start'}`)
} else if (cmd === 'recall') {
  const [, id, ...said] = process.argv.slice(2)
  if (!id || !said.length) { console.log('===MEMORY_FAIL=== recall <agent id> "<message of the person>" (the main agent is build)'); process.exit(2) }
  const text = createRequire(import.meta.url)('../lib/agent-kit/memory/recall.cjs').recall(said.join(' '), id)
  if (text) console.log(text)
  console.log(`===MEMORY_RECALL=== ${id}: ${text ? `${text.split('\n').length - 1} finding(s), ${text.length} characters` : 'nothing related — no lines before this message'}`)
} else {
  console.log('===MEMORY_FAIL=== commands: adopt, backfill, brief, recall')
  process.exit(2)
}
