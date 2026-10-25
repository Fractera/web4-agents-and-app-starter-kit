// node scripts/study-guard.mjs <port> <site> <study dir> <first url> [--log-only] [--budget N] — the guard of the study browser
// (node step 556-7; in the core since 594-2, with the browser). Started by `scripts/study-browser.mjs start <url> --site <site>`; lives as
// long as that browser.
//
// The owner of the node, 2026-10-22: the agent studies internal pages of a site in a test account, and it only reads; crossing a
// point of no return is the person's own act (decision R2). So the rule is kept by code, not by a sentence in a skill: before the
// first page loads, the guard attaches to every target of the browser (pages, frames, workers) and pauses every request:
// - a request that is not GET/HEAD/OPTIONS is blocked — to any host (a payment provider, a beacon) — except a GraphQL query without a
//   mutation sent to the site itself; an unreadable body is blocked too;
// - a GET to the site's log-out, delete, unsubscribe, cancel or invite paths is blocked;
// - documents of the site keep a human pace (PACE_MS between them) and a budget (`--budget`, 60 by default);
// - a challenge page (captcha, «verify you are human», «unusual activity», 429, Cloudflare challenge) stops the browser at once.
// Every decision goes to <study dir>/guard.jsonl: time, kind, method, host, path — never a query string, a body or a value.
// `--log-only` (the person drives the window, mode B) writes the same lines and blocks nothing.
import { appendFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const [port, site, dir, firstUrl, ...rest] = process.argv.slice(2)
const logOnly = rest.includes('--log-only')
const budget = rest.includes('--budget') ? Number(rest[rest.indexOf('--budget') + 1]) : 60
const PACE_MS = 1500
const LOG = join(dir, 'guard.jsonl')
const STATE = join(dir, 'guard.json')
const siteHost = String(site).toLowerCase()
const base = siteHost.replace(/:\d+$/, '').replace(/^www\./, '')
const ours = (host) => { const h = host.toLowerCase(); return h === siteHost || h.replace(/:\d+$/, '') === base || h.endsWith(`.${base}`) }
const DANGER = /\/(log-?out|sign-?out|logoff|delete|remove|deactivate|unsubscribe|cancel|invite)(\/|$)/i
const CHALLENGE = /captcha|verify (that )?you are (a )?human|are you a robot|unusual (traffic|activity)|just a moment\.\.\.|attention required|too many requests/i
const log = (entry) => appendFileSync(LOG, JSON.stringify({ at: new Date().toISOString(), ...entry }) + '\n')
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

let version = null
for (let i = 0; i < 60 && !version; i++) {
  try { version = await (await fetch(`http://127.0.0.1:${port}/json/version`)).json() } catch { await sleep(250) }
}
if (!version) { log({ kind: 'stop', reason: 'no debugging port' }); process.exit(1) }
const sock = new WebSocket(version.webSocketDebuggerUrl)
await new Promise((ok, fail) => { sock.onopen = ok; sock.onerror = fail })
let id = 0
const waiting = new Map()
const send = (method, params = {}, sessionId) => new Promise((ok) => {
  const n = ++id
  waiting.set(n, ok)
  sock.send(JSON.stringify({ id: n, method, params, ...(sessionId ? { sessionId } : {}) }))
})

let stopped = false
async function stop(reason) {
  if (stopped) return
  stopped = true
  log({ kind: 'stop', reason })
  writeFileSync(STATE, JSON.stringify({ pid: process.pid, ready: true, stopped: { at: new Date().toISOString(), reason } }, null, 2))
  await send('Browser.close')
  process.exit(0)
}

// The request body: recent Chrome sends it as `postDataEntries` (base64 bytes), older as `postData`.
function bodyOf(request) {
  if (typeof request.postData === 'string') return request.postData
  if (Array.isArray(request.postDataEntries)) return request.postDataEntries.map((e) => Buffer.from(e.bytes ?? '', 'base64').toString('utf8')).join('')
  return null
}

function graphQLQuery(request) {
  const text = bodyOf(request)
  if (!text) return false
  try {
    const body = JSON.parse(text)
    const ops = Array.isArray(body) ? body : [body]
    return ops.length > 0 && ops.every((op) => typeof op?.query === 'string' && !/\bmutation\b/.test(op.query) && !/\bsubscription\b/.test(op.query))
  } catch { return false }
}

let documents = 0
let lastDocument = 0
async function onPaused(sessionId, p) {
  const continueIt = () => send('Fetch.continueRequest', { requestId: p.requestId }, sessionId)
  let url
  try { url = new URL(p.request.url) } catch { return continueIt() }
  if (p.responseStatusCode !== undefined || p.responseErrorReason !== undefined) {
    const headers = Object.fromEntries((p.responseHeaders ?? []).map((h) => [h.name.toLowerCase(), h.value]))
    if (ours(url.host) && (p.responseStatusCode === 429 || headers['cf-mitigated'] === 'challenge')) {
      await continueIt()
      return stop(p.responseStatusCode === 429 ? `429 at ${url.pathname}` : `challenge at ${url.pathname}`)
    }
    return continueIt()
  }
  const method = p.request.method
  const read = method === 'GET' || method === 'HEAD' || method === 'OPTIONS'
  let kind = null
  if (!read && !(ours(url.host) && method === 'POST' && graphQLQuery(p.request))) kind = 'blocked-write'
  else if (read && ours(url.host) && DANGER.test(url.pathname)) kind = 'blocked-path'
  else if (p.resourceType === 'Document' && ours(url.host)) {
    documents++
    if (documents > budget) kind = 'blocked-budget'
    else {
      const wait = lastDocument + PACE_MS - Date.now()
      if (wait > 0) await sleep(wait)
      lastDocument = Date.now()
    }
  }
  if (!kind) return continueIt()
  log({ kind: logOnly ? kind.replace('blocked', 'seen') : kind, method, host: url.host, path: url.pathname })
  if (logOnly) return continueIt()
  await send('Fetch.failRequest', { requestId: p.requestId, errorReason: 'BlockedByClient' }, sessionId)
  if (kind === 'blocked-budget') return stop(`budget of ${budget} pages used`)
}

const pages = new Set()
async function onAttached(sessionId, info) {
  await send('Fetch.enable', { patterns: [{ urlPattern: '*', requestStage: 'Request' }, { urlPattern: '*', resourceType: 'Document', requestStage: 'Response' }] }, sessionId)
  await send('Target.setAutoAttach', { autoAttach: true, waitForDebuggerOnStart: true, flatten: true }, sessionId)
  if (info.type === 'page') { pages.add(sessionId); await send('Page.enable', {}, sessionId) }
  await send('Runtime.runIfWaitingForDebugger', {}, sessionId)
}

async function onLoaded(sessionId) {
  const r = await send('Runtime.evaluate', { expression: "document.title + ' ' + (document.body ? document.body.innerText.slice(0, 3000) : '')", returnByValue: true }, sessionId)
  const text = r.result?.result?.value ?? ''
  if (CHALLENGE.test(text)) return stop('a challenge page (captcha or «unusual activity»)')
}

sock.onmessage = (e) => {
  const m = JSON.parse(e.data)
  if (m.id && waiting.has(m.id)) { waiting.get(m.id)(m); waiting.delete(m.id); return }
  if (m.method === 'Target.attachedToTarget') void onAttached(m.params.sessionId, m.params.targetInfo)
  else if (m.method === 'Fetch.requestPaused') void onPaused(m.sessionId, m.params)
  else if (m.method === 'Page.loadEventFired' && !logOnly) void onLoaded(m.sessionId)
}
sock.onclose = () => process.exit(0)

await send('Target.setAutoAttach', { autoAttach: true, waitForDebuggerOnStart: true, flatten: true })
// The first page is already there (about:blank): attach to it by hand if auto-attach did not, then the guard opens the first page.
const targets = await send('Target.getTargets')
for (const t of targets.result?.targetInfos ?? []) {
  if (t.type === 'page' && !t.attached) {
    const a = await send('Target.attachToTarget', { targetId: t.targetId, flatten: true })
    if (a.result?.sessionId) await onAttached(a.result.sessionId, t)
  }
}
for (let i = 0; i < 20 && !pages.size; i++) await sleep(100)
writeFileSync(STATE, JSON.stringify({ pid: process.pid, ready: true, logOnly, budget }, null, 2))
log({ kind: 'start', mode: logOnly ? 'person drives (log only)' : 'agent reads (blocking)', budget })
const first = [...pages][0]
if (first && firstUrl) await send('Page.navigate', { url: firstUrl }, first)
