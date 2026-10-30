// npm run check:skill-headers — every skill of the core opens with a header Claude Code can read (federal step 621-5, 2026-10-30).
//
// A SKILL.md whose YAML header does not parse, or has CRLF line ends, loads with empty metadata: the skill is in the folder, has no name
// and no description, and never triggers — silently (measured 2026-10-19/20: the main agent's skills with CRLF; 2026-10-22: a
// description with «: » inside). `claude plugin validate` says «passed» on both (568), so the header is read here with js-yaml:
// it parses, `name` equals the folder, `description` is a string of at least 50 characters, no CR. `--dir <folder>` checks another
// skills folder (a spoiled copy for the negative control).
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import yaml from 'js-yaml'

const ROOT = resolve(import.meta.dirname, '..')
const i = process.argv.indexOf('--dir')
const dir = i > 0 ? resolve(process.argv[i + 1]) : join(ROOT, '.claude', 'skills')
const bad = []
let count = 0
for (const name of readdirSync(dir)) {
  const file = join(dir, name, 'SKILL.md')
  if (!existsSync(file)) continue
  count++
  const text = readFileSync(file, 'utf8')
  if (text.includes('\r')) { bad.push(`${name}: CR line ends — the header is not read`); continue }
  const m = text.match(/^---\n([\s\S]*?)\n---/)
  if (!m) { bad.push(`${name}: no header between --- lines`); continue }
  let head
  try { head = yaml.load(m[1]) } catch (e) { bad.push(`${name}: the header does not parse — ${String(e.message).split('\n')[0]}`); continue }
  if (head?.name !== name) bad.push(`${name}: name «${head?.name}» is not the folder's name`)
  if (typeof head?.description !== 'string' || head.description.length < 50) bad.push(`${name}: no description of at least 50 characters`)
}
for (const b of bad) console.log(`  ✗ ${b}`)
console.log(bad.length ? `===SKILL_HEADERS_FAIL=== ${bad.length} problem(s) in ${count} skills` : `===SKILL_HEADERS_OK=== ${count} skills, every header readable`)
process.exit(bad.length ? 1 : 0)
