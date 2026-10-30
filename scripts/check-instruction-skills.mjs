// SKILLS THE INSTRUCTION NAMES EXIST (federal step 571-3, 2026-10-30): `npm run check:instruction-skills`, part of `prebuild`.
//
// `CLAUDE.md` of the core names the main agent's skills («the skill `self-review`», «Skills `ask-element`, `supervise-element`»). A named
// skill missing from `.claude/skills/` is a promise the agent cannot keep, and nothing else notices it: measured 2026-10-30 — `self-review`
// was named by sections 1 and 4 and did not exist. A skill of an element is named «the element's skill `…`» and is not checked here.
// `--file <path>` checks another instruction, `--skills <folder>` another skills folder (both for a spoiled copy).
import { existsSync, readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const args = process.argv.slice(2)
const arg = (k) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : null }
const file = arg('--file') ?? join(ROOT, 'CLAUDE.md')
const skills = arg('--skills') ?? join(ROOT, '.claude', 'skills')

const text = readFileSync(file, 'utf8').replace(/\s+/g, ' ')
const named = new Set()
for (const m of text.matchAll(/(element's )?\b[Ss]kills? ((?:`[a-z0-9][a-z0-9-]*`(?:,? (?:and )?)?)+)/g)) {
  if (m[1]) continue
  for (const n of m[2].matchAll(/`([a-z0-9][a-z0-9-]*)`/g)) named.add(n[1])
}
const missing = [...named].filter((n) => !existsSync(join(skills, n, 'SKILL.md'))).sort()
if (missing.length) {
  for (const n of missing) console.log(`  ✗ ${n} — named by ${file.replaceAll('\\', '/').split('/').pop()}, no ${n}/SKILL.md in the skills folder`)
  console.log(`===INSTRUCTION_SKILLS_FAIL=== ${missing.length} of ${named.size} named skills are missing`)
  process.exit(1)
}
console.log(`===INSTRUCTION_SKILLS_OK=== ${named.size} skills named by the instruction, all in .claude/skills`)
