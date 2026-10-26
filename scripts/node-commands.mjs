// КОМАНДЫ УЗЛА — сторона главного агента (узел, шаг 597). Главный агент зовёт их из `data/main-agent` своими `npm run …`
// (`node ../../scripts/node-commands.mjs <команда>`); список команд — один, `lib/agent-kit/commands.json`.
//   commands [--lang ru|en]           — список для человека (язык — его, из Telegram главного агента)
//   commands check [<файл>]           — список годен: имена Bot API, оба языка, кто исполняет
//   commands menu                     — меню бота главного агента в чате каждого допущенного
//   remember "<слова>" [--file <путь>]… — в глубокую память (элемент memory): фраза ВМЕСТЕ с её вещами одним вызовом
//   remind "<вопрос>"                 — из обеих памятей: глубокой (элемент memory, найденные вещи — файлами) и дневника (по смыслу)
//   wake <id>                         — включить агента элемента без поручения (ноль токенов; у элемента с ботом — вопрос в его боте)
// Владелец 2026-10-25: «инструкции обновить с требованием прослушивать эти слова и как только они появляются начинают работу с памятью
// а именно Fractera memory starter … напомнить будет извлекаться из обоих видов памяти?»; 2026-10-26: команду узнаёт модель главного
// агента по цели сообщения («анализ прямого совпадения это вариант который нельзя использовать») — эти команды он зовёт, поняв цель.
// 🔒 Своего распознавания, своей связки и своего хранилища здесь нет: память сама разбирает сказанное, связывает сообщения и хранит в
// слое данных узла. По её устройству вещь и слова к ней приходят ОДНИМ вызовом (при ответе она идёт только по связям «по смыслу»,
// `chain-links.mjs`) — пару собирает доставщик, то есть главный агент.
// 🔒 Ничего не делается само: каждую команду запускает главный агент по слову человека.

import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { createRequire } from 'node:module'
import { basename, dirname, extname, isAbsolute, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const require = createRequire(import.meta.url)
const commands = require('../lib/agent-kit/commands.cjs')

const readJson = (p, fallback = null) => { try { return JSON.parse(readFileSync(p, 'utf8')) } catch { return fallback } }
const env = (() => {
  const out = {}
  try {
    for (const line of readFileSync(join(ROOT, '.env.local'), 'utf8').split(/\r?\n/)) {
      const m = line.match(/^([A-Z0-9_]+)=(.*)$/)
      if (m) out[m[1]] = m[2].replace(/^["']|["']$/g, '')
    }
  } catch { /* нет .env.local — ключа нет */ }
  return out
})()
const KEY = env.SETTINGS_SECRET ?? ''
const CORE = `http://localhost:${readJson(join(ROOT, 'logs', 'runtime.json'), {})?.port ?? 24680}`
const TG = join(ROOT, 'data', 'services', 'build', 'channel', 'telegram')
// Язык человека — тот же, что у Telegram главного агента (411), иначе язык узла.
const PERSON_LANG = readJson(join(TG, 'person.json'), null)?.lang || env.NEXT_PUBLIC_LANG || 'en'
const LANG = String(PERSON_LANG).split('-')[0]
const MEMORY = 'memory'
// Вещи, найденные памятью, — файлами в данных главного агента (вне его git): агент прикладывает их к ответу.
const FOUND = join(ROOT, 'data', 'services', 'build', 'memory-files')

const [cmd, ...rest] = process.argv.slice(2)
const fail = (tag, msg) => { console.log(`===${tag}_FAIL=== ${msg}`); process.exit(1) }
const flags = (name) => rest.flatMap((x, i) => (x === name && rest[i + 1] !== undefined ? [rest[i + 1]] : []))
// Слова команды — всё, что не флаг и не значение флага.
const words = () => rest.filter((x, i) => !x.startsWith('--') && !(i > 0 && rest[i - 1].startsWith('--'))).join(' ').trim()
const seconds = (ms) => `${(ms / 1000).toFixed(1)} s`

if (cmd === 'commands') {
  const [sub, file] = rest
  if (sub === 'check') {
    let list = []
    try { list = commands.load(file ? resolve(file) : commands.FILE) } catch (e) { fail('COMMANDS', `the list does not read: ${e.message}`) }
    const problems = commands.check(list)
    if (problems.length) fail('COMMANDS', problems.join(' · '))
    console.log(`===COMMANDS_OK=== ${list.length} commands: ${list.map((c) => c.id).join(', ')}`)
    process.exit(0)
  }
  if (sub === 'menu') {
    const line = (() => { try { return readFileSync(join(TG, '.env'), 'utf8').split(/\r?\n/).find((l) => l.startsWith('TELEGRAM_BOT_TOKEN=')) } catch { return '' } })()
    const token = line ? line.slice('TELEGRAM_BOT_TOKEN='.length).trim() : ''
    const chats = readJson(join(TG, 'access.json'), {})?.allowFrom ?? []
    if (!token) fail('MENU', 'the main agent has no Telegram bot yet — the menu is set when it is connected')
    if (!chats.length) fail('MENU', 'nobody is admitted to the main agent\'s bot yet — the menu is set at the first /start')
    const out = await commands.applyMenu(token, chats, PERSON_LANG)
    const bad = out.filter((x) => !x.ok)
    if (bad.length) fail('MENU', bad.map((x) => `${x.chat}: ${x.why}`).join(' · '))
    console.log(`===MENU_OK=== ${commands.menu(PERSON_LANG).length} commands in ${out.length} chat(s), language ${LANG}`)
    process.exit(0)
  }
  const lang = rest.includes('--lang') ? rest[rest.indexOf('--lang') + 1] : PERSON_LANG
  const list = commands.safeLoad()
  if (!list.length) fail('COMMANDS', 'the list is broken — npm run commands -- check')
  console.log(commands.humanList(lang, list))
  process.exit(0)
}

// ── ГЛУБОКАЯ ПАМЯТЬ: включить на задачу, позвать, выключить ─────────────────────────────────────────────────────────

/** Выключатель памяти человека («не запоминай», 595-9) сильнее любой команды записи и чтения. */
function personMemoryOn() {
  try { return require('../lib/agent-kit/memory/record.cjs').memoryOn() } catch { return true }
}

function power(action, reason) {
  const args = [join(ROOT, 'scripts', 'element-power.mjs'), MEMORY, action, ...(reason ? [reason] : [])]
  const r = spawnSync(process.execPath, args, { cwd: ROOT, encoding: 'utf8', windowsHide: true, timeout: 120_000 })
  return `${r.stdout ?? ''}${r.stderr ?? ''}`
}

/** Причина выключения — словами паспорта памяти, на языке человека (её видит человек в ядре). */
function offReason() {
  const r = readJson(join(ROOT, 'WEB4-ITEMS', 'core', MEMORY, 'OWN-SERVICE-PROPS', 'OWN-SERVICE-PROPS.json'), null)?.power?.reason
  return (r && (r[LANG] || r.en)) || 'Turned on for a memory task by the main agent'
}

/** Включить память на задачу: { ok, wasOff, ms, why }. Уже включена — ничего не трогается и после не выключается. */
function memoryUp() {
  const t0 = Date.now()
  const status = power('status')
  if (/===POWER_STATUS===\s+\S+\s+on\b/.test(status)) return { ok: true, wasOff: false, ms: 0 }
  if (!/===POWER_STATUS===/.test(status)) return { ok: false, why: `status did not answer: ${status.trim().slice(-300)}` }
  const on = power('on')
  if (!/===POWER_ON===/.test(on)) return { ok: false, why: on.trim().split(/\r?\n/).slice(-2).join(' ') }
  return { ok: true, wasOff: true, ms: Date.now() - t0 }
}

function memoryDown(up) {
  if (!up?.wasOff) return 'it was already on — left on'
  const t0 = Date.now()
  const off = power('off', offReason())
  return /===POWER_OFF===/.test(off) ? `turned on for this command (${seconds(up.ms)}) and off again (${seconds(Date.now() - t0)})` : `turned on for this command, but it did not turn off: ${off.trim().slice(-200)}`
}

function memoryBase() {
  const e = (readJson(join(ROOT, 'WEB4-ITEMS-REGISTRY', 'web4-items.json'), { services: [] }).services ?? []).find((s) => s.id === MEMORY)
  return e?.port ? `http://127.0.0.1:${e.port}` : null
}

async function callMemory(path, body, files = []) {
  const base = memoryBase()
  if (!base) return { status: 0, body: { ok: false, reason: 'the memory element is not in the registry' } }
  let init
  if (files.length) {
    const form = new FormData()
    form.append('payload', JSON.stringify(body))
    for (const f of files) form.append('files', new Blob([readFileSync(f)]), basename(f))
    init = { method: 'POST', headers: { 'X-Node-Key': KEY }, body: form }
  } else {
    init = { method: 'POST', headers: { 'X-Node-Key': KEY, 'Content-Type': 'application/json' }, body: JSON.stringify(body) }
  }
  try {
    const r = await fetch(`${base}${path}`, { ...init, signal: AbortSignal.timeout(600_000) })
    let b = null
    try { b = await r.json() } catch { b = { ok: false, reason: `not JSON (HTTP ${r.status})` } }
    return { status: r.status, body: b }
  } catch (e) {
    return { status: 0, body: { ok: false, reason: e instanceof Error ? e.message : String(e) } }
  }
}

const EXT_OF_MIME = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp', 'image/gif': '.gif', 'application/pdf': '.pdf', 'audio/mpeg': '.mp3', 'audio/ogg': '.ogg', 'audio/wav': '.wav', 'video/mp4': '.mp4', 'text/plain': '.txt', 'text/markdown': '.md' }

/** Файл найденной вещи — на диск данных главного агента; путь или причина отказа. */
async function saveFound(base, o) {
  try {
    const r = await fetch(`${base}/v1/objects/${encodeURIComponent(o.id)}/file`, { headers: { 'X-Node-Key': KEY }, signal: AbortSignal.timeout(60_000) })
    if (!r.ok) return { why: `HTTP ${r.status}` }
    const mime = String(o.mime || r.headers.get('content-type') || '').split(';')[0].trim()
    const ext = extname(String(o.name || '')).toLowerCase() || EXT_OF_MIME[mime] || '.bin'
    mkdirSync(FOUND, { recursive: true })
    const file = join(FOUND, `${String(o.id).replace(/[^\w.-]/g, '_')}${ext}`)
    writeFileSync(file, Buffer.from(await r.arrayBuffer()))
    return { file }
  } catch (e) {
    return { why: e instanceof Error ? e.message : String(e) }
  }
}

if (cmd === 'remember') {
  const text = words()
  const files = flags('--file').map((f) => (isAbsolute(f) ? f : resolve(process.cwd(), f)))
  if (!text && !files.length) fail('REMEMBER', 'nothing to keep — remember "<the words>" [--file <path>]')
  for (const f of files) if (!existsSync(f) || !statSync(f).isFile()) fail('REMEMBER', `no such file: ${f}`)
  if (!personMemoryOn()) fail('REMEMBER', 'the person switched the node\'s memory off («не запоминай») — nothing is kept until they say «запоминай снова» (npm run memory -- on)')
  const up = memoryUp()
  if (!up.ok) fail('REMEMBER', `the memory element did not turn on: ${up.why}`)
  const t0 = Date.now()
  const r = await callMemory('/v1/remember', { text, from: ['build'], lang: LANG }, files)
  const took = Date.now() - t0
  const down = memoryDown(up)
  const b = r.body ?? {}
  if (!b.ok) fail('REMEMBER', `${b.reason ?? b.refusal ?? b.error ?? `HTTP ${r.status}`}${b.text ? ` — «${String(b.text).slice(0, 300)}»` : ''} · memory element: ${down}`)
  console.log(`===REMEMBER_OK=== the deep memory answered in ${seconds(took)}${files.length ? `, with ${files.length} thing(s)` : ''}`)
  console.log(String(b.text ?? '').trim())
  if (b.answer_id) console.log(`(answer ${b.answer_id})`)
  console.log(`Memory element: ${down}.`)
  process.exit(0)
}

if (cmd === 'remind') {
  const question = words()
  if (!question) fail('REMIND', 'nothing to recall — remind "<the question>"')
  if (!personMemoryOn()) fail('REMIND', 'the person switched the node\'s memory off («не запоминай») — nothing is recalled until they say «запоминай снова» (npm run memory -- on)')
  // Дневник (базовая память) — тем же поиском, что ассоциации перед сообщением: по смыслу, слова — запасной путь.
  const recall = require('../lib/agent-kit/memory/recall.cjs')
  const diary = await recall.recallBest(question, recall.MAIN, { ms: 8000 }).catch((e) => ({ text: '', how: 'error', why: e.message }))
  const up = memoryUp()
  let deep = null
  let things = []
  let down = ''
  if (up.ok) {
    const t0 = Date.now()
    const r = await callMemory('/v1/recall', { text: question, from: ['build'], lang: LANG })
    deep = { ...(r.body ?? {}), ms: Date.now() - t0, status: r.status }
    const base = memoryBase()
    for (const o of (Array.isArray(deep.objects) ? deep.objects : []).filter((x) => x?.id && x.ok !== false).slice(0, 3)) things.push({ o, ...(await saveFound(base, o)) })
    down = memoryDown(up)
  }
  console.log('===REMIND_OK=== two sources — answer once, naming each source and its date; attach the files to your reply')
  if (!up.ok) console.log(`Deep memory (element memory): not asked — it did not turn on: ${up.why}`)
  else if (!deep.ok) console.log(`Deep memory (element memory): no answer — ${deep.reason ?? deep.refusal ?? deep.error ?? `HTTP ${deep.status}`}`)
  else console.log(`Deep memory (element memory; depth ${deep.depth_used ?? '?'}, certainty ${deep.certainty ?? '?'}, ${seconds(deep.ms)}):\n${String(deep.text ?? '').trim()}${deep.answer_id ? `\n(answer ${deep.answer_id})` : ''}`)
  for (const t of things) console.log(t.file ? `Thing «${t.o.title ?? t.o.name ?? t.o.id}» (${t.o.kind ?? 'file'}): ${t.file}` : `Thing «${t.o.title ?? t.o.id}»: its file did not come — ${t.why}`)
  const how = diary.how === 'meaning' ? 'found by meaning' : diary.how === 'words' ? 'found by words' : diary.how
  if (diary.text) console.log(`The diary (base memory, ${how}):\n${diary.text.split('\n').slice(1).join('\n')}`)
  else console.log(`The diary (base memory): nothing about it${diary.how === 'off' ? ' — the memory is switched off' : ''}.`)
  if (up.ok) console.log(`Memory element: ${down}.`)
  process.exit(0)
}

if (cmd === 'wake') {
  const [id] = rest
  if (!id) fail('WAKE', 'wake <element id>')
  const registry = readJson(join(ROOT, 'WEB4-ITEMS-REGISTRY', 'web4-items.json'), { services: [] }).services ?? []
  if (!registry.some((s) => s.id === id)) fail('WAKE', `no element ${id} in the registry — npm run find -- <English words>`)
  let r
  try {
    const res = await fetch(`${CORE}/api/agents/wake`, { method: 'POST', headers: { 'X-Node-Key': KEY, 'Content-Type': 'application/json' }, body: JSON.stringify({ service: id, reason: 'main-agent-on' }), signal: AbortSignal.timeout(60_000) })
    r = { status: res.status, body: await res.json().catch(() => ({})) }
  } catch (e) { fail('WAKE', `the core did not answer: ${e.message}`) }
  const b = r.body ?? {}
  if (!b.ok) fail('WAKE', `${id}: ${b.reason ?? r.status}${b.freeMb ? ` (free ${b.freeMb} MB, needs ${b.perSessionMb} MB — later)` : ''}`)
  console.log(b.pending ? `===WAKE_OK=== ${id}: its Telegram bot asks the person to turn the agent on` : b.already ? `===WAKE_OK=== ${id}: its agent is already on` : `===WAKE_OK=== ${id}: its agent is on, with no task`)
  process.exit(0)
}

console.log('usage: commands [check [<file>] | menu | --lang ru|en] · remember "<words>" [--file <path>]… · remind "<question>" · wake <id>')
process.exit(1)
