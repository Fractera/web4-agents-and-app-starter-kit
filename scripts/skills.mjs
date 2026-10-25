// THE NODE'S SKILLS MEMORY (node step 595-3).
//   npm run skills -- add <folder> --source <name> --license <spdx> [--url <address>] [--name <skill>]
//       a skill of another project into the graph element as a ready graph (no language model; the graph counts vectors by the node's
//       OpenAI key). The folder holds SKILL.md and references/*.md; SOURCE.md and LICENSE beside them say where it came from.
//   npm run skills -- find "<question>" [--themes "<a, b>"] [--terms "<c, d>"]
//       what other projects did: at most three fragments, 3 KB, each with its skill, source and licence.
// Nothing runs by itself: a person or an agent calls it.
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { skillGraph } from '../lib/agent-kit/skills/to-graph.mjs'
import { findSkills, graphCall } from '../lib/agent-kit/skills/find.mjs'

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
} else {
  console.log('===SKILLS_FAIL=== commands: add, find')
  process.exit(2)
}
