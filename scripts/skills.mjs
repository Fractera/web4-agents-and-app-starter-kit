// THE NODE'S SKILLS MEMORY (node step 595-3).
//   npm run skills -- add <folder> --source <name> --license <spdx> [--url <address>] [--name <skill>]
//       a skill of another project into the graph element as a ready graph (no language model; the graph counts vectors by the node's
//       OpenAI key). The folder holds SKILL.md and references/*.md; SOURCE.md and LICENSE beside them say where it came from.
//   npm run skills -- find "<question>" [--themes "<a, b>"] [--terms "<c, d>"]
//       what other projects did: at most three fragments, 3 KB, each with its skill, source and licence.
//   npm run skills -- base-sync <folder> --source <name> --license <spdx> [--url <address>] [--version <v>]
//       a licensed skill into the base shipped with every clone (node step 598): lib/agent-kit/skills/base/ + manifest.json
//   npm run skills -- base-check   — every skill of the base may be handed out (its LICENSE, a licence from the list, only its text)
//   npm run skills -- base-load    — the base into this node's graph, once: a ledger (data/node/skills-base.json) keeps what is loaded
// Nothing runs by itself: a person or an agent calls it (the node's installer calls base-load at the end of a full installation).
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { markOf, skillGraph } from '../lib/agent-kit/skills/to-graph.mjs'
import { findSkills, graphCall } from '../lib/agent-kit/skills/find.mjs'
import { BASE, checkBase, readManifest, shaOf, syncSkill } from '../lib/agent-kit/skills/base.mjs'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const [cmd, ...rest] = process.argv.slice(2)
const flag = (name) => {
  const i = rest.indexOf(`--${name}`)
  return i >= 0 ? rest[i + 1] : undefined
}
const positional = rest.filter((a, i) => !a.startsWith('--') && !(i > 0 && rest[i - 1].startsWith('--')))

if (cmd === 'add') {
  const dir = resolve(positional[0] ?? '')
  const source = flag('source')
  if (!positional[0] || !source) {
    console.log('===SKILLS_FAIL=== usage: npm run skills -- add <folder> --source <name> --license <spdx> [--url <address>]')
    process.exit(2)
  }
  const { mark, skill, graph } = skillGraph(dir, { source, name: flag('name'), license: flag('license'), url: flag('url') })
  const { status, body } = await graphCall(ROOT, 'graph-insert', graph, 300_000)
  if (status !== 200 || !body?.ok) {
    console.log(`===SKILLS_FAIL=== graph-insert ${status} ${JSON.stringify(body).slice(0, 300)}`)
    process.exit(1)
  }
  console.log(`===SKILLS_ADDED=== ${skill} as ${mark}: ${graph.chunks.length} chunks, ${graph.entities.length} entities, ${graph.relationships.length} relationships; vectors ${body.embedCalls ?? '?'} calls, language model ${body.llmCalls ?? '?'}`)
} else if (cmd === 'find') {
  const query = positional.join(' ')
  if (!query) {
    console.log('===SKILLS_FAIL=== usage: npm run skills -- find "<question>" [--themes "<a, b>"] [--terms "<c, d>"]')
    process.exit(2)
  }
  const r = await findSkills(ROOT, { query, themes: flag('themes'), terms: flag('terms') })
  if (r.error) { console.log(`===SKILLS_FAIL=== ${r.error}`); process.exit(1) }
  console.log(r.found ? r.text : 'No skill of another project is close enough to this question.')
  console.log(`===SKILLS_FOUND=== ${r.fragments.length} ${r.fragments.map((f) => `${f.source}:${f.skill}`).join(' ')}`)
} else if (cmd === 'base-sync') {
  try {
    const e = syncSkill(resolve(positional[0] ?? ''), { source: flag('source'), license: flag('license'), url: flag('url') ?? '', version: flag('version') ?? '' })
    console.log(`===SKILLS_BASE_SYNCED=== ${e.source}:${e.skill} (${e.license}) — ${e.files.length} files: ${e.files.join(', ')}`)
  } catch (err) {
    console.log(`===SKILLS_FAIL=== ${err.message}`)
    process.exit(1)
  }
} else if (cmd === 'base-check') {
  const problems = checkBase(positional[0] ? resolve(positional[0]) : BASE)
  if (problems.length) { console.log(`===SKILLS_BASE_FAIL===\n  ${problems.join('\n  ')}`); process.exit(1) }
  const skills = readManifest()
  console.log(`===SKILLS_BASE_OK=== ${skills.length} skills, each with its licence: ${skills.map((s) => `${s.source}:${s.skill} (${s.license})`).join(', ')}`)
} else if (cmd === 'base-load') {
  // 598-2: what is loaded is kept in a ledger by the fingerprint of SKILL.md — a repeated insert of the same skill would merge its
  // descriptions into the old ones in LightRAG, so a loaded skill is never inserted again.
  const LEDGER = join(ROOT, 'data', 'node', 'skills-base.json')
  let ledger = {}
  try { ledger = JSON.parse(readFileSync(LEDGER, 'utf8')) } catch { /* no ledger yet */ }
  const at = new Date().toISOString()
  const done = { inserted: [], adopted: [], already: 0, failed: [] }
  for (const s of readManifest()) {
    const mark = markOf(s.source, s.skill)
    if (ledger[mark]?.sha === s.sha) { done.already += 1; continue }
    // 595-3 inserted this very copy by hand (data/node/skills/) — adopt it into the ledger without inserting it twice.
    const own = join(ROOT, 'data', 'node', 'skills', s.source, s.skill, 'SKILL.md')
    if (!ledger[mark] && existsSync(own) && shaOf(own) === s.sha) {
      ledger[mark] = { sha: s.sha, at, how: 'adopted — inserted by step 595-3' }
      done.adopted.push(mark)
      continue
    }
    try {
      const { graph } = skillGraph(join(BASE, s.source, s.skill), { source: s.source, name: s.skill, license: s.license, url: s.url })
      const { status, body } = await graphCall(ROOT, 'graph-insert', graph, 300_000)
      if (status !== 200 || !body?.ok) { done.failed.push(`${mark}: graph-insert ${status} ${JSON.stringify(body).slice(0, 160)}`); continue }
      ledger[mark] = { sha: s.sha, at, how: 'inserted', chunks: graph.chunks.length, entities: graph.entities.length, embedCalls: body.embedCalls ?? null }
      done.inserted.push(mark)
    } catch (err) {
      done.failed.push(`${mark}: ${err instanceof Error ? err.message : err}`)
    }
  }
  mkdirSync(dirname(LEDGER), { recursive: true })
  writeFileSync(LEDGER, `${JSON.stringify(ledger, null, 2)}\n`)
  console.log(`${done.failed.length ? '===SKILLS_BASE_LOAD_FAIL===' : '===SKILLS_BASE_LOADED==='} inserted ${done.inserted.length}${done.inserted.length ? ` (${done.inserted.join(', ')})` : ''} · adopted ${done.adopted.length} · already ${done.already} · failed ${done.failed.length}`)
  for (const f of done.failed) console.log(`  ${f}`)
  process.exit(done.failed.length ? 1 : 0)
} else {
  console.log('===SKILLS_FAIL=== commands: add, find, base-sync, base-check, base-load')
  process.exit(2)
}
