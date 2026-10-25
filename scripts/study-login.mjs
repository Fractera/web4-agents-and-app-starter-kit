// node scripts/study-login.mjs <сайт> [--lang ru] — окно входа в тестовую учётную запись (шаг 556-6).
//
// Открывает на экране человека ВИДИМОЕ окно Chrome с профилем этого сайта (data/study/accounts/<сайт>/profile, с 594-2): первой —
// страницу согласия ядра (три отметки и имя сайта, `/api/node/study/consent`), после согласия — сам сайт, где человек входит САМ.
// Пока окно открыто, по CDP раз в 2 с снимает отпечатки того, что сайт хранит в браузере (куки домена и localStorage источника:
// имя и sha256 значения, значения не печатаются и не сохраняются). Первый снимок после согласия — до входа; окно закрыто — сравнение
// с последним снимком: новое или изменённое = признак входа → session.json. Это признак, а не доказательство: сайт, который ничего
// не меняет при входе, даст «сессии нет».
// Окно — обычная программа с окном: `windowsHide` у Chrome здесь НЕ ставится (он спрятал бы само окно), консольного окна у Chrome нет.
// Только для проверки, из командной строки: `--test-local` (свой адрес) и `--headless` (без окна на экране человека).
import { spawn, spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { existsSync, readFileSync } from 'node:fs'
import { createServer } from 'node:net'
import { join } from 'node:path'
import { closePending, openPending, setPending, siteOf, writeSession } from '../lib/study/study.mjs'

const args = process.argv.slice(2)
const flag = (name) => args.includes(name)
const value = (name, fallback) => (args.includes(name) ? args[args.indexOf(name) + 1] : fallback)
const say = (m) => console.log(m)
const input = args.find((a) => !a.startsWith('--') && a !== value('--lang') && a !== value('--timeout-min'))
const lang = value('--lang', 'en') === 'ru' ? 'ru' : 'en'
const headless = flag('--headless')
const timeoutMs = Number(value('--timeout-min', '30')) * 60_000

const target = siteOf(input, { allowLocal: flag('--test-local') })
if (target.error) { say(`===STUDY_FAILED=== ${target.error}`); process.exit(1) }
const { site, origin } = target

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
const freePort = () => new Promise((ok, fail) => {
  const s = createServer(); s.once('error', fail)
  s.listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => ok(p)) })
})
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const hash = (v) => createHash('sha256').update(String(v)).digest('hex').slice(0, 16)
function stopTree(pid) {
  if (process.platform === 'win32') spawnSync('taskkill', ['/PID', String(pid), '/T', '/F'], { windowsHide: true, stdio: 'ignore' })
  else { try { process.kill(-pid, 'SIGTERM') } catch { try { process.kill(pid, 'SIGTERM') } catch { /* gone */ } } }
}
function coreUrl() {
  try { const rt = JSON.parse(readFileSync(join(process.cwd(), 'logs', 'runtime.json'), 'utf8')); return `http://localhost:${rt.port}` } catch { return null }
}

const chrome = chromePath()
if (!chrome) { say('===STUDY_FAILED=== no Chrome found on this machine (set CHROME_PATH)'); process.exit(3) }
const core = coreUrl()
if (!core) { say('===STUDY_FAILED=== the core does not say its port (logs/runtime.json)'); process.exit(3) }

const port = await freePort()
const { dir, nonce } = openPending(site, origin, null)
const consentUrl = `${core}/api/node/study/consent?site=${encodeURIComponent(site)}&nonce=${nonce}&lang=${lang}`
const env = {}
for (const [k, v] of Object.entries(process.env)) if (v !== undefined && !/^(__NEXT|NEXT_|AGI_)/.test(k)) env[k] = v
// Тот же профиль потом открывает браузер разбора без окна (556-7): на macOS и Linux ключ куки — без системного хранилища, иначе вторая
// программа их не прочтёт.
const keychain = process.platform === 'darwin' ? ['--use-mock-keychain'] : process.platform === 'linux' ? ['--password-store=basic'] : []
const child = spawn(chrome, [...(headless ? ['--headless=new'] : []), '--new-window', `--user-data-dir=${join(dir, 'profile')}`,
  `--remote-debugging-port=${port}`, '--remote-debugging-address=127.0.0.1', '--no-first-run', '--no-default-browser-check',
  '--disable-extensions', '--disable-sync', '--disable-default-apps', ...keychain, consentUrl],
{ detached: true, stdio: 'ignore', windowsHide: headless, env })
setPending(site, { pid: child.pid, port })
say(`===STUDY_WINDOW=== ${site}: ${headless ? 'a browser without a window' : 'the login window is open on this computer'} (pid ${child.pid})`)

// ── CDP ──────────────────────────────────────────────────────────────────────
let ws = null
for (let i = 0; i < 60 && !ws; i++) {
  await sleep(250)
  try { const v = await (await fetch(`http://127.0.0.1:${port}/json/version`)).json(); ws = v.webSocketDebuggerUrl } catch { /* not up yet */ }
}
if (!ws) { stopTree(child.pid); closePending(site); say('===STUDY_FAILED=== Chrome did not open its debugging port'); process.exit(3) }
const sock = new WebSocket(ws)
await new Promise((ok, fail) => { sock.onopen = ok; sock.onerror = fail })
let closed = false
sock.onclose = () => { closed = true }
let id = 0
const waiting = new Map()
sock.onmessage = (e) => { const m = JSON.parse(e.data); if (m.id && waiting.has(m.id)) { waiting.get(m.id)(m); waiting.delete(m.id) } }
const send = (method, params = {}, sessionId) => new Promise((ok) => {
  if (closed) return ok({ error: 'closed' })
  const n = ++id; waiting.set(n, ok); sock.send(JSON.stringify({ id: n, method, params, ...(sessionId ? { sessionId } : {}) }))
  setTimeout(() => { if (waiting.has(n)) { waiting.delete(n); ok({ error: 'timeout' }) } }, 5000)
})

const base = new URL(origin).hostname.replace(/^www\./, '')
const ourCookie = (d) => { const c = String(d).replace(/^\./, ''); return c === base || c.endsWith(`.${base}`) || base.endsWith(`.${c}`) }

async function snapshot() {
  const entries = new Map()
  const cookies = await send('Storage.getCookies')
  for (const c of cookies.result?.cookies ?? []) if (ourCookie(c.domain)) entries.set(`cookie:${c.domain}:${c.name}`, hash(c.value))
  const targets = await send('Target.getTargets')
  const page = (targets.result?.targetInfos ?? []).find((t) => t.type === 'page' && (() => { try { return new URL(t.url).origin === origin } catch { return false } })())
  if (page) {
    const attached = await send('Target.attachToTarget', { targetId: page.targetId, flatten: true })
    const sessionId = attached.result?.sessionId
    if (sessionId) {
      const r = await send('Runtime.evaluate', { expression: 'JSON.stringify(Object.keys(localStorage).map((k) => [k, localStorage.getItem(k)]))', returnByValue: true }, sessionId)
      try { for (const [k, v] of JSON.parse(r.result?.result?.value ?? '[]')) entries.set(`storage:${k}`, hash(v)) } catch { /* a page without localStorage */ }
      await send('Target.detachFromTarget', { sessionId })
    }
  }
  return { entries, onSite: Boolean(page) }
}

const readConsent = () => { try { const c = JSON.parse(readFileSync(join(dir, 'consent.json'), 'utf8')); return c.nonce === nonce ? c : null } catch { return null } }
const started = Date.now()
let consent = null
let baseline = null
let latest = null
while (!closed && Date.now() - started < timeoutMs) {
  await sleep(2000)
  if (!consent) consent = readConsent()
  if (!consent) continue
  const snap = await snapshot()
  if (closed) break
  if (!baseline && snap.onSite) baseline = snap.entries
  if (baseline) latest = snap.entries
}
const timedOut = !closed
if (timedOut) stopTree(child.pid)
try { sock.close() } catch { /* already closed */ }
closePending(site)

if (!consent) { say(`===STUDY_NO_CONSENT=== ${site}: the window was closed before the consent${timedOut ? ' (time is up)' : ''}`); process.exit(2) }
const changed = latest && baseline ? [...latest].filter(([k, v]) => baseline.get(k) !== v).map(([k]) => k.split(':')[0]) : []
if (!changed.length) { say(`===STUDY_NO_SESSION=== ${site}: after the consent the site stored nothing new in the browser — sign in again in a new window`); process.exit(2) }
writeSession(site, { site, at: new Date().toISOString(), consentAt: consent.at, changed: changed.length,
  kinds: { cookies: changed.filter((k) => k === 'cookie').length, storage: changed.filter((k) => k === 'storage').length } })
say(`===STUDY_SESSION=== ${site}: signed in (the site stored ${changed.length} new or changed entries after the consent)`)
process.exit(0)
