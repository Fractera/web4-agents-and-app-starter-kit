// КОМАНДЫ ГЛАВНОГО АГЕНТА УЗЛА (узел, шаги 548-4 и 548-11). Главный агент живёт в `data/main-agent` (`lib/main-agent/`) и зовёт их
// своими `npm run …`: `node ../../scripts/main-agent-cli.mjs <команда>`. Файлов ядра он не читает — всё, что ему нужно знать
// об узле и его элементах, печатают эти команды (ровно столько, сколько нужно для решения, — модель не платит за лишнее).
//
// Слова владельца 2026-10-19 (548-6): узел, «когда в приложении пришёл запрос на элемент», должен «во-первых создать его, во-вторых
// передать в него техническое задание, в-третьих передать агенту внутри этого элемента начать собственный жизненный процесс»,
// сообщить архитектору, «как он может продолжить работать в этом процессе и контролировать его», а при другом стечении
// обстоятельств — вести элемент самому, «без личного участия».
//
//   contacts [<id>]          — узел постоянного размера: службы, с которыми он родился, и число рождённых элементов; с <id> —
//                              один элемент: адрес · род · состояние · роль · как до него достучаться
//   find <слова>             — кто в узле умеет это (поиск реестра ядра `GET /api/node/a2a?q=…&off=1`, выключенные — с пометкой)
//   card <id>                — визитка элемента с диска: навыки и двери (589-3)
//   needs [list|show|answer|verify] — запросы возможности элементов (589, навык handle-need)
//   lagrix <слова>           — f2f: поиск целого элемента в сети Lagrix; сети ещё нет — ИМИТАЦИЯ (запрос по документам 17 и 20)
//   create --role "<фраза>" (--brief "<текст>" | --brief-file <путь>) [--native] [--supervise main|architect] [--no-wake]
//                            — новый элемент: черновик → рождение из шаблона → роль → задание в его приёмную → пробуждение агента
//   task <id> "<текст>"      — поручение агенту элемента (живой сессии — во вход, спящему — пробуждением)
//   state <id>               — как идёт работа элемента: роль, текущий шаг, приёмная, коммиты, надзор
//   role <id> "<фраза>"      — назначить элементу роль (`data/node/roles.json`)
//   supervise <id> main|architect|off [--max N] — кто ведёт элемент
//   close <id>               — выключить агента элемента (548-20: включает поручение под надзором, выключает главный агент)
//   person                   — как связаться с архитектором из этой сессии (Telegram главного агента или терминал ядра)
//   done [--close]           — сказать узлу «закончил» (или закрыть свою сессию) без чтения ключей узла
//   telegram <id> [<ячейка> "<текст>"] — боты элемента (h2a · h2h · orders · work) или сообщение допущенным одного из них (552-6)
// 🔒 Ничего не делается само: каждую команду запускает главный агент по слову человека или по событию надзора.

import { appendFileSync, existsSync, mkdirSync, readFileSync, readdirSync, renameSync, writeFileSync } from 'node:fs'
import { randomBytes } from 'node:crypto'
import { spawnSync } from 'node:child_process'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const require = createRequire(import.meta.url)
const supervision = require('../lib/web4-items/supervision.cjs')
const nodeType = require('../lib/web4-items/node-type.cjs')
// 552-4: поручение главного агента элементу — строительный процесс; слово уже стоит (например, ответ ядра сессии рабочего процесса)
// — остаётся своё. Мост ядра по слову будит сессию процесса (`lib/agent-kit/modes.cjs`).
const modes = require('../lib/agent-kit/modes.cjs')
const { simulatedF2fSearch } = await import('../lib/web4-items/lagrix-simulated.mjs')

const readJson = (p, fallback = null) => { try { return JSON.parse(readFileSync(p, 'utf8')) } catch { return fallback } }
// 548-20: элементы, чьего агента включил главный агент (`task` → «woke»), — данные узла, вне git.
const WOKEN = join(ROOT, 'data', 'node', 'woken-by-main.json')
function markWoken(id, on) {
  const j = readJson(WOKEN, {})
  if (on) j[id] = new Date().toISOString()
  else delete j[id]
  try { mkdirSync(dirname(WOKEN), { recursive: true }); writeFileSync(WOKEN, JSON.stringify(j, null, 2) + '\n', 'utf8') } catch { /* запись не обязательна */ }
}
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
const LANG = env.NEXT_PUBLIC_LANG || 'en'
const CORE = `http://localhost:${readJson(join(ROOT, 'logs', 'runtime.json'), {})?.port ?? 24680}`
const ZONE = readJson(join(ROOT, 'logs', 'domain.json'), {})?.zone ?? ''
const ORIGIN = ZONE ? `https://architect.${ZONE}` : CORE

const fail = (msg) => { console.log(`===MAIN_AGENT_FAIL=== ${msg}`); process.exit(1) }
const firstSentence = (t, n = 170) => {
  const s = String(t ?? '').replace(/\s+/g, ' ').trim()
  const cut = s.match(/^.{20,}?[.!?](?=\s|$)/)?.[0] ?? s
  return cut.length > n ? `${cut.slice(0, cut.lastIndexOf(' ', n - 1) > 40 ? cut.lastIndexOf(' ', n - 1) : n - 1)}…` : cut
}
async function core(path, init = {}) {
  const r = await fetch(`${CORE}${path}`, { ...init, headers: { 'X-Node-Key': KEY, 'Content-Type': 'application/json', ...(init.headers ?? {}) }, signal: AbortSignal.timeout(init.timeout ?? 15_000) })
  let body = null
  try { body = await r.json() } catch { /* не JSON */ }
  return { status: r.status, body }
}

const registry = () => readJson(join(ROOT, 'WEB4-ITEMS-REGISTRY', 'web4-items.json'), { services: [] }).services ?? []
const addressOf = (id) => {
  const a = readJson(join(ROOT, 'data', 'services', id, 'address.json'), null)?.address
  return typeof a === 'string' && /^[a-z0-9-]{1,40}$/.test(a) ? a : id
}
const itemDir = (id) => {
  const e = registry().find((s) => s.id === id)
  if (!e) return null
  const base = join(ROOT, 'WEB4-ITEMS', e.kind === 'user' ? 'user' : 'core')
  const byAddress = join(base, addressOf(id))
  return existsSync(byAddress) ? byAddress : existsSync(join(base, id)) ? join(base, id) : null
}
const born = (id) => Boolean(registry().find((s) => s.id === id && s.kind === 'user' && s.born))
const botOf = (id) => readJson(join(ROOT, 'data', 'services', id, 'channel', 'telegram', 'bot.json'), null)?.username ?? null
// 589-6: у элемента без своей группы в ядре (рождённый, stripe) терминал — в дереве элемента, под `build/`.
const ownGroup = (id) => existsSync(join(ROOT, 'app', '[lang]', '(architectLayer)', 'architect', id, 'agent-kit.json'))
const terminalOf = (id) => born(id) || !ownGroup(id) ? `${ORIGIN}/${LANG}/${addressOf(id)}/build/terminal` : `${ORIGIN}/${LANG}/architect/${id}/terminal`
const reachOf = (id) => {
  const bot = botOf(id)
  return bot ? `Telegram t.me/${bot} · terminal ${terminalOf(id)}` : `terminal ${terminalOf(id)} (no Telegram bot)`
}
const rolesFile = join(ROOT, 'data', 'node', 'roles.json')
const roles = () => ({ ...readJson(join(ROOT, 'WEB4-ITEMS-REGISTRY', 'roles.json'), {}), ...readJson(rolesFile, {}) })

const [cmd, ...rest] = process.argv.slice(2)
const flag = (name) => { const i = rest.indexOf(name); return i >= 0 ? rest[i + 1] ?? '' : null }
const has = (name) => rest.includes(name)

// 548-14 (владелец 2026-10-20: стоимость агента не растёт с ростом узла): список всех элементов больше не печатается — строка на
// элемент делала каждое пробуждение главного агента дороже с каждым новым элементом. Постоянная часть — службы, с которыми узел
// родился (их набор задаёт Fractera); рождённые — числом; кто делает работу — `find` (не больше пяти); один элемент — `contacts <id>`.
if (cmd === 'contacts') {
  const [one] = rest
  const r = await core('/api/node/projects').catch(() => null)
  const rows = Array.isArray(r?.body?.rows) ? r.body.rows : registry().map((s) => ({ id: s.id, custom: Boolean(s.born), service: s.id, status: 'unknown' }))
  const role = roles()
  const line = (x) => `- ${x.id} · ${x.service} · ${x.custom ? 'custom' : 'native'} · ${x.status} — ${role[x.id] ?? x.role ?? (firstSentence(x.description) || 'no role yet')} — ${reachOf(x.id)}`
  if (one) {
    const x = rows.find((y) => y.id === one || y.service === one || addressOf(y.id) === one)
    if (!x) fail(`no element «${one}» in this node — who does a job: npm run find -- <English words>`)
    console.log(line(x))
    process.exit(0)
  }
  console.log(`Node ${ZONE || '(no domain yet)'} — core ${ORIGIN}: the registry of elements, waking agents, birth of new elements. You are its main agent (terminal ${ORIGIN}/${LANG}/architect/build/terminal).`)
  // 553-1: тип узла — одной строкой постоянного размера (548-14: пробуждение не растёт с узлом).
  const type = nodeType.readNodeType(ROOT)
  console.log(`Node type: ${type} — ${type === 'factory' ? 'an app factory: hosting of projects of different owners; new custom elements are born on their own settings' : 'a single project: one owner, every element under the core\'s CONFIG'} (npm run node-type -- get)`)
  const bornIds = new Set(registry().filter((s) => s.born).map((s) => s.id))
  for (const x of rows.filter((y) => !bornIds.has(y.id))) console.log(line(x))
  console.log(`+ ${rows.filter((y) => bornIds.has(y.id)).length} element(s) born in this node — who does a job: npm run find -- <English words>; one element: npm run contacts -- <id>`)
  process.exit(0)
}

// 579-5 (владелец 2026-10-23: в каждом кастомном элементе — свои страницы дизайна и CONFIG): где меняют оформление и настройки сайта
// элемента. Решает его связь с общими «Дизайном» и CONFIG (`data/services/<id>/links.json`, нет файла или ключа — связь включена):
// включена — общий элемент в ядре, выключена — страница самого элемента. Две строки, без модели.
if (cmd === 'look') {
  const [one] = rest
  if (!one) fail('look <id> — where the design and the site settings of this element are changed')
  const r = await core('/api/node/projects').catch(() => null)
  const rows = Array.isArray(r?.body?.rows) ? r.body.rows : []
  const x = rows.find((y) => y.id === one || y.service === one || addressOf(y.id) === one)
  if (!x) fail(`no element «${one}» in this node — who does a job: npm run find -- <English words>`)
  const links = readJson(join(ROOT, 'data', 'services', x.id, 'links.json'), {}) ?? {}
  const on = (k) => links[k] !== false
  // Главный адрес элемента — у узла (`domain.json`: свой домен), иначе корень зоны у root и поддомен у остальных.
  const domainUrl = readJson(join(ROOT, 'data', 'services', x.id, 'domain.json'), null)?.url
  const site = typeof domainUrl === 'string' && domainUrl ? domainUrl.replace(/\/+$/, '')
    : x.id === 'root' && ZONE ? `https://${ZONE}` : x.service && x.service.includes('.') ? `https://${x.service}` : null
  const shared = { design: `${ORIGIN}/${LANG}/architect/design`, config: `${ORIGIN}/${LANG}/architect/config` }
  const own = { design: site && `${site}/${LANG}/admin/design`, config: site && `${site}/${LANG}/admin/site-settings` }
  if (!x.custom && x.id !== 'root') {
    console.log(`${x.id} is a native element: its look and site settings come from the shared Design (${shared.design}) and CONFIG (${shared.config}); it has no workshop of its own.`)
    process.exit(0)
  }
  for (const [k, label] of [['design', 'Design (colours, fonts, shapes)'], ['config', 'Site settings (name, menu, footer, switches)']]) {
    console.log(on(k)
      ? `${label}: linked to the shared ${k === 'design' ? 'Design' : 'CONFIG'} — change it there: ${shared[k]} (it applies to every element that follows it)`
      : `${label}: own — change it on the element: ${own[k] ?? '(the element has no public address yet)'}`)
  }
  // У root меню в ядре — папки страниц, «Опасной зоны» с выключателями связей у него нет (замер 2026-10-24: 404).
  console.log(x.id === 'root'
    ? 'Give the person the link; never change the values yourself.'
    : `The switch of these links: ${ORIGIN}/${LANG}/${addressOf(x.id)}/settings/danger-zone. Give the person the link; never change the values yourself.`)
  process.exit(0)
}

if (cmd === 'find') {
  const words = rest.join(' ').trim()
  if (!words) fail('find <plain words of the job>')
  // 589-3: `off=1` — и выключенные элементы с навыками из визитки (✗ 2026-10-24: stripe «skills: —», и «нет» вышло ложным).
  const r = await core(`/api/node/a2a?q=${encodeURIComponent(words)}&off=1`).catch((e) => fail(`the core did not answer: ${e.message}`))
  const entries = r.body?.entries ?? []
  // 548-6 (2026-10-20): реестр написан по-английски — «вход на сайт» не нашёл auth. Без латиницы — повтор английскими словами, не сеть.
  if (!entries.length && !/[a-z]/i.test(words)) { console.log(`Nothing found for «${words}»: the node's registry is written in English — run npm run find again with English words (for example: sign in, remove background).`); process.exit(0) }
  if (!entries.length) { console.log(`Nobody in this node does «${words}». Next: npm run lagrix -- ${words}`); process.exit(0) }
  const role = roles()
  for (const e of entries.slice(0, 5)) {
    const id = registry().find((s) => s.id === e.address || addressOf(s.id) === e.address)?.id ?? e.address
    const off = e.state === 'off' ? ` · TURNED OFF (${e.off || 'no reason'}) — only the architect turns it on` : ''
    console.log(`- ${e.address} — ${role[id] ?? firstSentence(e.description)} · skills: ${(e.skills ?? []).map((s) => s.id).join(', ') || '—'}${off} — ${reachOf(id)}`)
  }
  console.log('Doors and what each skill does: npm run card -- <element>')
  process.exit(0)
}

// 589-3: визитка одного элемента с диска — навыки и двери, и у выключенного тоже (его сайт молчит, визитка в папке есть).
if (cmd === 'card') {
  const [id] = rest
  if (!id) fail('card <element>')
  const e = registry().find((s) => s.id === id || addressOf(s.id) === id) ?? fail(`no element ${id} in the registry`)
  const dir = itemDir(e.id) ?? fail(`${id}: no folder`)
  const card = readJson(join(dir, 'OWN-SERVICE-PROPS', 'A2A-CARD.json'), null)
  const off = e.off && typeof e.off === 'object' ? (typeof e.off.reason === 'string' ? e.off.reason : e.off.reason?.en ?? 'no reason') : null
  console.log(`${addressOf(e.id)} · ${off ? `TURNED OFF (${off}) — only the architect turns it on` : 'on'}`)
  if (!card) { console.log('no A2A card: ask its role (npm run contacts -- ' + e.id + ')'); process.exit(0) }
  const ext = (card.capabilities?.extensions ?? []).find((x) => String(x?.uri).includes('/a2a/ext/node/'))?.params ?? {}
  for (const s of card.skills ?? []) console.log(`skill ${s.id} — ${firstSentence(s.description, 220)}`)
  for (const d of ext.doors ?? []) console.log(`door ${d.method ?? 'GET'} ${d.path}${d.skill ? ` → ${d.skill}` : ''}`)
  process.exit(0)
}

if (cmd === 'lagrix') {
  const words = rest.join(' ').trim()
  if (!words) fail('lagrix <plain words of the element you need>')
  const out = simulatedF2fSearch(words, { framework: 'next', country: env.NODE_COUNTRY || '', dataDir: join(ROOT, 'data', 'node') })
  console.log(JSON.stringify(out, null, 2))
  process.exit(0)
}

if (cmd === 'role') {
  const [id, ...words] = rest
  const text = words.join(' ').trim()
  if (!id || !text) fail('role <id> "<one sentence: what this element does for the node>"')
  if (!registry().some((s) => s.id === id)) fail(`no element ${id} in the registry`)
  const j = readJson(rolesFile, {})
  j[id] = text
  mkdirSync(dirname(rolesFile), { recursive: true })
  writeFileSync(rolesFile, JSON.stringify(j, null, 2) + '\n', 'utf8')
  console.log(`===ROLE_OK=== ${id}: ${text}`)
  process.exit(0)
}

if (cmd === 'supervise') {
  const [name, by] = rest
  if (!name || !['main', 'architect', 'off'].includes(by)) fail('supervise <id> main|architect|off [--max N]')
  // 548-20: адрес вместо id принимался молча и заводил пустую запись надзора (✗ живой круг 2026-10-20: «supervise template main»).
  const entry = registry().find((s) => s.id === name || s.address === name || addressOf(s.id) === name)
  if (!entry) fail(`no element ${name} in the registry — give its id (npm run find)`)
  const id = entry.id
  const max = Number(flag('--max')) || supervision.DEFAULT_MAX
  const r = supervision.set(id, by, { max, root: ROOT })
  console.log(`===SUPERVISE_OK=== ${id}: ${by === 'off' ? 'not supervised' : by === 'main' ? `the main agent leads it, up to ${max} cycles` : 'the architect leads it'}${r ? ` (cycles so far ${r.cycles ?? 0})` : ''}`)
  process.exit(0)
}

if (cmd === 'person') {
  const tg = join(ROOT, 'data', 'services', 'build', 'channel', 'telegram')
  const p = readJson(join(tg, 'person.json'), null)
  // 548-20: чат архитектора живёт в access.json (allowFrom) после первого сообщения боту; person.json хранит только язык —
  // прежняя строка печатала «chat_id (see person.json)», и главный агент не мог ответить архитектору в Telegram.
  const allow = readJson(join(tg, 'access.json'), null)?.allowFrom
  const chat = p?.chatId ?? p?.chat_id ?? p?.id ?? (Array.isArray(allow) && allow.length ? allow[0] : null)
  const bot = botOf('build')
  if (bot && chat) console.log(`Telegram bot @${bot} is yours: write to the architect with the reply tool, chat_id ${chat}, language ${p?.lang ?? LANG}.`)
  else if (bot) console.log(`Telegram bot @${bot} is yours, but the architect has not written to it yet — answer in the core's terminal ${ORIGIN}/${LANG}/architect/build/terminal.`)
  else console.log(`No Telegram bot for the main agent: the architect reads you in the core's terminal ${ORIGIN}/${LANG}/architect/build/terminal — answer there.`)
  process.exit(0)
}

// 548-13: «закончил» главного агента — этой командой, без чтения `.env.local` узла (✗ замерено 2026-10-20: по общему правилу
// пробуждения «ключ из .env.local» главный агент прочитал файл ключей ядра целиком).
if (cmd === 'done') {
  const r = await core('/api/agents/done', { method: 'POST', body: JSON.stringify({ service: 'build', ...(has('--close') ? { close: true } : {}) }) }).catch((e) => fail(`the core did not answer: ${e.message}`))
  console.log(r.body?.ok ? `===DONE_OK=== ${has('--close') ? 'closing this session' : 'the node knows you finished'}` : `===DONE_FAIL=== ${r.body?.reason ?? r.status}`)
  process.exit(r.body?.ok ? 0 : 1)
}

// 548-20 (владелец 2026-10-20: «агент ядра мог управлять включением агентов элементов и их выключением»): выключить агента элемента
// той же дверью, которой агент закрывает свой терминал. Включает его поручение под твоим надзором (`supervise` + `task`).
if (cmd === 'close') {
  const [id] = rest
  if (!id) fail('close <id>')
  const r = await core('/api/agents/done', { method: 'POST', body: JSON.stringify({ service: id, close: true }) }).catch((e) => fail(`the core did not answer: ${e.message}`))
  markWoken(id, false)
  const b = r.body ?? {}
  console.log(b.ok ? `===CLOSE_OK=== ${id}: its agent is turned off` : b.reason === 'no-session' ? `===CLOSE_OK=== ${id}: its agent was already off` : `===CLOSE_FAIL=== ${id}: ${b.reason ?? r.status}`)
  process.exit(b.ok || b.reason === 'no-session' ? 0 : 1)
}

// 552-6 (владелец 2026-10-20: «если ядро решила написать человеку через Messenger она должна сумме это сделать»): боты элемента и
// сообщение тем, кто допущен к одному из них по ссылке. Ячейки: h2a — разговор человека с агентом элемента, h2h — люди через агентов,
// orders — заказы элемента у других агентов, work — работа элемента для других агентов.
if (cmd === 'telegram') {
  const [one, slot, ...words] = rest
  if (!one) fail('telegram <id> [h2a|h2h|orders|work "<text>"]')
  const e = registry().find((s) => s.id === one || addressOf(s.id) === one)
  if (!e) fail(`no element ${one} in the registry`)
  const text = words.join(' ').trim()
  if (slot && !text) fail('telegram <id> <slot> "<text>" — the text is missing')
  const r = await core('/api/agents/telegram', { method: 'POST', body: JSON.stringify({ service: e.id, ...(text ? { slot, text } : {}) }) }).catch((err) => fail(`the core did not answer: ${err.message}`))
  const b = r.body ?? {}
  if (!text) {
    const bots = Object.entries(b.bots ?? {})
    if (!b.ok) fail(`${one}: ${b.error ?? r.status}`)
    if (!bots.length) console.log(`${one}: no Telegram bot is connected — the architect connects them on the element's pages Messenger → H2A / H2H → Telegram bot and Working process → A2A → Telegram`)
    for (const [s, x] of bots) console.log(`${s.padEnd(6)} @${x.username} — ${x.people ? `${x.people} activated` : 'nobody activated yet: no one to write to'}`)
    process.exit(0)
  }
  console.log(b.ok ? `===TELEGRAM_OK=== ${one} ${slot}: sent to ${b.sent}` : `===TELEGRAM_FAIL=== ${one} ${slot}: ${b.error ?? r.status}`)
  process.exit(b.ok ? 0 : 1)
}

if (cmd === 'task') {
  const [id, ...words] = rest
  const text = words.join(' ').trim()
  if (!id || !text) fail('task <id> "<what the element agent must do>"')
  if (!registry().some((s) => s.id === id)) fail(`no element ${id} in the registry`)
  const supervised = supervision.byMain(id, ROOT)
  const r = await core('/api/agents/wake', { method: 'POST', body: JSON.stringify({ service: id, text: modes.withWord(text, 'build'), from: 'main agent', about: firstSentence(text, 300), reason: 'main-agent-task', supervised }) }).catch((e) => fail(`the core did not answer: ${e.message}`))
  const b = r.body ?? {}
  // 548-20: кто включил агента — запись, а не память сессии: «закончил» будит главного агента в НОВОЙ сессии, и та не знала,
  // включала ли она элемент сама (✗ живой круг 2026-10-20: template остался включённым). `state` печатает, `close` стирает.
  if (b.ok && !b.pending) markWoken(id, !b.already)
  console.log(b.ok ? (b.pending ? `===TASK_OK=== ${id}: asked its person in Telegram to turn the agent on` : b.already ? `===TASK_OK=== ${id}: pasted into its live session` : `===TASK_OK=== ${id}: its agent woke with the task`) : `===TASK_FAIL=== ${id}: ${b.reason ?? r.status}${b.freeMb ? ` (free ${b.freeMb} MB, needs ${b.perSessionMb} MB — try later)` : ''}`)
  process.exit(b.ok ? 0 : 1)
}

// 589-2: запросы возможности (`lib/web4-items/needs.mjs`, навык handle-need). Список — не больше пяти открытых: стоимость пробуждения
// не растёт с узлом (548-14). Слова запроса — данные в «».
if (cmd === 'needs') {
  const N = await import('../lib/web4-items/needs.mjs')
  const [sub, id] = rest
  // 589-3 (✗ живой прогон 2026-10-24 19:13Z): Git Bash подменяет аргумент «/api/x» на «C:/Program Files/Git/api/x», когда зовёт программу
  // Windows (подмена путей MSYS), — в запись легла чужая дверь. Путь двери всегда от корня сайта: приставку корня Git срезаем.
  const door = (() => {
    const v = flag('--door')
    const m = typeof v === 'string' ? v.replace(/\\/g, '/').match(/^[A-Za-z]:\/(?:[^/]+\/)*?(?:Git|msys64|msys2)(\/.+)$/i) : null
    return m ? m[1] : v
  })()
  const line = (r) => `${r.id} · ${r.from} · ${r.stage}${r.owner ? ` · owner ${r.owner}` : ''}${r.skill ? ` · ${r.skill}` : ''} · «${r.need.slice(0, 90)}»`
  if (!sub || sub === 'list') {
    const open = N.listNeeds(ROOT, { open: true, limit: 5 })
    console.log(open.length ? open.map(line).join('\n') : 'no open needs')
    process.exit(0)
  }
  if (sub === 'show') {
    const r = N.readNeed(ROOT, id) ?? fail(`no need ${id}`)
    console.log(line(r))
    if (r.use) console.log(`what for: «${r.use}»`)
    console.log(r.history.map((h) => `  ${h.at.slice(0, 16)} ${h.stage}${h.note ? ` — ${h.note}` : ''}`).join('\n'))
    process.exit(0)
  }
  if (sub === 'answer') {
    const stage = ['found', 'missing', 'approved', 'building', 'ready', 'told', 'declined'].find((s) => has(`--${s}`)) ?? fail('answer <id> --found|--missing|--approved|--building|--ready|--told|--declined [--owner <id|new>] [--skill <id>] [--door <path>] [--note "…"]')
    const owner = stage === 'found' ? flag('--found') : flag('--owner')
    try {
      const r = N.setStage(ROOT, id, stage, { owner: owner ?? undefined, skill: flag('--skill') ?? undefined, door: door ?? undefined }, flag('--note') ?? '')
      console.log(`===NEED_OK=== ${line(r)}`)
    } catch (e) { fail(e.message) }
    process.exit(0)
  }
  if (sub === 'verify') {
    // «Готово» — только когда визитка владельца называет возможность: навык или дверь (589-4). Иначе — «не построено».
    if (flag('--skill') || door) N.setFields(ROOT, id, { skill: flag('--skill') ?? undefined, door: door ?? undefined }, 'from the report of the owner')
    const r = N.readNeed(ROOT, id) ?? fail(`no need ${id}`)
    const dir = r.owner ? itemDir(r.owner) : null
    if (!dir) fail(`${id}: no owner element folder (owner: ${r.owner ?? 'none'})`)
    const card = readJson(join(dir, 'OWN-SERVICE-PROPS', 'A2A-CARD.json'), {})
    const ext = (card.capabilities?.extensions ?? []).find((e) => String(e?.uri).includes('/a2a/ext/node/'))?.params ?? {}
    const skillOk = r.skill && (card.skills ?? []).some((s) => s?.id === r.skill)
    const doorOk = r.door && (ext.doors ?? []).some((d) => d?.path === r.door)
    if (!skillOk && !doorOk) { console.log(`===NEED_NOT_BUILT=== ${r.owner}'s card names neither skill «${r.skill ?? '—'}» nor door «${r.door ?? '—'}»`); process.exit(1) }
    if (r.stage === 'building') N.setStage(ROOT, id, 'ready', {}, `the card of ${r.owner} names ${skillOk ? `skill ${r.skill}` : `door ${r.door}`}`)
    console.log(`===NEED_VERIFIED=== ${r.owner}: ${skillOk ? `skill ${r.skill}` : ''}${skillOk && doorOk ? ' · ' : ''}${doorOk ? `door ${r.door}` : ''}`)
    process.exit(0)
  }
  fail('needs [list] · show <id> · answer <id> … · verify <id> [--skill <id>] [--door <path>]')
}

if (cmd === 'state') {
  const [id] = rest
  if (!id) fail('state <id>')
  const dir = itemDir(id)
  if (!dir) fail(`no folder of element ${id}`)
  const role = roles()[id]
  const docs = join(dir, 'development-docs')
  const step = existsSync(join(docs, 'current-step.md')) ? readFileSync(join(docs, 'current-step.md'), 'utf8').split(/\r?\n/).slice(0, 60).join('\n') : '(no development-docs/current-step.md)'
  const intake = existsSync(join(docs, 'pre-steps')) ? readdirSync(join(docs, 'pre-steps')).filter((f) => /^\d\d-\d\d-\d{4}_/.test(f)) : []
  const git = spawnSync('git', ['-C', dir, 'log', '--oneline', '-5'], { encoding: 'utf8', windowsHide: true })
  const sup = supervision.read(ROOT).elements[id]
  console.log(`Element ${id} (${addressOf(id)}) — role: ${role ?? 'none'}`)
  console.log(`Led by: ${sup?.active ? (sup.by === 'main' ? `the main agent, cycle ${sup.cycles ?? 0} of ${sup.max}` : 'the architect') : 'the architect (no supervision record)'} · reach: ${reachOf(id)}`)
  console.log(`Intake: ${intake.length ? intake.join(', ') : 'empty'}`)
  // 548-20: результат проверки, которую ты поручил, — элемент сохраняет его `npm run reply-core` в своих данных.
  const report = readJson(join(ROOT, 'data', 'services', id, 'core-report.json'), null)
  console.log(`Report to you (npm run reply-core): ${report?.text ? `«${report.text}» (${report.at})` : 'none'}`)
  // 589-4 (✗ живой круг 2026-10-24 20:20Z): строитель закончил запрос, главный агент по тексту надзора выключил его и закрылся — запрос
  // остался «building», просивший и архитектор не узнали. Открытый запрос этого элемента в стадии building — первым делом.
  const { listNeeds } = await import('../lib/web4-items/needs.mjs')
  for (const n of listNeeds(ROOT, { open: true, limit: 20 }).filter((x) => x.owner === id && x.stage === 'building')) {
    console.log(`BEFORE YOU CLOSE: this element builds ${n.id} for ${n.from} («${n.need.slice(0, 90)}») — skill handle-need, section 3: npm run needs -- verify ${n.id} --skill <skill> --door <path> (from the report), tell ${n.from} and the architect, then close.`)
  }
  const woken = readJson(WOKEN, {})[id]
  console.log(`Turned on by you: ${woken ? `yes (${woken}) — turn it off when its job is done: npm run close -- ${id}` : 'no — leave it running'}`)
  console.log(`Last commits:\n${(git.stdout || '(none)').trim()}`)
  console.log(`current-step.md (first 60 lines):\n${step}`)
  process.exit(0)
}

if (cmd === 'create') {
  const role = (flag('--role') ?? '').trim()
  const briefFile = flag('--brief-file')
  const brief = (briefFile ? (existsSync(briefFile) ? readFileSync(briefFile, 'utf8') : fail(`no file ${briefFile}`)) : flag('--brief') ?? '').trim()
  const by = flag('--supervise') ?? 'architect'
  if (!role || !brief) fail('create --role "<one sentence>" (--brief "<the task, the person\'s words first>" | --brief-file <path>) [--native] [--supervise main|architect] [--no-wake]')
  if (!['main', 'architect'].includes(by)) fail('--supervise main|architect')

  // 1. Черновик — тем же правилом имени, что кнопка «Создать WEB4 ITEM» (`lib/web4-items/drafts.ts`).
  const RESERVED = new Set(['auth', 'blocks', 'build', 'config', 'data', 'design', 'hosting', 'kits', 'passport', 'root', 'admin', 'architect', 'api', 'www', 'mail', 'memory', 'telegram', 'store', 'items'])
  const draftsFile = join(ROOT, 'data', 'web4-drafts.json')
  const drafts = readJson(draftsFile, { drafts: [] }).drafts ?? []
  const busy = new Set([...RESERVED, ...registry().map((s) => s.id), ...drafts.map((d) => d.id)])
  const alphabet = 'abcdefghijklmnopqrstuvwxyz0123456789'
  let id = ''
  for (let i = 0; i < 100 && (!id || busy.has(id)); i++) {
    const b = randomBytes(5)
    id = alphabet[b[0] % 26] + [1, 2, 3, 4].map((k) => alphabet[b[k] % 36]).join('')
  }
  if (busy.has(id)) fail('no free name')
  const tmp = `${draftsFile}.${process.pid}.tmp`
  writeFileSync(tmp, JSON.stringify({ drafts: [...drafts, { id, createdAt: new Date().toISOString() }] }, null, 2) + '\n', 'utf8')
  renameSync(tmp, draftsFile)
  console.log(`draft ${id} — birth starts (clone of the template, install, build: a few minutes)`)

  // 2. Рождение — тот же путь, что кнопка «Родить элемент». 553-1: облик выбирает `item-birth.mjs` по типу узла.
  const birth = spawnSync(process.execPath, [join(ROOT, 'scripts', 'item-birth.mjs'), id, ...(has('--native') ? ['--native'] : [])], { cwd: ROOT, encoding: 'utf8', windowsHide: true, timeout: 20 * 60_000 })
  const log = `${birth.stdout ?? ''}${birth.stderr ?? ''}`
  if (!/===BIRTH_OK===/.test(log)) fail(`birth of ${id} failed: ${log.trim().split(/\r?\n/).slice(-3).join(' | ')}`)
  const dir = itemDir(id)
  if (!dir) fail(`element ${id} was born but its folder is not found`)

  // 3. Роль — в данные узла: по ней его найдут соседи и главный агент.
  const rj = readJson(rolesFile, {})
  rj[id] = role
  mkdirSync(dirname(rolesFile), { recursive: true })
  writeFileSync(rolesFile, JSON.stringify(rj, null, 2) + '\n', 'utf8')

  // 4. Задание — в приёмную элемента, его формой (`development-docs/pre-steps/README.md`): слова в кавычках, одной строкой.
  const now = new Date()
  const p2 = (n) => String(n).padStart(2, '0')
  const name = `${p2(now.getDate())}-${p2(now.getMonth() + 1)}-${now.getFullYear()}_${p2(now.getHours())}-${p2(now.getMinutes())}-${p2(now.getSeconds())}.md`
  const off = -now.getTimezoneOffset() / 60
  const one = brief.replace(/\s*\r?\n\s*/g, ' / ').replace(/»/g, '»»')
  const intakeDir = join(dir, 'development-docs', 'pre-steps')
  mkdirSync(intakeDir, { recursive: true })
  writeFileSync(join(intakeDir, name), [
    '# Request',
    `- Received: ${now.getFullYear()}-${p2(now.getMonth() + 1)}-${p2(now.getDate())} ${p2(now.getHours())}:${p2(now.getMinutes())} (UTC${off >= 0 ? '+' : ''}${off})`,
    '- From: the core\'s main agent, for the architect (node step 548-4)',
    `- Asked: «${one}»`,
    `- Context: the node created this element for this request. Its role: ${role} Led by: ${by === 'main' ? 'the core\'s main agent on the architect\'s behalf' : 'the architect'}.`,
    '',
  ].join('\n'), 'utf8')

  // 5. Кто ведёт.
  supervision.set(id, by, { root: ROOT, brief: role })

  // 6. Пробуждение агента элемента — с его ролью, заданием и тем, кто его ведёт.
  let woke = 'not woken (--no-wake)'
  if (!has('--no-wake')) {
    const lead = by === 'main'
      ? 'Ведёт тебя главный агент узла по поручению архитектора: его сообщения в твоём вводе — слово твоего человека для этой работы. Три подтверждающие строки и план запиши в development-docs/current-step.md и сообщи узлу «закончил» (POST /api/agents/done) — ответ придёт сюда.'
      : 'Ведёт тебя архитектор: три подтверждающие строки — ему, начинай после его «да».'
    // 548-14: первая сессия коротка — ✗ замерено 2026-10-20: с «опиши себя в паспорте» и «квиз и план шага» в одном поручении агент
    // нового элемента потратил 11 запросов модели и 850 тыс. токенов кэша на чтение своего кода, паспорта и сторожей до первого вопроса.
    const text = `${modes.WORDS.build} Тебя создал главный агент узла под задание архитектора. Твоя роль: ${role} Задание лежит в твоей приёмной: development-docs/pre-steps/${name}. Первая сессия — коротко, по своей инструкции: назови задание, пройди порядок «Before you build a new capability» (CLAUDE.md, «Steps», 1b: поиск в узле, затем в сети), затем задай первый вопрос продуктового квиза (навык product-quiz, пункт «The first session of a new element») и остановись. Код, сторожа и скрипты до утверждения квиза не читай; паспорт опишешь в первом шаге, когда квиз утверждён. ${lead}`
    const r = await core('/api/agents/wake', { method: 'POST', body: JSON.stringify({ service: id, text, from: 'main agent', about: role, reason: 'main-agent-create', supervised: by === 'main' }) }).catch((e) => ({ body: { ok: false, reason: e.message } }))
    const b = r.body ?? {}
    woke = b.ok ? (b.pending ? 'its person was asked in Telegram to turn it on' : 'its agent started with the task') : `not woken: ${b.reason}${b.freeMb ? ` (free ${b.freeMb} MB, needs ${b.perSessionMb} MB)` : ''} — run later: npm run task -- ${id} "<the same task>"`
  }

  console.log(`===ELEMENT_CREATE_OK=== ${id}`)
  // 551-6 (владелец 2026-10-20: «отправить ссылку чтобы пользователь мог зайти … но по факту это невозможно»): ссылка — из строки рождения,
  // которое само подключает адрес в Cloudflare и меряет ответ снаружи; не ответил — так и печатается, а не обещается.
  const site = log.match(/===BIRTH_OK=== \S+ port \d+ url (\S+)(?: answers (\d+))?/)
  const siteLine = !site ? 'site: not reported by the birth'
    : site[1] === 'local' ? 'site: only on this computer — the node has no own domain'
      : site[1] === 'none' ? 'site: NOT connected — the element page → «Internet address» → «Connect»'
        : site[2] && Number(site[2]) < 400 ? `site: ${site[1]} — answers ${site[2]} from the internet` : `site: ${site[1]} — connected, NOT answering yet (${site[2] ?? 'no answer'})`
  console.log(`address: ${addressOf(id)}`)
  console.log(siteLine)
  console.log(`role: ${role}`)
  console.log(`task: development-docs/pre-steps/${name}`)
  console.log(`agent: ${woke}`)
  console.log(`led by: ${by === 'main' ? 'you (the main agent): its «done» wakes you — skill supervise-element' : 'the architect'}`)
  console.log(`the architect continues here: terminal ${terminalOf(id)} · development documents ${ORIGIN}/${LANG}/${addressOf(id)}/build/documents/instruction · a Telegram bot is connected on ${ORIGIN}/${LANG}/${addressOf(id)}/messenger/h2a/telegram`)
  process.exit(0)
}

// 556-11 (владелец 2026-10-23: «кнопку проанализировать итог … выдаёшь мне рекомендацию … продолжить разбор или … отправить в продуктовый
// Quiz»): суть готового разбора для анализа и запись решения. Решение лежит рядом с отчётом (дверь reverse-report), страница
// «Реверс-инжиниринг» показывает его с кнопками. Навык — analyze-study.
if (cmd === 'report') {
  const [job] = rest
  if (!job) fail('report <task> [--item <element id>] [--full] | report list')
  if (job === 'list') {
    const r = await core('/api/node/reverse-report').catch((e) => fail(`the core did not answer: ${e.message}`))
    for (const it of r.body?.items ?? []) console.log(`${it.job} · ${it.target} · ${it.verdict ? `verdict ${it.verdict.verdict}` : 'no verdict'}`)
    process.exit(0)
  }
  const r = await core(`/api/node/reverse-report?job=${encodeURIComponent(job)}`).catch((e) => fail(`the core did not answer: ${e.message}`))
  if (!r.body?.ok) fail(`report ${job}: ${r.body?.error ?? r.status}`)
  const rep = r.body.report ?? {}
  const names = (a) => (Array.isArray(a) ? a.map((x) => x?.name ?? x?.path ?? String(x)) : [])
  console.log(`===REPORT=== ${job}`)
  console.log(`target: ${rep.target?.source ?? rep.target?.name ?? ''} (${rep.target?.kind ?? ''})`)
  console.log(`summary: ${rep.summary ?? ''}`)
  console.log(`roles: ${names(rep.roles).join('; ')}`)
  console.log(`scenarios: ${names(rep.scenarios).join('; ')}`)
  console.log(`entities: ${names(rep.entities).join('; ')}`)
  console.log(`pages: ${names(rep.pages).join(' ')}`)
  console.log('limits — what the study did not see:')
  for (const l of rep.limits ?? []) console.log(`- ${l}`)
  // 556-13: the decision recorded for this study — what «Continue the study» has to capture, and the account it needs.
  const v = r.body.verdict
  if (v) {
    console.log(`verdict (${v.at}): ${v.verdict} — ${v.summary}`)
    for (const p of v.pages ?? []) console.log(`- capture: ${[p.address, p.note].filter(Boolean).join(' — ')}`)
    if (v.signIn) console.log(`- sign-in: the test account of ${v.signIn.site} (npm run study -- list)`)
  }
  if (has('--full') && r.body.markdown) console.log(`\n===REPORT_MD===\n${r.body.markdown}`)
  else console.log(`full report: npm run report -- ${job} --full`)
  // 556-15: a series — every next part after the first, so the audit covers what all the parts saw.
  for (const p of r.body.parts ?? []) {
    const pr = await core(`/api/node/reverse-report?job=${encodeURIComponent(p.job)}`).catch(() => null)
    const pb = pr?.body
    if (!pb?.ok) { console.log(`\n===PART=== ${p.job} (part ${p.part}): not readable`); continue }
    const prep = pb.report ?? {}
    console.log(`\n===PART=== ${p.job} (part ${p.part})`)
    console.log(`summary: ${prep.summary ?? ''}`)
    console.log(`scenarios: ${names(prep.scenarios).join('; ')}`)
    console.log(`screens: ${(prep.screens ?? []).map((s) => s?.name ?? s?.id).join('; ')}`)
    for (const l of prep.limits ?? []) console.log(`- limit: ${l}`)
    if (has('--full') && pb.markdown) console.log(`\n===PART_MD=== ${p.job}\n${pb.markdown}`)
  }
  // Цель — замысел квиза элемента; квиза нет — цель спрашивается у человека одной фразой (навык analyze-study).
  const item = flag('--item')
  if (item) {
    const q = await core(`/api/node/product-quiz?item=${encodeURIComponent(item)}`).catch(() => ({ body: null }))
    const vision = q.body?.quiz?.vision?.text
    console.log(vision ? `goal of ${item} (its product quiz): ${vision}` : `goal of ${item}: no product quiz yet — ask the person in one sentence what the element builds`)
  }
  process.exit(0)
}

if (cmd === 'verdict') {
  const pages = []
  const words = []
  // 556-13: `--sign-in <site>` — what is missing is seen only after signing in to that site; the page shows the person an orange card
  // to open the login window of the node's test account, and the wide «Continue the study» waits for the sign-in.
  let signIn = ''
  for (let i = 0; i < rest.length; i++) {
    if (rest[i] === '--page') { const [address, ...note] = String(rest[++i] ?? '').split('|'); pages.push({ address: address.trim(), note: note.join('|').trim() }) } else if (rest[i] === '--sign-in') signIn = String(rest[++i] ?? '').trim()
    else words.push(rest[i])
  }
  const [job, verdict, ...said] = words
  const summary = said.join(' ').trim()
  if (!job || !['continue', 'quiz'].includes(verdict) || !summary) fail('verdict <task> continue|quiz "<the decision in the person\x27s language>" [--page "<address> | <what to capture>"]... [--sign-in <site>]')
  const r = await core('/api/node/reverse-report', { method: 'POST', body: JSON.stringify({ job, verdict, summary, pages, ...(signIn ? { signIn } : {}) }) }).catch((e) => fail(`the core did not answer: ${e.message}`))
  if (!r.body?.ok) fail(`verdict ${job}: ${r.body?.error ?? r.status}`)
  const account = r.body.verdict.signIn ? ` · sign-in ${r.body.verdict.signIn.site}: the page asks the person to open the login window` : ''
  console.log(`===VERDICT_OK=== ${job} ${verdict} · pages ${r.body.verdict.pages.length}${account} — the person sees it on the element\x27s «Reverse engineering» page`)
  process.exit(0)
}

fail(`unknown command «${cmd ?? ''}» — contacts | look | find | lagrix | create | task | state | role | supervise | close | person | done | report | verdict`)
