// npm run template -- <command> …
//
// Release the node's element templates and roll their files out to the elements — from the core (federal step 621-2, 2026-10-30). Until
// this step the federal agent did it from its own folder, with working clones and shell scripts; the owner: «проекты должны начать
// развивать себя сами и как минимум качество разработки должны быть как щас». The main agent's skill `release-template` says when.
//
//   clone <custom|native> [--install]   a working clone of the template in data/workshop/<repo> (outside the core's git), on main;
//                                       --install also runs npm ci (a release runs the template's whole prebuild, which needs it)
//   status <custom|native>              the workshop against the core's pin: branch, HEAD, the pinned tag, uncommitted files
//   release <custom|native> <vX.Y.Z> [--message "…"] [--dry]
//        every prebuild guard of the template one by one, after git add (guards read the index), then an annotated tag and main + tag
//        to GitHub with the node's token. An existing tag is never moved: a broken release gets the next patch.
//   pin <custom|native> <vX.Y.Z> [--dry]
//        the core's pin (WEB4-ITEMS-REGISTRY/item-template.json | native-template.json): the working file and one commit of that file
//        alone, through a separate index — someone's staged work and the node's state never ride along.
//   rollout <custom|native> <vX.Y.Z> <path…> [--elements a,b] [--skip a,b] [--keep-own-rows <old tag>] [--also <path,…>]
//           [--message "…"] [--dry]
//        copy the paths from the template's tag into every element of that kind (by the registry and the passport's elementType, or
//        --elements), run the element's dependency-free guards, commit ONLY those paths (the node's state stays uncommitted), tag the
//        next patch, push main + tag, then pin the new versions in the registry: the working lines and one commit of HEAD's file.
//        --keep-own-rows <old tag>: for a Markdown table file — the element keeps its own rows (those not in the template's file at
//        <old tag>); --also: files the element already changed itself that go into the same commit.
//
// Rights: a push needs the node's GitHub token (data/node/github/.env, GITHUB_TOKEN) with write access to the template's and the
// elements' repositories — the owner's node has it; elsewhere the push stops at the dry push with ===TEMPLATE_NO_RIGHT=== (the right of
// a key is proven only by a push). The token is never printed.
import { execFileSync, execSync } from 'node:child_process'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'

const ROOT = resolve(import.meta.dirname, '..')
const [cmd, kind, ...rest] = process.argv.slice(2)
const flag = (name) => { const i = rest.indexOf(name); return i >= 0 ? rest[i + 1] : null }
const has = (name) => rest.includes(name)
const positional = rest.filter((a, i) => !a.startsWith('--') && !(i > 0 && rest[i - 1].startsWith('--') && !['--dry', '--install'].includes(rest[i - 1])))
const DRY = has('--dry')
const KINDS = { custom: 'item-template.json', native: 'native-template.json' }
// Guards that need nothing but node itself: the element's own checks a rollout runs (the template's release runs its whole prebuild).
const ELEMENT_GUARDS = ['check-scripts-syntax', 'check-skill-process', 'check-instruction', 'check-instruction-skills', 'check-instruction-modes', 'check-dev-docs', 'check-architecture-rule']

const fail = (code, msg) => { console.log(`===TEMPLATE_${code}=== ${msg}`); process.exit(1) }
const readJson = (file, fallback) => { try { return JSON.parse(readFileSync(file, 'utf8').replace(/^﻿/, '')) } catch { return fallback } }
const git = (dir, argv, env) => execFileSync('git', ['-C', dir, ...argv], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true, env: env ? { ...process.env, ...env } : process.env }).trim()
const gitOk = (dir, argv) => { try { return git(dir, argv) } catch { return null } }
// A file's bytes as git keeps them — never trimmed (git() trims command output, which would eat a file's edges).
const gitFile = (dir, rev, path) => execFileSync('git', ['-C', dir, 'show', `${rev}:${path}`], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true })
const token = () => (readFileSync(join(ROOT, 'data', 'node', 'github', '.env'), 'utf8').split(/\r?\n/).find((l) => l.startsWith('GITHUB_TOKEN=')) ?? '').slice('GITHUB_TOKEN='.length).trim()
const mask = (text, t) => (t ? String(text).split(t).join('***') : String(text))
const authUrl = (repo, t) => repo.replace(/^https:\/\/(?:[^@/]+@)?github\.com\//, `https://x-access-token:${t}@github.com/`)
const nextPatch = (v) => { const m = /^v(\d+)\.(\d+)\.(\d+)$/.exec(v); return m ? `v${m[1]}.${m[2]}.${Number(m[3]) + 1}` : null }

if (!cmd || !KINDS[kind]) fail('USAGE', 'npm run template -- clone|status|release|pin|rollout <custom|native> …')
const pinFile = join(ROOT, 'WEB4-ITEMS-REGISTRY', KINDS[kind])
const pin = readJson(pinFile, null)
if (!pin) fail('FAIL', `no pin file ${pinFile}`)
const shop = join(ROOT, 'data', 'workshop', pin.from)

// Push main + a tag with the node's token; a dry push first proves the right.
function push(dir, repo, tag) {
  const t = token()
  if (!t) fail('NO_RIGHT', 'no GITHUB_TOKEN in data/node/github/.env')
  const url = authUrl(repo, t)
  try { git(dir, ['-c', 'credential.helper=', 'push', '--dry-run', '-q', url, 'HEAD:refs/heads/main']) } catch (e) { fail('NO_RIGHT', mask(e.stderr || e.message, t).trim().split('\n').pop()) }
  try { git(dir, ['-c', 'credential.helper=', 'push', '-q', url, 'HEAD:refs/heads/main', `refs/tags/${tag}`]) } catch (e) { fail('PUSH_FAIL', mask(e.stderr || e.message, t).trim().split('\n').pop()) }
  const remote = mask(git(ROOT, ['-c', 'credential.helper=', 'ls-remote', url, `refs/tags/${tag}^{}`, 'refs/heads/main']), t)
  const tagCommit = (remote.split('\n').find((l) => l.endsWith(`${tag}^{}`)) ?? '').split(/\s+/)[0]
  if (tagCommit !== git(dir, ['rev-parse', 'HEAD'])) fail('PUSH_FAIL', `tag ${tag} on GitHub is not HEAD`)
}

// Commit ONE file of the core through a separate index: HEAD's tree plus this blob — nothing else staged rides along.
function commitOne(rel, content, message) {
  if (gitOk(ROOT, ['symbolic-ref', 'HEAD']) !== 'refs/heads/main') fail('FAIL', 'the core is not on main')
  const blob = execFileSync('git', ['-C', ROOT, 'hash-object', '-w', '--stdin', '--path', rel], { input: content, encoding: 'utf8', windowsHide: true }).trim()
  const tmp = mkdtempSync(join(tmpdir(), 'pin-'))
  const env = { GIT_INDEX_FILE: join(tmp, 'index') }
  git(ROOT, ['read-tree', 'HEAD'], env)
  git(ROOT, ['update-index', '--cacheinfo', `100644,${blob},${rel}`], env)
  const tree = git(ROOT, ['write-tree'], env)
  rmSync(tmp, { recursive: true, force: true })
  const head = git(ROOT, ['rev-parse', 'HEAD'])
  const commit = git(ROOT, ['commit-tree', tree, '-p', head, '-m', message])
  git(ROOT, ['update-ref', 'refs/heads/main', commit, head])
  git(ROOT, ['update-index', '--cacheinfo', `100644,${blob},${rel}`]) // the shared index follows HEAD for this one path only
  return commit
}

function runGuards(dir, names) {
  for (const g of names) {
    console.log(`  … ${g}`)
    try { execSync(g, { cwd: dir, stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true, shell: true, encoding: 'utf8' }) } catch (e) {
      const tail = String(e.stdout || '') + String(e.stderr || '')
      return `${g}: ${tail.trim().split('\n').slice(-3).join(' | ').slice(0, 300)}`
    }
  }
  return null
}

if (cmd === 'clone') {
  if (!existsSync(join(shop, '.git'))) {
    mkdirSync(join(ROOT, 'data', 'workshop'), { recursive: true })
    execFileSync('git', ['clone', '--quiet', pin.repo, shop], { stdio: 'inherit', windowsHide: true })
  } else git(shop, ['fetch', '--quiet', '--tags', 'origin'])
  if (has('--install')) execSync('npm ci --no-audit --no-fund', { cwd: shop, stdio: 'inherit', windowsHide: true, shell: true })
  console.log(`===TEMPLATE_CLONED=== ${kind} ${shop} at ${git(shop, ['describe', '--tags', '--always'])} (pin ${pin.version})`)
  process.exit(0)
}

if (!existsSync(join(shop, '.git')) && cmd !== 'pin') fail('NO_WORKSHOP', `no working clone — npm run template -- clone ${kind}`)

if (cmd === 'status') {
  const branch = git(shop, ['rev-parse', '--abbrev-ref', 'HEAD'])
  const dirty = git(shop, ['status', '--porcelain']).split('\n').filter(Boolean)
  const pinned = gitOk(shop, ['rev-parse', `${pin.version}^{commit}`])
  const ahead = pinned ? git(shop, ['rev-list', '--count', `${pin.version}..HEAD`]) : '?'
  console.log(`${kind}: ${shop}\n  branch ${branch} · HEAD ${git(shop, ['describe', '--tags', '--always'])} · pin ${pin.version} · commits after the pin: ${ahead}`)
  console.log(`  uncommitted: ${dirty.length ? dirty.join(', ') : 'none'} · node_modules: ${existsSync(join(shop, 'node_modules')) ? 'yes' : 'no (clone --install)'}`)
  process.exit(0)
}

if (cmd === 'release') {
  const version = positional[0]
  if (!/^v\d+\.\d+\.\d+$/.test(version ?? '')) fail('USAGE', 'release <custom|native> <vX.Y.Z> [--message "…"] [--dry]')
  if (git(shop, ['rev-parse', '--abbrev-ref', 'HEAD']) !== 'main') fail('FAIL', 'the workshop is not on main')
  // Content against HEAD after git add — not `git status`: under core.autocrlf a file rewritten with the same text but other line
  // endings shows «M» while nothing changed (measured on lib/aio/llms-extra.generated.json, 621-3).
  const uncommitted = () => { git(shop, ['add', '-A']); return git(shop, ['diff', '--cached', '--name-only', 'HEAD']).split('\n').filter(Boolean) }
  const dirty = uncommitted()
  if (dirty.length) fail('FAIL', `commit or drop first: ${dirty.join(', ')}`)
  if (gitOk(shop, ['rev-parse', '-q', '--verify', `refs/tags/${version}`])) fail('FAIL', `tag ${version} exists — a tag is never moved; take the next patch`)
  if (gitOk(shop, ['ls-remote', '--tags', 'origin', `refs/tags/${version}`])) fail('FAIL', `tag ${version} is on GitHub already`)
  git(shop, ['fetch', '--quiet', 'origin', 'main'])
  if (gitOk(shop, ['merge-base', '--is-ancestor', 'origin/main', 'HEAD']) === null) fail('FAIL', 'GitHub main has commits this clone does not — pull first')
  if (!existsSync(join(shop, 'node_modules'))) fail('FAIL', `no node_modules — npm run template -- clone ${kind} --install (a release runs the whole prebuild)`)
  const guards = (readJson(join(shop, 'package.json'), {}).scripts?.prebuild ?? '').split('&&').map((s) => s.trim()).filter(Boolean)
  console.log(`release ${kind} ${version}: ${guards.length} prebuild guard(s), one by one`)
  const broke = runGuards(shop, guards)
  if (broke) fail('FAIL', `guard ${broke}`)
  // A generating step of prebuild (a tree snapshot, a map) that changed a file means the commit is stale: the tag would not be what was checked.
  const after = uncommitted()
  if (after.length) fail('FAIL', `prebuild changed files — commit them and release again: ${after.join(', ')}`)
  if (DRY) { console.log(`===TEMPLATE_DRY_OK=== ${kind} ${version}: every guard is green; nothing tagged or pushed`); process.exit(0) }
  git(shop, ['tag', '-a', version, '-m', `${version}: ${flag('--message') ?? 'template release'}`])
  push(shop, pin.repo, version)
  console.log(`===TEMPLATE_RELEASED=== ${kind} ${version} ${git(shop, ['rev-parse', '--short', 'HEAD'])} — pin it: npm run template -- pin ${kind} ${version}`)
  process.exit(0)
}

if (cmd === 'pin') {
  const version = positional[0]
  if (!/^v\d+\.\d+\.\d+$/.test(version ?? '')) fail('USAGE', 'pin <custom|native> <vX.Y.Z> [--dry]')
  if (pin.version === version) { console.log(`===TEMPLATE_PINNED=== ${kind} already ${version}`); process.exit(0) }
  const rel = `WEB4-ITEMS-REGISTRY/${KINDS[kind]}`
  const headText = git(ROOT, ['show', `HEAD:${rel}`])
  const next = JSON.stringify({ ...JSON.parse(headText), version }, null, 2) + '\n'
  if (DRY) { console.log(`===TEMPLATE_DRY_OK=== would pin ${kind} ${pin.version} → ${version}: one file (${rel}) in one commit`); process.exit(0) }
  writeFileSync(pinFile, next)
  const commit = commitOne(rel, next, `Pin the ${kind} element template at ${version} (npm run template -- pin)`)
  console.log(`===TEMPLATE_PINNED=== ${kind} ${pin.version} → ${version} in ${commit.slice(0, 7)} — push the core: git push origin main`)
  process.exit(0)
}

if (cmd === 'rollout') {
  const [version, ...paths] = positional
  if (!/^v\d+\.\d+\.\d+$/.test(version ?? '') || !paths.length) fail('USAGE', 'rollout <custom|native> <vX.Y.Z> <path…> [--elements a,b] [--keep-own-rows <old tag>] [--also a,b] [--message "…"] [--dry]')
  if (!gitOk(shop, ['rev-parse', `${version}^{commit}`])) fail('FAIL', `the workshop has no tag ${version} — npm run template -- clone ${kind}`)
  const keepFrom = flag('--keep-own-rows')
  const also = (flag('--also') ?? '').split(',').map((s) => s.trim()).filter(Boolean)
  const only = flag('--elements') ? new Set(flag('--elements').split(',').map((s) => s.trim())) : null
  const skip = new Set((flag('--skip') ?? '').split(',').map((s) => s.trim()).filter(Boolean))
  const message = flag('--message') ?? `files of the ${kind} template ${version}`
  const registryRel = 'WEB4-ITEMS-REGISTRY/web4-items.json'
  const registry = readJson(join(ROOT, registryRel), { services: [] }).services ?? []
  const want = kind === 'native' ? 'native' : 'custom'
  const rows = (text) => text.replace(/\r\n/g, '\n').split('\n').filter((l) => /^\|/.test(l))
  const pins = []
  for (const s of registry) {
    if (skip.has(s.id) || (only && !only.has(s.id))) continue
    const dir = join(ROOT, 'WEB4-ITEMS', s.kind === 'core' ? 'core' : 'user', s.address ?? s.id)
    if (!existsSync(join(dir, '.git'))) continue
    const type = readJson(join(dir, 'OWN-SERVICE-PROPS', 'OWN-SERVICE-PROPS.json'), {}).elementType ?? 'custom'
    if (!only && type !== want) continue
    const at = git(dir, ['describe', '--tags', '--always'])
    if (at !== s.version) { console.log(`· ${s.id}: HEAD ${at} is not its pin ${s.version} — left alone`); continue }
    const changed = []
    for (const p of paths) {
      let next = gitFile(shop, version, p)
      const file = join(dir, p)
      const now = existsSync(file) ? readFileSync(file, 'utf8') : null
      if (keepFrom && now !== null && p.endsWith('.md')) {
        const inherited = new Set(rows(gitFile(shop, keepFrom, p)))
        const templateRows = new Set(rows(next))
        const own = rows(now).filter((r) => !inherited.has(r) && !templateRows.has(r))
        if (own.length) {
          const lines = next.replace(/\r\n/g, '\n').split('\n')
          const sep = lines.findIndex((l) => /^\|\s*-/.test(l))
          if (sep < 0) fail('FAIL', `${s.id}: ${p} of the template has no table to keep the element's ${own.length} own row(s)`)
          lines.splice(sep + 1, 0, ...own)
          next = lines.join('\n')
        }
      }
      if (now !== null && now.replace(/\r\n/g, '\n') === next.replace(/\r\n/g, '\n')) continue
      writeFileSync(file, now !== null && now.includes('\r\n') ? next.replace(/\r?\n/g, '\r\n') : next)
      changed.push(p)
    }
    const alsoChanged = also.filter((p) => git(dir, ['status', '--porcelain', '--', p]))
    const all = [...changed, ...alsoChanged]
    if (!all.length) { console.log(`· ${s.id} ${at}: already current`); continue }
    const restore = () => { if (changed.length) git(dir, ['checkout', 'HEAD', '--', ...changed]) }
    if (DRY) { restore(); console.log(`· ${s.id} ${at}: would change ${all.join(', ')}`); continue }
    git(dir, ['add', '--', ...all])
    const broke = runGuards(dir, ELEMENT_GUARDS.filter((g) => existsSync(join(dir, 'scripts', `${g}.mjs`))).map((g) => `node scripts/${g}.mjs`))
    if (broke) { git(dir, ['reset', '-q', '--', ...all]); restore(); fail('FAIL', `${s.id}: ${broke} — its files are back as they were`) }
    const tag = nextPatch(s.version)
    if (!tag || gitOk(dir, ['ls-remote', '--tags', 'origin', `refs/tags/${tag}`])) fail('FAIL', `${s.id}: no free next tag after ${s.version}`)
    git(dir, ['commit', '-q', '-m', `${message} (template ${kind} ${version})`, '--', ...all])
    git(dir, ['tag', '-a', tag, '-m', `${tag}: ${message}`])
    push(dir, s.repo, tag)
    pins.push([s.id, s.version, tag])
    console.log(`✓ ${s.id} ${s.version} → ${tag} (${all.join(', ')})`)
  }
  if (DRY) { console.log(`===TEMPLATE_DRY_OK=== rollout ${kind} ${version}: nothing written`); process.exit(0) }
  if (!pins.length) { console.log(`===TEMPLATE_ROLLOUT_OK=== nothing to change`); process.exit(0) }
  // Pins: the working registry (node state stays in it) and one commit of HEAD's registry with only the versions changed.
  const setVersions = (text) => { const j = JSON.parse(text.replace(/^﻿/, '')); for (const [id, , tag] of pins) { const e = j.services.find((x) => x.id === id); if (e) e.version = tag } return JSON.stringify(j, null, 2) + '\n' }
  writeFileSync(join(ROOT, registryRel), setVersions(readFileSync(join(ROOT, registryRel), 'utf8')))
  const commit = commitOne(registryRel, setVersions(git(ROOT, ['show', `HEAD:${registryRel}`])), `Pin ${pins.map(([id, , t]) => `${id} ${t}`).join(', ')} (npm run template -- rollout ${kind} ${version})`)
  console.log(`===TEMPLATE_ROLLOUT_OK=== ${pins.length} element(s) released and pinned in ${commit.slice(0, 7)} — push the core: git push origin main`)
  process.exit(0)
}

fail('USAGE', 'npm run template -- clone|status|release|pin|rollout <custom|native> …')
