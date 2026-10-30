// Federal step 613: one source of the element instruction → the three templates and every element of the node. In the core since federal
// step 621-4 (2026-10-30): before, it lived in the federal folder and wrote into its clones of the templates.
//   npm run instruction:element -- render <custom|native|root>   print the template variant
//   npm run instruction:element -- coverage [--drop <name>]      every `name` of the old CLAUDE.md (git HEAD) of each template is in the
//                                                                new variant or in its mode files; --drop removes a name (spoil)
//   npm run instruction:element -- templates [--dry]             CLAUDE.md, guard, seal, scripts, references into the three templates
//   npm run instruction:element -- element <dir> [--dry]         the same for one element of the node: the common part + its own sections
// The templates are the workshop clones (`npm run template -- clone <custom|native>`) and root's own folder (its repository is the root
// template). Sections 1–10 are sealed: they change only by the owner's word, here in element-instruction.src.md.
import { readFileSync, writeFileSync, existsSync, readdirSync, copyFileSync, statSync } from 'node:fs'
import { execSync } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const core = path.resolve(here, '../../..')
const TEMPLATES = {
  custom: path.join(core, 'data', 'workshop', 'fractera-custom-item-starter'),
  native: path.join(core, 'data', 'workshop', 'fractera-native-item-starter'),
  root: path.join(core, 'WEB4-ITEMS', 'user', 'root'),
}
const SRC = readFileSync(path.join(here, 'element-instruction.src.md'), 'utf8').replace(/\r\n/g, '\n')
// 609: root has `npm run need` now (v3.0.9) — Y like custom; an element without the skill still gets R from `render(…, need = false)`.
const TAGS = { custom: ['C', 'Y', 'T'], root: ['C', 'Y', 'T'], native: ['N', 'Y', 'T'] }
// Headings of the old common part (every template before 613): what is not among them in an element's CLAUDE.md is its own.
const OLD_HEADINGS = ['Process —', 'Two natures', 'On wake', 'Skills by group', 'Outbound A2A guard', 'Protocols', 'How you report']
const NEW_HEADINGS = ['1. Role and goal', '2. Where you live', '3. Your session', '4. Process', '5. On wake', '6. Protocols',
  '7. Laws everywhere', '8. Skills by group', '9. Glossary', '10. Where the details are', '11. This element', '12. Evolution']
// Where skills and documents point into CLAUDE.md by section name.
const REFS = [
  ['CLAUDE.md, «How you report»', 'CLAUDE.md, «7. Laws everywhere»'],
  ['CLAUDE.md, «On wake»', 'CLAUDE.md, «5. On wake»'],
  ['CLAUDE.md, «Two natures»', 'CLAUDE.md, «4. Process»'],
  ['CLAUDE.md`, «Two natures»', 'CLAUDE.md`, «4. Process»'],
  ['CLAUDE.md`, «Outbound A2A guard»', 'CLAUDE.md`, «6. Protocols»'],
  ['CLAUDE.md`, «Protocols»', 'CLAUDE.md`, «6. Protocols»'],
  ['CLAUDE.md, «Protocols»', 'CLAUDE.md, «6. Protocols»'],
]
const SELF_REVIEW_OLD = '- **Replacing a line beats adding a paragraph.**'
const SELF_REVIEW_NEW = '- **A rule for yourself that belongs to no skill** is an entry of `CLAUDE.md`, section 12 «Evolution»: one line\n' +
  '  `- If … — …; else …`, at most 25 words, never against sections 1–10; `npm run check:instruction` must stay green.\n' + SELF_REVIEW_OLD

// Own text of an element rewritten once on the move (a tombstone is history, not a law — federal step 612).
const OWN_REWRITE = [
  ['🪦 «Thinking never goes to OpenAI» (owner 2026-09-09) — lifted by the owner\n  2026-10-26 (node step 597-2), his words:',
    'Thinking goes to OpenAI (the owner\n  2026-10-26, node step 597-2, lifting his rule of 2026-09-09), his words:'],
]
// Skills an element has: its own in groups and vendored at the root.
function skillsOf(dir) {
  const root = path.join(dir, '.claude', 'skills')
  const out = new Set()
  if (!existsSync(root)) return out
  for (const a of readdirSync(root)) {
    if (existsSync(path.join(root, a, 'SKILL.md'))) out.add(a)
    const g = path.join(root, a, 'skills')
    if (existsSync(g)) for (const s of readdirSync(g)) if (existsSync(path.join(g, s, 'SKILL.md'))) out.add(s)
  }
  return out
}
// The common part names only the skills this element has: a missing one leaves the table row and the prose «(skill …)».
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
function onlyOwnSkills(text, have) {
  const dropped = []
  const named = new Set([...text.matchAll(/`([a-z0-9]+(?:-[a-z0-9]+)+)`/g)].map((m) => m[1]))
  for (const n of named) {
    if (have.has(n)) continue
    const row = new RegExp(', `' + esc(n) + '`( \\([^)]*\\))?(?=[,| ])', 'g')
    const prose = new RegExp(' \\(skill `' + esc(n) + '`\\)', 'g')
    const before = text
    text = text.split('\n').map((l) => (l.startsWith('| ') ? l.replace(row, '') : l)).join('\n').replace(prose, '')
    if (text !== before) dropped.push(n)
  }
  return { text, dropped }
}

const lf = (s) => s.replace(/\r\n/g, '\n')
const arg =(k) => { const i = process.argv.indexOf(k); return i >= 0 ? process.argv[i + 1] : null }

// need = false: the element has no `npm run need` yet (federal step 609) — the lines tagged R stand instead of the lines tagged Y.
export function render(variant, own = null, need = true) {
  const tags = need ? TAGS[variant] : [...TAGS[variant].filter((t) => t !== 'Y'), 'R']
  const out = []
  for (const line of SRC.split('\n')) {
    const m = /^@([A-Z])(.*)$/.exec(line)
    if (!m) { out.push(line); continue }
    if (m[1] === 'T' && own !== null) continue
    if (tags.includes(m[1])) out.push(m[2])
  }
  let text = out.join('\n')
  if (own !== null) text = text.replace('## 11. This element\n\n', `## 11. This element\n\n${own.trim()}\n\n`)
  return text.replace(/\n{3,}/g, '\n\n').trimEnd() + '\n'
}

// The element's own sections: every `## ` block of its CLAUDE.md that is not one of the old (or new) common headings; demoted to `###`.
export function ownOf(text) {
  text = lf(text)
  const blocks = text.split(/\n(?=## )/)
  const known = (h) => [...OLD_HEADINGS, ...NEW_HEADINGS].some((k) => h.startsWith(k))
  const own = []
  for (const b of blocks) {
    if (!b.startsWith('## ')) continue
    const h = b.slice(3, b.indexOf('\n') < 0 ? undefined : b.indexOf('\n')).trim()
    if (h.startsWith('11. This element')) { own.push(b.split('\n').slice(1).join('\n').trim()); continue }
    if (known(h)) continue
    own.push(b.replace(/^## /, '### ').replace(/<!-- PROOF[^\n]*-->\n?/g, '').trim())
  }
  return own.filter((s) => s && !s.startsWith('(Nothing yet.')).join('\n\n')
}

export function variantOf(dir) {
  if (path.basename(dir) === 'root') return 'root'
  const t = existsSync(path.join(dir, 'CLAUDE.md')) ? readFileSync(path.join(dir, 'CLAUDE.md'), 'utf8') : ''
  if (/You are a custom element/.test(t)) return 'custom'
  if (/You are a native element/.test(t)) return 'native'
  const props = path.join(dir, 'OWN-SERVICE-PROPS', 'OWN-SERVICE-PROPS.json')
  const type = existsSync(props) ? JSON.parse(readFileSync(props, 'utf8')).elementType : null
  return type === 'native' ? 'native' : 'custom'
}

const names = (text) => new Set([...lf(text).matchAll(/`([^`\n]+)`/g)].map((m) => m[1]))
const modeTexts = (dir) => {
  const d = path.join(dir, '.claude', 'modes')
  return existsSync(d) ? readdirSync(d).map((f) => readFileSync(path.join(d, f), 'utf8')).join('\n') : ''
}
// Names the old text had that the new one drops on purpose, with the reason (613-description.md, «what did not go in»).
const DROPPED = new Set([])

function coverage() {
  let missing = 0
  for (const [variant, dir] of Object.entries(TEMPLATES)) {
    const old = execSync('git show HEAD:CLAUDE.md', { cwd: dir, encoding: 'utf8' })
    let fresh = render(variant)
    if (arg('--drop')) fresh = fresh.split('`' + arg('--drop') + '`').join('')
    const have = lf(fresh) + '\n' + modeTexts(dir)
    const lost = [...names(old)].filter((n) => !DROPPED.has(n) && !have.includes('`' + n + '`'))
    console.log(`${variant}: names in the old CLAUDE.md ${names(old).size}, lost ${lost.length}${lost.length ? ' — ' + lost.join(' · ') : ''}`)
    console.log(`${variant}: ${lf(old).length} → ${fresh.length} characters`)
    missing += lost.length
  }
  console.log(missing ? '===COVERAGE_FAIL===' : '===COVERAGE_OK===')
  process.exitCode = missing ? 1 : 0
}

function patchRepo(dir, text, seal, dry) {
  const changed = []
  const put = (rel, content) => {
    const p = path.join(dir, rel)
    const before = existsSync(p) ? readFileSync(p, 'utf8') : null
    if (before !== null && lf(before) === lf(content)) return
    changed.push(rel)
    if (!dry) writeFileSync(p, content)
  }
  put('CLAUDE.md', text)
  put('scripts/check-instruction.mjs', readFileSync(path.join(here, 'check-instruction.mjs'), 'utf8'))
  put('scripts/instruction.seal', seal)
  // The modes guard knows the new headings of CLAUDE.md.
  const modes = path.join(dir, 'scripts', 'check-instruction-modes.mjs')
  if (existsSync(modes)) {
    const t = readFileSync(modes, 'utf8')
    const line = `  'CLAUDE.md': [${NEW_HEADINGS.filter((h) => !h.startsWith('11.')).map((h) => `'${h}'`).join(', ')}],`
    put('scripts/check-instruction-modes.mjs', t.replace(/^ {2}'CLAUDE\.md': \[[^\n]*\],$/m, line))
  }
  // package.json: the script and the prebuild step.
  const pkgPath = path.join(dir, 'package.json')
  let pkg = readFileSync(pkgPath, 'utf8')
  if (!pkg.includes('"check:instruction"')) pkg = pkg.replace(/("scripts"\s*:\s*\{\s*\n)(\s*)/, `$1$2"check:instruction": "node scripts/check-instruction.mjs",\n$2`)
  if (!/prebuild"[^\n]*check-instruction\.mjs/.test(pkg)) pkg = pkg.replace(/("prebuild"\s*:\s*"[^"\n]*)"/, '$1 && node scripts/check-instruction.mjs"')
  put('package.json', pkg)
  // References into CLAUDE.md by section name, and the review skill's line about section 12.
  const files = execSync('git ls-files "*.md" "*.mjs" "*.cjs" "*.ts"', { cwd: dir, encoding: 'utf8' }).split('\n').filter(Boolean)
    .filter((f) => !f.startsWith('node_modules/') && f !== 'CLAUDE.md' && !f.startsWith('study/'))
  for (const f of files) {
    const p = path.join(dir, f)
    if (!existsSync(p) || statSync(p).size > 400000) continue
    let t = readFileSync(p, 'utf8')
    const before = t
    for (const [a, b] of REFS) t = t.split(a).join(b)
    if (f.endsWith('self-review/SKILL.md') && !t.includes('section 12 «Evolution»')) t = t.replace(SELF_REVIEW_OLD, SELF_REVIEW_NEW)
    if (t !== before) put(f, t)
  }
  return changed
}

function sealOf(text) {
  const lines = lf(text).split('\n')
  const own = lines.findIndex((l) => l.startsWith('## 11. This element'))
  const evo = lines.findIndex((l) => l.startsWith('## 12. Evolution'))
  const at = lines.findIndex((l, i) => i > evo && l.trim() === 'Entries:')
  const fixed = [...lines.slice(0, own), ...lines.slice(evo, at + 1)].join('\n')
  return execSync('node -e "process.stdout.write(require(\'crypto\').createHash(\'sha256\').update(require(\'fs\').readFileSync(0)).digest(\'hex\'))"', { input: fixed, encoding: 'utf8' }) + '\n'
}

// The command line runs only when this file is started itself — verify-elements.mjs imports ownOf from it.
const cmd = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url) ? process.argv[2] : 'imported'
if (cmd === 'imported') { /* used as a module */ }
else if (cmd === 'render') process.stdout.write(render(process.argv[3]))
else if (cmd === 'coverage') coverage()
else if (cmd === 'templates') {
  for (const [variant, dir] of Object.entries(TEMPLATES)) {
    const text = render(variant)
    console.log(`${variant}: ${patchRepo(dir, text, sealOf(text), process.argv.includes('--dry')).join(', ') || 'nothing to change'}`)
  }
} else if (cmd === 'element') {
  const dir = path.resolve(process.argv[3])
  const variant = variantOf(dir)
  let own = ownOf(readFileSync(path.join(dir, 'CLAUDE.md'), 'utf8'))
  for (const [a, b] of OWN_REWRITE) own = own.split(a).join(b)
  const need = existsSync(path.join(dir, '.claude', 'skills', 'own-service-props-skills', 'skills', 'need-capability', 'SKILL.md'))
  const fit = onlyOwnSkills(render(variant, own || '(Nothing yet. What only this element does, and the laws of it, are written here by its agent in the build process.)', need), skillsOf(dir))
  const changed = patchRepo(dir, fit.text, sealOf(fit.text), process.argv.includes('--dry'))
  console.log(`${path.basename(dir)} (${variant}${need ? '' : ', no need yet'}, own ${own.length} characters): ${changed.join(', ') || 'nothing to change'}`)
  if (fit.dropped.length) console.log(`  not in this element, left out: ${fit.dropped.join(', ')}`)
} else console.log('usage: render | coverage | templates | element <dir>')
