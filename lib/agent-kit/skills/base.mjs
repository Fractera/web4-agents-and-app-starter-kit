// THE SKILLS BASE SHIPPED WITH EVERY CLONE (node step 598). The owner, 2026-10-25: «вместе с каждым новым клонам нашего проекта каждому
// архитектору предоставлять огромный массив навыков которые я хочу чтобы мы один раз загрузили в граф преобразовали как векторы и
// отправляли каждому пользователю». The base lives in this repository: `base/<source>/<skill>/` and `base/manifest.json`.
// 🔒 A skill folder travels whole with its LICENSE, NOTICE and SOURCE.md: MIT and Apache-2.0 ask for the notice in every copy, and a graph
// made from a text is still a copy of it. Only the text the converter reads goes in (SKILL.md, references/ or reference/ *.md) — never a
// skill's scripts or assets.
// 🔒 Only what may be handed out: a LICENSE beside the skill and a licence from the list below; anything else stays out of the base.
import { createHash } from 'node:crypto'
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { basename, dirname, join, relative, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

export const BASE = join(dirname(fileURLToPath(import.meta.url)), 'base')
export const MANIFEST = join(BASE, 'manifest.json')
export const LICENSES = ['MIT', 'Apache-2.0', 'BSD-2-Clause', 'BSD-3-Clause', 'ISC']

const SOURCE_SHAPE = /^[a-z0-9][a-z0-9-]{0,39}$/
// The files a base folder may hold, as paths inside the skill folder.
const KEEP = (rel) =>
  rel === 'SKILL.md' || rel === 'SOURCE.md' || /^LICEN[CS]E(\.(md|txt))?$/i.test(rel) || /^NOTICE(\.(md|txt))?$/i.test(rel) || /^(references|reference)\/[^/]+\.md$/.test(rel)

const walk = (dir) => readdirSync(dir).flatMap((n) => (statSync(join(dir, n)).isDirectory() ? walk(join(dir, n)) : [join(dir, n)]))
const relOf = (dir, file) => relative(dir, file).split(sep).join('/')
export const shaOf = (file) => createHash('sha256').update(readFileSync(file, 'utf8').replace(/\r\n/g, '\n')).digest('hex').slice(0, 16)

function skillNameOf(dir) {
  const m = readFileSync(join(dir, 'SKILL.md'), 'utf8').match(/^---\r?\n[\s\S]*?^name:\s*["']?([^"'\r\n]+)["']?\s*$/m)
  return (m ? m[1].trim() : basename(dir)).replace(/[^a-z0-9-]/gi, '-').toLowerCase()
}

export function readManifest() {
  try {
    const j = JSON.parse(readFileSync(MANIFEST, 'utf8'))
    return Array.isArray(j?.skills) ? j.skills : []
  } catch {
    return []
  }
}

function writeManifest(skills) {
  mkdirSync(BASE, { recursive: true })
  const sorted = [...skills].sort((a, b) => `${a.source}:${a.skill}`.localeCompare(`${b.source}:${b.skill}`))
  writeFileSync(MANIFEST, `${JSON.stringify({ about: 'The skills base shipped with every clone of the node (node step 598): npm run skills -- base-sync | base-check | base-load.', skills: sorted }, null, 2)}\n`)
}

/** Copy one skill folder into the base (only the files a base may hold) and record it in the manifest. → the manifest entry. */
export function syncSkill(dir, { source, license, url = '', version = '' }) {
  if (!SOURCE_SHAPE.test(String(source ?? ''))) throw new Error(`--source «${source}» — lowercase latin, digits, a hyphen`)
  if (!LICENSES.includes(String(license ?? ''))) throw new Error(`--license «${license}» — one of ${LICENSES.join(', ')}`)
  if (!existsSync(join(dir, 'SKILL.md'))) throw new Error(`${dir}: no SKILL.md`)
  const files = walk(dir).map((f) => relOf(dir, f)).filter(KEEP).sort()
  if (!files.some((f) => /^LICEN[CS]E/i.test(f))) throw new Error(`${dir}: no LICENSE beside the skill — it may not be handed out`)
  const skill = skillNameOf(dir)
  const to = join(BASE, source, skill)
  rmSync(to, { recursive: true, force: true })
  for (const f of files) {
    mkdirSync(dirname(join(to, f)), { recursive: true })
    copyFileSync(join(dir, f), join(to, f))
  }
  const entry = { source, skill, license, url, version, sha: shaOf(join(to, 'SKILL.md')), files }
  writeManifest([...readManifest().filter((s) => !(s.source === source && s.skill === skill)), entry])
  return entry
}

/** Problems of the base, [] when it is good: a folder for every entry and an entry for every folder, a licence from the list with its
 * LICENSE file, only the files a base may hold, the fingerprint of SKILL.md. */
export function checkBase(base = BASE) {
  const problems = []
  let skills = []
  try { skills = JSON.parse(readFileSync(join(base, 'manifest.json'), 'utf8')).skills ?? [] } catch { return ['no manifest.json'] }
  const seen = new Set()
  for (const s of skills) {
    const at = `${s.source}:${s.skill}`
    seen.add(at)
    const dir = join(base, s.source ?? '', s.skill ?? '')
    if (!existsSync(join(dir, 'SKILL.md'))) { problems.push(`${at}: no folder with SKILL.md`); continue }
    if (!LICENSES.includes(s.license)) problems.push(`${at}: licence «${s.license}» is not one that may be handed out`)
    const files = walk(dir).map((f) => relOf(dir, f))
    if (!files.some((f) => /^LICEN[CS]E/i.test(f))) problems.push(`${at}: no LICENSE file — it may not be handed out`)
    for (const f of files.filter((f) => !KEEP(f))) problems.push(`${at}: ${f} — a base holds only the skill's text, its LICENSE, NOTICE and SOURCE.md`)
    if (shaOf(join(dir, 'SKILL.md')) !== s.sha) problems.push(`${at}: SKILL.md changed without base-sync (fingerprint)`)
  }
  for (const source of existsSync(base) ? readdirSync(base).filter((n) => statSync(join(base, n)).isDirectory()) : []) {
    for (const skill of readdirSync(join(base, source)).filter((n) => statSync(join(base, source, n)).isDirectory())) {
      if (!seen.has(`${source}:${skill}`)) problems.push(`${source}:${skill}: a folder the manifest does not name`)
    }
  }
  if (!skills.length) problems.push('the manifest names no skill')
  return problems
}
