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
// The person controls the memory (595-9; the main agent runs these on the person's words, skill know-the-architect):
//   npm run memory -- show      what the node remembers: the picture, the diary by agent and day, the notes, the switch — plain words
//   npm run memory -- forget --day <YYYY-MM-DD>   the diary lines and notes of that day (this computer's clock) are deleted
//   npm run memory -- forget --all                every diary line and note is deleted; the marks of read sessions stay, so nothing
//                               comes back. The picture is separate: the main agent deletes a fact's file and its index line.
//   npm run memory -- off | on  the switch data/node/memory/settings.json: off — no agent writes the diary, gets the last exchange at
//                               start or associations before a message; what is said meanwhile is never kept, not even after «on».
// Nothing runs by itself: a person or the main agent calls it.
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, renameSync, statSync, unlinkSync, writeFileSync } from 'node:fs'
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
} else if (cmd === 'show' || cmd === 'forget' || cmd === 'off' || cmd === 'on') {
  const require = createRequire(import.meta.url)
  const { EPISODES, SETTINGS, memoryOn } = require('../lib/agent-kit/memory/record.cjs')
  const { indexEntries, PICTURE, NOTES } = require('../lib/agent-kit/memory/brief.cjs')
  // A day is the person's day — this computer's clock (the node runs at home); the diary keeps UTC times.
  const localDay = (t) => { const d = new Date(t); return Number.isNaN(d.getTime()) ? '' : `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` }
  const months = () => (existsSync(EPISODES) ? readdirSync(EPISODES).filter((f) => /^\d{4}-\d{2}\.jsonl$/.test(f)).sort().map((f) => join(EPISODES, f)) : [])
  const lines = (file) => (existsSync(file) ? readFileSync(file, 'utf8').split('\n').filter((l) => l.trim()) : [])
  const parse = (l) => { try { return JSON.parse(l) } catch { return null } }
  // Rewritten through a temporary file and a rename: a reader never sees half a file.
  const rewrite = (file, keep) => {
    if (!keep.length) { unlinkSync(file); return }
    writeFileSync(`${file}.tmp`, `${keep.join('\n')}\n`)
    renameSync(`${file}.tmp`, file)
  }
  const flagOf = (name) => { const i = process.argv.indexOf(name); return i > 0 ? process.argv[i + 1] ?? '' : null }

  if (cmd === 'off') {
    mkdirSync(dirname(SETTINGS), { recursive: true })
    writeFileSync(SETTINGS, `${JSON.stringify({ on: false, since: new Date().toISOString() })}\n`)
    console.log('===MEMORY_OFF=== memory is off: no agent of this node writes the diary, gets the last exchange at the start or associations before a message. What is said meanwhile is never kept, not even after «on». Back on: npm run memory -- on')
  } else if (cmd === 'on') {
    if (existsSync(SETTINGS)) unlinkSync(SETTINGS)
    console.log('===MEMORY_ON=== memory is on: the diary writes again from now on; what was said while it was off is not brought back.')
  } else if (cmd === 'forget') {
    const day = flagOf('--day')
    const all = process.argv.includes('--all')
    if (!all && !/^\d{4}-\d{2}-\d{2}$/.test(day ?? '')) { console.log('===MEMORY_FAIL=== forget --day <YYYY-MM-DD> | forget --all'); process.exit(2) }
    let gone = 0
    let kept = 0
    let files = 0
    for (const file of months()) {
      const all_ = lines(file)
      const keep = all ? [] : all_.filter((l) => localDay(parse(l)?.t) !== day)
      if (keep.length !== all_.length) { rewrite(file, keep); files += 1 }
      gone += all_.length - keep.length
      kept += keep.length
    }
    const notes = lines(NOTES)
    const notesKept = all ? [] : notes.filter((l) => localDay(parse(l)?.t) !== day)
    if (notesKept.length !== notes.length) rewrite(NOTES, notesKept)
    const what = all ? 'everything' : `${day} (this computer's clock)`
    console.log(`===MEMORY_FORGET_OK=== ${what}: ${gone} diary line(s) in ${files} month file(s) and ${notes.length - notesKept.length} note(s) deleted; ${kept} line(s) of other days kept. ` +
      'The marks of read sessions stay, so nothing comes back. Claude Code keeps its own session logs until it deletes them itself (cleanupPeriodDays); the picture is separate — the main agent deletes a fact\'s file and its index line.')
  } else {
    const records = indexEntries(PICTURE)
    const picture = records.filter((e) => e.type === 'user' || e.type === 'feedback')
    const rows = months().flatMap(lines).map(parse).filter(Boolean)
    const who = { person: 0, agent: 0, node: 0 }
    const byAgent = {}
    const byDay = {}
    for (const r of rows) {
      who[r.who] = (who[r.who] ?? 0) + 1
      byAgent[r.agent] = (byAgent[r.agent] ?? 0) + 1
      const d = localDay(r.t)
      byDay[d] = (byDay[d] ?? 0) + 1
    }
    const days = Object.keys(byDay).sort()
    const out = [
      `Memory of this node: ${memoryOn() ? 'on' : 'OFF — nothing is written or recalled (npm run memory -- on)'}.`,
      `The picture of the person (the main agent keeps it; every agent of the node gets it): ${picture.length} record(s)`,
      ...picture.map((e) => `- ${e.title} ${e.rest}`.trim()),
      ...(records.length > picture.length ? [`+ ${records.length - picture.length} more record(s) about the work (project or reference), not about the person.`] : []),
      rows.length
        ? `The diary — what was said, copied without a model: ${rows.length} line(s), ${days[0]} … ${days[days.length - 1]} (this computer's clock): the person said ${who.person} thing(s), the agents answered ${who.agent} time(s), the node wrote ${who.node} text(s).`
        : 'The diary is empty.',
      ...(rows.length ? [`By agent: ${Object.entries(byAgent).sort((a, b) => b[1] - a[1]).map(([a, n]) => `${a === 'build' ? 'main agent' : a} ${n}`).join(' · ')}`,
        `By day (newest first): ${days.slice().reverse().slice(0, 14).map((d) => `${d} — ${byDay[d]}`).join(' · ')}${days.length > 14 ? ` · and ${days.length - 14} earlier day(s)` : ''}`] : []),
      `Notes «where I stopped» of the main agent: ${lines(NOTES).length}`,
      'Claude Code keeps its own session logs too and deletes them by itself (cleanupPeriodDays); the diary is the node\'s copy.',
      'To forget: a day — npm run memory -- forget --day <YYYY-MM-DD> · everything — forget --all · a fact of the picture — its file and index line · stop remembering — off',
    ]
    console.log(out.join('\n'))
    console.log('===MEMORY_SHOW===')
  }
} else {
  console.log('===MEMORY_FAIL=== commands: adopt, backfill, brief, recall, show, forget, off, on')
  process.exit(2)
}
