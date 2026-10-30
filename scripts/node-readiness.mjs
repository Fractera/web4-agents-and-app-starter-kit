// npm run node:readiness [-- --fresh <dir>] [--offline] [--skip <id,…>]
//
// Is every repository of this node ready to live on its own? (federal step 621-1, 2026-10-30; the owner: «Проверь все репозитории
// подготовлены к началу самостоятельной жизни что у них нету избыточных документов и в то же время присутствует все необходимые навыки
// инструкции в том числе и документы которые должны оставаться пустыми должны оставаться пустыми а которые должны иметь определённые
// полезные свойства имеют».) Read-only. One line per repository: the core, the custom and the native template (by the pins in
// WEB4-ITEMS-REGISTRY/), every element of the registry (its folder WEB4-ITEMS/<core|user>/<address>). Each «✗» names its reason.
//
//   --fresh <dir>  clone every repository from GitHub by its pin into <dir> and check the clones, not the working trees: a working tree
//                  shows what is here, a clone shows what a new node receives.
//   --offline      do not ask GitHub (no pin-on-GitHub check; templates only from data/workshop/).
//   --skip <ids>   leave these registry elements out; they are named in the output.
//   --only <names> check only these (core · a template's repository name · an element id); templates are still read as the yardstick.
//
// What a line checks. Every repository: its instruction seal (`node scripts/check-instruction.mjs` of that repository — node built-ins
// only, so it runs on a fresh clone without npm ci). Templates and elements: origin = the registry's repo; HEAD is the pinned tag and the
// tag on GitHub is the same commit; development-docs/ has the template's set — an extra file is excess unless the element's own
// development-docs/README.md names it (its own records under steps-done/, steps-new/, proofs/, reports/, pre-steps/ are its history);
// prebuild runs check-instruction and check-skill-process. Templates only: anti-patterns.md is the empty form (no table rows) and
// current-step.md has no active step — a template hands every new element empty records. The core: main = origin/main; no empty
// documents; ANTI-PATTERNS.md split by operating system (sections «All systems», «Windows», «macOS», «Linux»); the instruction does not
// point to the federal layer, which is no longer used.
import { execFileSync } from 'node:child_process'
import { existsSync, mkdtempSync, readFileSync, rmSync, statSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'

const ROOT = resolve(import.meta.dirname, '..')
const args = process.argv.slice(2)
const flag = (name) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : null }
const FRESH = flag('--fresh') ? resolve(flag('--fresh')) : null
const OFFLINE = args.includes('--offline')
const SKIP = new Set((flag('--skip') ?? '').split(',').map((s) => s.trim()).filter(Boolean))
const ONLY = flag('--only') ? new Set(flag('--only').split(',').map((s) => s.trim()).filter(Boolean)) : null
const wanted = (t) => !ONLY || ONLY.has(t.name)
const OWN_HISTORY = ['development-docs/steps-done/', 'development-docs/steps-new/', 'development-docs/proofs/', 'development-docs/reports/', 'development-docs/pre-steps/']
const OS_SECTIONS = ['All systems', 'Windows', 'macOS', 'Linux']
// A document that sends its reader into the federal folder of the old development machine: that folder is no longer used and is not on GitHub.
const TO_FEDERAL = /Documents[\\/]code\b|(?:^|[\s`'"(])\/?code\/development-docs\b/

const run = (cmd, argv, cwd) => execFileSync(cmd, argv, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true }).trim()
const git = (dir, argv) => { try { return run('git', ['-C', dir, ...argv]) } catch { return '' } }
const readJson = (file, fallback) => { try { return JSON.parse(readFileSync(file, 'utf8').replace(/^﻿/, '')) } catch { return fallback } }
const sameRepo = (a, b) => String(a).toLowerCase().replace(/\.git$/, '').replace(/\/$/, '') === String(b).toLowerCase().replace(/\.git$/, '').replace(/\/$/, '')
const tracked = (dir, path) => git(dir, ['ls-files', path]).split('\n').filter(Boolean)
const remoteTagCommit = (repo, tag) => {
  const out = git(ROOT, ['ls-remote', '--tags', repo, `refs/tags/${tag}`, `refs/tags/${tag}^{}`])
  const lines = out.split('\n').filter(Boolean).map((l) => l.split(/\s+/))
  return (lines.find(([, ref]) => ref.endsWith('^{}')) ?? lines[0] ?? [])[0] ?? null
}

// Targets: what the node is made of, from its own registry — no list written by hand.
const registry = readJson(join(ROOT, 'WEB4-ITEMS-REGISTRY', 'web4-items.json'), { services: [] }).services ?? []
const templates = ['item-template.json', 'native-template.json'].map((f) => readJson(join(ROOT, 'WEB4-ITEMS-REGISTRY', f), null)).filter(Boolean)
const targets = [{ name: 'core', kind: 'core', repo: git(ROOT, ['remote', 'get-url', 'origin']), pin: 'main', dir: ROOT }]
for (const t of templates) targets.push({ name: t.from, kind: 'template', repo: t.repo, pin: t.version, dir: join(ROOT, 'data', 'workshop', t.from) })
const skipped = []
for (const s of registry) {
  if (SKIP.has(s.id)) { skipped.push(s.id); continue }
  const folder = join(ROOT, 'WEB4-ITEMS', s.kind === 'core' ? 'core' : 'user', s.address ?? s.id)
  targets.push({ name: s.id, kind: 'element', repo: s.repo, pin: s.version, dir: folder })
}

// Where each repository is read from: a fresh clone (--fresh), the working tree, or — for a template without a workshop copy — a
// shallow clone of its pinned tag into a temporary folder.
let scratch = null
const cloneTo = (t, base) => {
  const dest = join(base, t.name)
  if (!existsSync(dest)) run('git', ['clone', '--quiet', '--depth', '1', ...(t.pin === 'main' ? [] : ['--branch', t.pin]), t.repo, dest], base)
  return dest
}
for (const t of targets) {
  if (!wanted(t) && t.kind !== 'template') continue
  if (FRESH) { t.dir = cloneTo(t, FRESH); t.fresh = true; continue }
  if (t.kind === 'template' && !existsSync(join(t.dir, '.git'))) {
    if (OFFLINE) { t.missing = 'no copy in data/workshop/ (--offline)'; continue }
    scratch ??= mkdtempSync(join(tmpdir(), 'node-readiness-'))
    t.dir = cloneTo(t, scratch); t.fresh = true
  }
}

// The template's document set — the yardstick for elements (native elements by the native template, the rest by the custom one).
const docSet = (t) => (t && !t.missing && existsSync(join(t.dir, '.git')) ? tracked(t.dir, 'development-docs') : null)
const customSet = docSet(targets.find((t) => t.kind === 'template' && /custom/.test(t.name)))
const nativeSet = docSet(targets.find((t) => t.kind === 'template' && /native/.test(t.name)))
const tableRows = (text) => text.split('\n').filter((l) => /^\|/.test(l) && !/^\|\s*-/.test(l)).length - (/^\|/m.test(text) ? 1 : 0)

const results = []
for (const t of targets) {
  if (!wanted(t)) continue
  const bad = [], info = []
  if (t.missing) { results.push({ t, bad: [t.missing], info }); continue }
  if (!existsSync(join(t.dir, '.git'))) { results.push({ t, bad: ['not a git repository here'], info }); continue }
  const origin = git(t.dir, ['remote', 'get-url', 'origin'])
  if (t.kind !== 'core' && !sameRepo(origin, t.repo)) bad.push(`origin ${origin || 'none'} is not the registry's ${t.repo}`)
  const head = git(t.dir, ['rev-parse', 'HEAD'])
  const at = git(t.dir, ['describe', '--tags', '--always'])
  if (t.kind === 'core') {
    if (!t.fresh && !OFFLINE) {
      const remoteMain = git(ROOT, ['ls-remote', t.repo, 'refs/heads/main']).split(/\s+/)[0]
      if (remoteMain !== git(t.dir, ['rev-parse', 'main'])) bad.push('local main is not origin/main')
    }
  } else {
    if (at !== t.pin) bad.push(`HEAD is ${at}, the pin is ${t.pin}`)
    if (!OFFLINE && !t.fresh) {
      const onGithub = remoteTagCommit(t.repo, t.pin)
      if (!onGithub) bad.push(`tag ${t.pin} is not on GitHub`)
      else if (onGithub !== head && at === t.pin) bad.push(`tag ${t.pin} on GitHub is another commit`)
    }
  }
  const dirty = git(t.dir, ['status', '--porcelain', '--untracked-files=no']).split('\n').filter(Boolean).length
  if (dirty && !t.fresh) info.push(`${dirty} changed tracked file(s) — node state or unsaved work`)

  // The instruction seal of this very repository.
  if (!existsSync(join(t.dir, 'scripts', 'check-instruction.mjs'))) bad.push('no scripts/check-instruction.mjs (instruction not sealed)')
  else {
    try { run(process.execPath, ['scripts/check-instruction.mjs'], t.dir) } catch (e) {
      const last = String(e.stdout || e.stderr || e.message).trim().split('\n').filter(Boolean).pop() ?? 'failed'
      bad.push(`instruction seal: ${last.slice(0, 140)}`)
    }
  }

  const docs = join(t.dir, 'development-docs')
  const texts = ['CLAUDE.md', 'README.md', ...tracked(t.dir, 'development-docs').filter((f) => f.endsWith('.md'))]
  const pointing = texts.filter((f) => existsSync(join(t.dir, f)) && TO_FEDERAL.test(readFileSync(join(t.dir, f), 'utf8')))
  if (pointing.length) bad.push(`document(s) point to the federal folder /code: ${pointing.join(', ')}`)
  if (t.kind === 'core') {
    for (const f of tracked(t.dir, 'development-docs')) {
      if (f.endsWith('.gitkeep')) continue
      if (existsSync(join(t.dir, f)) && statSync(join(t.dir, f)).size === 0) bad.push(`empty document ${f}`)
    }
    const ap = existsSync(join(docs, 'ANTI-PATTERNS.md')) ? readFileSync(join(docs, 'ANTI-PATTERNS.md'), 'utf8') : ''
    const missingOs = OS_SECTIONS.filter((s) => !new RegExp(`^## ${s}\\b`, 'm').test(ap))
    if (missingOs.length) bad.push(`ANTI-PATTERNS.md has no section(s) ${missingOs.join(', ')}`)
    else info.push(`ANTI-PATTERNS.md ${Math.round(Buffer.byteLength(ap) / 1024)} KB by operating system`)
    const claude = existsSync(join(t.dir, 'CLAUDE.md')) ? readFileSync(join(t.dir, 'CLAUDE.md'), 'utf8') : ''
    if (/federal|inventory of step 608|Documents[\\/]code/i.test(claude)) bad.push('CLAUDE.md still points to the federal layer')
    for (const p of ['development-steps/current-steps.md', 'development-steps/new-steps', 'development-steps/completed-steps']) {
      if (!existsSync(join(docs, p))) bad.push(`no development-docs/${p}`)
    }
  } else {
    const isNative = readJson(join(t.dir, 'OWN-SERVICE-PROPS', 'OWN-SERVICE-PROPS.json'), {}).elementType === 'native' || (t.kind === 'template' && /native/.test(t.name))
    const yard = isNative ? nativeSet : customSet
    const have = tracked(t.dir, 'development-docs')
    if (!yard) info.push('document set not compared: no template copy')
    else {
      const index = existsSync(join(docs, 'README.md')) ? readFileSync(join(docs, 'README.md'), 'utf8') : ''
      const extra = have.filter((f) => !yard.includes(f) && !OWN_HISTORY.some((p) => f.startsWith(p)) && !index.includes(f.replace('development-docs/', '')))
      const missing = yard.filter((f) => !have.includes(f))
      if (extra.length) bad.push(`excess document(s) the index does not name: ${extra.join(', ')}`)
      if (missing.length) bad.push(`missing document(s): ${missing.join(', ')}`)
      const own = have.filter((f) => OWN_HISTORY.some((p) => f.startsWith(p)) && !f.endsWith('.gitkeep') && !f.endsWith('README.md'))
      if (own.length) info.push(`${own.length} own record(s)`)
    }
    const ap = existsSync(join(docs, 'anti-patterns.md')) ? readFileSync(join(docs, 'anti-patterns.md'), 'utf8').replace(/\r\n/g, '\n') : null
    if (ap === null) bad.push('no development-docs/anti-patterns.md')
    else if (t.kind === 'template' && tableRows(ap) > 0) bad.push(`anti-patterns.md has ${tableRows(ap)} row(s) — a template hands out the empty form`)
    else if (t.kind === 'element' && tableRows(ap) > 0) info.push(`anti-patterns: ${tableRows(ap)} row(s)`)
    if (t.kind === 'template') {
      const cur = existsSync(join(docs, 'current-step.md')) ? readFileSync(join(docs, 'current-step.md'), 'utf8') : ''
      if (!/\*\*Active step:\*\* none\./.test(cur)) bad.push('current-step.md is not the empty form (Active step: none.)')
    }
    const prebuild = readJson(join(t.dir, 'package.json'), {}).scripts?.prebuild ?? ''
    for (const g of ['check-instruction', 'check-skill-process']) if (!prebuild.includes(g)) bad.push(`prebuild does not run ${g}`)
  }
  results.push({ t, bad, info, at })
}

for (const { t, bad, info, at } of results) {
  const where = t.kind === 'core' ? 'core' : `${t.kind} ${t.name}`
  const tag = at ? ` ${at}` : ''
  console.log(`${bad.length ? '✗' : '✓'} ${where}${tag}${bad.length ? ' — ' + bad.join('; ') : ''}${info.length ? `  (${info.join('; ')})` : ''}`)
}
if (skipped.length) console.log(`· skipped by --skip: ${skipped.join(', ')}`)
if (scratch) {
  try { rmSync(scratch, { recursive: true, force: true }) } catch { /* a temporary folder; the system cleans it */ }
  console.log('· templates read from shallow clones of their pinned tags (temporary, removed)')
}
const failed = results.filter((r) => r.bad.length).length
console.log(failed ? `===READINESS_FAIL=== ${failed} of ${results.length}` : `===READINESS_OK=== ${results.length}`)
process.exit(failed ? 1 : 0)
