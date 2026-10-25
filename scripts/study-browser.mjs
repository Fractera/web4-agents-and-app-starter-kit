// node scripts/study-browser.mjs start <url> [--site <site> [--visible] [--budget N]] [--element <id>] · stop · status — the browser a
// study observes: ONE copy in the core, like REA itself (node step 594-2; before it lived in the element `reverse`, steps 563-2, 556-7).
//
// REA's own guide: «Start a separate browser profile with an explicit debugging port … REA does not launch, own, or terminate this
// browser» (docs/browser-observation.md), and «This feature is not a browser sandbox or network containment mechanism». So the node starts
// it and guards it: Chrome of this machine with NO window (--headless=new), its own profile, the debugging port on the loopback only
// (REA accepts http://127.0.0.1:<port>, never localhost). The person's profile, sign-ins and cookies are never used. One browser for the
// node at a time; it lives until `stop` — no timer stops it; the study pass ends with `stop`, and turning the element that started it off
// stops it too (scripts/element-power.mjs). A scenario on someone else's site connects REA to THIS browser (connect mode); REA's own
// launch mode is for the person's own application only (594, decision of the plan).
// Its state: data/study/browser/state.json {pid, port, url, element, …}; a public profile in data/study/browser/profile.
// Every process: windowsHide (a window over the person's screen is not allowed); the environment without Next/core labels (law 280-6).
import { spawn, spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { createServer } from 'node:net'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

// The core's root from this file's place: an element calls this script from its own folder (594-3), and the test accounts' folders
// (lib/study/study.mjs) are counted from process.cwd() — so the script stands in the root before it reads them.
const CORE = resolve(dirname(fileURLToPath(import.meta.url)), '..')
process.chdir(CORE)
const { folderOf, stateOf } = await import('../lib/study/study.mjs')

const DIR = join(CORE, 'data', 'study', 'browser')
const PROFILE = join(DIR, 'profile')
const STATE = join(DIR, 'state.json')
const argv = process.argv.slice(2)
const [action, url] = argv
const opt = (name) => (argv.includes(name) ? argv[argv.indexOf(name) + 1] : null)
// 556-7: `--site <site>` — the profile of a test account the person confirmed (the core's `npm run study -- login`), with the guard that
// lets only reads through; `--visible` (556-8, mode B) — the person drives the window and the guard only writes; `--budget N` — pages.
const site = opt('--site')?.toLowerCase() ?? null
const visible = argv.includes('--visible')
const budget = opt('--budget')
const element = opt('--element')
const say = (m) => console.log(m)

function chromePath() {
  if (process.env.CHROME_PATH) return process.env.CHROME_PATH
  const candidates = process.platform === 'win32'
    ? [join(process.env.PROGRAMFILES || 'C:/Program Files', 'Google/Chrome/Application/chrome.exe'),
       join(process.env['PROGRAMFILES(X86)'] || 'C:/Program Files (x86)', 'Google/Chrome/Application/chrome.exe'),
       join(process.env.LOCALAPPDATA || '', 'Google/Chrome/Application/chrome.exe')]
    : process.platform === 'darwin'
      ? ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/Applications/Chromium.app/Contents/MacOS/Chromium']
      : ['/usr/bin/google-chrome', '/usr/bin/google-chrome-stable', '/usr/bin/chromium', '/usr/bin/chromium-browser']
  return candidates.find((p) => p && existsSync(p)) ?? null
}

function alive(pid) {
  if (!pid) return false
  try { process.kill(pid, 0); return true } catch (e) { return e.code === 'EPERM' }
}

const state = () => { try { return JSON.parse(readFileSync(STATE, 'utf8')) } catch { return null } }

function freePort() {
  return new Promise((ok, fail) => {
    const s = createServer()
    s.once('error', fail)
    s.listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => ok(p)) })
  })
}

async function waitDebugger(port) {
  for (let i = 0; i < 60; i++) {
    try { const r = await fetch(`http://127.0.0.1:${port}/json/version`); if (r.ok) return await r.json() } catch { /* not yet */ }
    await new Promise((r) => setTimeout(r, 250))
  }
  return null
}

function stopTree(pid) {
  if (process.platform === 'win32') spawnSync('taskkill', ['/PID', String(pid), '/T', '/F'], { windowsHide: true, stdio: 'ignore' })
  else { try { process.kill(-pid, 'SIGTERM') } catch { try { process.kill(pid, 'SIGTERM') } catch { /* gone */ } } }
}

if (action === 'start') {
  if (!/^https?:\/\//.test(url ?? '')) { say('usage: start <http(s) url> [--site <site> [--visible] [--budget N]] [--element <id>]'); process.exit(2) }
  const now = state()
  if (now && alive(now.pid)) { say(`===BROWSER_RUNNING=== pid ${now.pid}, debugging http://127.0.0.1:${now.port}${now.element ? ` (started for ${now.element})` : ''} — one study at a time: stop it first`); process.exit(0) }
  const chrome = chromePath()
  if (!chrome) { say('===BROWSER_FAILED=== no Chrome found on this machine (set CHROME_PATH)'); process.exit(3) }
  let profile = PROFILE
  let study = null
  if (visible && !site) { say('===BROWSER_FAILED=== --visible is for a test account (--site): the person drives the window'); process.exit(2) }
  if (site) {
    // Only a sign-in the node saw AFTER the person's consent counts — the same rule as the core's doors (lib/study/study.mjs, stateOf).
    const account = stateOf(site)
    if (!account?.session?.valid) { say(`===BROWSER_FAILED=== no test account the person confirmed for ${site}: the person signs in through the node first (npm run study -- login ${site})`); process.exit(4) }
    const bare = (h) => h.replace(/:\d+$/, '').replace(/^www\./, '')
    let host = ''
    try { host = new URL(url).host.toLowerCase() } catch { /* checked above */ }
    if (host !== site && bare(host) !== bare(site) && !bare(host).endsWith(`.${bare(site)}`)) {
      say(`===BROWSER_FAILED=== ${url} is not on ${site}: a test account is used only on its own site`); process.exit(4)
    }
    study = folderOf(site)
    profile = join(study, 'profile')
    rmSync(join(study, 'guard.json'), { force: true })
  }
  mkdirSync(profile, { recursive: true })
  mkdirSync(DIR, { recursive: true })
  const port = await freePort()
  const env = {}
  for (const [k, v] of Object.entries(process.env)) if (v !== undefined && !/^(__NEXT|NEXT_|AGI_)/.test(k)) env[k] = v
  // A test account's cookies were written by the login window: on macOS and Linux both programs keep them without the system store.
  const keychain = site ? (process.platform === 'darwin' ? ['--use-mock-keychain'] : process.platform === 'linux' ? ['--password-store=basic'] : []) : []
  // Lighter: no GPU, no background services, at most two renderer processes. Site isolation stays on — this browser opens other
  // people's sites. Measured 2026-10-22 on lagrix.dev: without these flags 9 processes and ~850 MB working set.
  // With a test account the first page is blank: the guard attaches first and opens the page itself, so no request passes unseen.
  const child = spawn(chrome, [...(visible ? [] : ['--headless=new']), `--remote-debugging-port=${port}`, '--remote-debugging-address=127.0.0.1',
    `--user-data-dir=${profile}`, '--no-first-run', '--no-default-browser-check', '--disable-extensions', '--window-size=1366,900',
    '--disable-gpu', '--disable-background-networking', '--disable-component-update', '--disable-default-apps', '--disable-sync',
    '--no-pings', '--mute-audio', '--renderer-process-limit=2', '--disable-features=Translate,OptimizationHints,MediaRouter', ...keychain,
    site ? 'about:blank' : url],
  // A visible window is the person's own window (mode B): windowsHide would hide Chrome itself, and Chrome has no console window.
  { detached: true, stdio: 'ignore', windowsHide: !visible, env })
  child.unref()
  const version = await waitDebugger(port)
  if (!version) { stopTree(child.pid); say('===BROWSER_FAILED=== Chrome did not open its debugging port'); process.exit(1) }
  let guardPid = null
  if (site) {
    const guard = spawn(process.execPath, [join(CORE, 'scripts', 'study-guard.mjs'), String(port), site, study, url,
      ...(visible ? ['--log-only'] : []), ...(budget ? ['--budget', budget] : [])], { detached: true, stdio: 'ignore', windowsHide: true, env })
    guard.unref()
    guardPid = guard.pid
    let ready = false
    for (let i = 0; i < 60 && !ready; i++) {
      await new Promise((r) => setTimeout(r, 250))
      try { ready = JSON.parse(readFileSync(join(study, 'guard.json'), 'utf8')).ready === true } catch { /* not yet */ }
    }
    if (!ready) { stopTree(child.pid); stopTree(guardPid); say('===BROWSER_FAILED=== the guard did not attach — the browser is stopped'); process.exit(1) }
  }
  writeFileSync(STATE, JSON.stringify({ pid: child.pid, port, url, profile, site, guardPid, element, mode: site ? (visible ? 'person drives' : 'agent reads') : 'public pages', startedAt: new Date().toISOString() }, null, 2) + '\n')
  say(`===BROWSER_STARTED=== pid ${child.pid} · debugging http://127.0.0.1:${port} · ${version.Browser} · ${visible ? 'a window on this computer' : 'no window'}` +
    (site ? ` · test account ${site}, guard ${visible ? 'writing only' : 'letting only reads through'}` : ''))
} else if (action === 'stop') {
  const now = state()
  if (!now) { say('===BROWSER_STOPPED=== nothing was running'); process.exit(0) }
  if (alive(now.pid)) stopTree(now.pid)
  if (now.guardPid && alive(now.guardPid)) stopTree(now.guardPid)
  rmSync(STATE, { force: true })
  say(`===BROWSER_STOPPED=== pid ${now.pid}`)
} else if (action === 'status') {
  const now = state()
  say(now && alive(now.pid) ? `===BROWSER_RUNNING=== pid ${now.pid} · debugging http://127.0.0.1:${now.port} · ${now.url} · ${now.mode ?? 'public pages'}${now.element ? ` · for ${now.element}` : ''}` : '===BROWSER_STOPPED===')
  if (now?.site) {
    // The guard's journal: what was blocked and why it stopped — method, host and path only.
    const lines = (() => { try { return readFileSync(join(folderOf(now.site), 'guard.jsonl'), 'utf8').trim().split('\n').map((l) => JSON.parse(l)) } catch { return [] } })()
    const blocked = lines.filter((l) => String(l.kind).startsWith('blocked'))
    const stop = lines.filter((l) => l.kind === 'stop').pop()
    say(`guard: ${blocked.length} blocked${stop ? ` · stopped: ${stop.reason}` : ''}`)
    for (const b of blocked.slice(-5)) say(`  ${b.kind} ${b.method} ${b.host}${b.path}`)
  }
} else {
  say('usage: node scripts/study-browser.mjs start <url> [--site <site> [--visible] [--budget N]] [--element <id>] | stop | status')
  process.exit(2)
}
