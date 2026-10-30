// САМООПИСАНИЕ ЭЛЕМЕНТА — что главный агент знает о каждом элементе узла (узел, шаг 603-1).
//
// 🎯 Владелец 2026-10-26, после разговора с главным агентом в Telegram: «модель совершенно не понимает ни себя ни свою возможности. А как тогда
// она … может проектировать … в 62-й раз она будет строить память». Разбор того дня (федеральный отчёт «main agent does not know its node»):
// паспорта элементов верные и подробные, а команды агента показывали голую карточку A2A (служебные
// навыки шаблона, двери только из app/api) и строку роли.
//
// 🔒 Всё, что узел может измерить, узел вычисляет сам (не устаревает и не лжёт): порт, папка, вкл/выкл, двери из маршрутов кода, файлы данных
// на диске, память процессов, кто от кого зависит. Смысл — из паспорта элемента (`OWN-SERVICE-PROPS.json`: name, shortDescription,
// longDescription, accepts, returns, calls) и его роли в узле. Общее для шаблона — навык или дверь у большинства элементов — показывается одной
// строкой, а не как «умение» каждого: по данным, без ручного списка.
//
// Поиск по смыслу (`findByMeaning`): текст самоописания каждого элемента — вектором в коллекции `node-elements` элемента vectors (векторы считает
// ядро своим ключом OpenAI, как базовая память, `lib/agent-kit/memory/embed.cjs`); пересчитывается только изменившийся текст. Нет ключа, нет
// vectors или data — null, и зовущий ищет по словам, как прежде.
const fs = require('node:fs')
const path = require('node:path')
const crypto = require('node:crypto')
const { spawnSync } = require('node:child_process')

const ROOT = path.join(__dirname, '..', '..')
const COLLECTION = 'node-elements'
const INDEX_LEDGER = path.join(ROOT, 'data', 'node', 'self-index.json')
const COMMON_SHARE = 0.6

const readJson = (file, fallback) => { try { return JSON.parse(fs.readFileSync(file, 'utf8').replace(/^﻿/, '')) } catch { return fallback } }

// Папка элемента — от корня узла, а не от текущей папки (главный агент зовёт команды из data/main-agent): по адресу элемента, иначе по id —
// то же правило, что `itemDir` в `scripts/main-agent-cli.mjs` (lagrix живёт в user/lagrix под id rtyhh).
function dirOf(root, s) {
  const base = path.join(root, 'WEB4-ITEMS', s.kind === 'user' ? 'user' : 'core')
  const a = readJson(path.join(root, 'data', 'services', s.id, 'address.json'), null)?.address
  const byAddress = typeof a === 'string' && /^[a-z0-9-]{1,40}$/.test(a) ? path.join(base, a) : null
  if (byAddress && fs.existsSync(byAddress)) return byAddress
  const byId = path.join(base, s.id)
  return fs.existsSync(byId) ? byId : null
}

/** Память процессов узла, МБ: имя pm2 → МБ (один `pm2 jlist` на вызов). */
function pm2Memory() {
  const win = process.platform === 'win32'
  const r = spawnSync(win ? 'pm2.cmd' : 'pm2', ['jlist'], { cwd: ROOT, shell: win, windowsHide: true, encoding: 'utf8', timeout: 20000 })
  const out = new Map()
  try { for (const a of JSON.parse(r.stdout)) out.set(a.name, { mb: Math.round((a.monit?.memory ?? 0) / 1048576), status: a.pm2_env?.status }) } catch { /* pm2 не ответил */ }
  return out
}

const METHODS = /export\s+(?:async\s+)?function\s+(GET|POST|PUT|PATCH|DELETE)\b|export\s+const\s+(GET|POST|PUT|PATCH|DELETE)\s*=/g

// Двери элемента — из его маршрутов (файлы route.ts в папке app), а не из записи о них. Страницы под [lang] — не двери для соседей.
function scanDoors(dir, privatePrefixes) {
  const app = path.join(dir, 'app')
  const doors = []
  const walk = (d, segs) => {
    let names
    try { names = fs.readdirSync(d, { withFileTypes: true }) } catch { return }
    for (const n of names) {
      if (n.isDirectory()) {
        if (n.name === 'node_modules' || n.name.startsWith('.') || n.name === '[lang]') continue
        walk(path.join(d, n.name), [...segs, n.name])
      } else if (/^route\.(ts|tsx|js|mjs)$/.test(n.name)) {
        // [[...x]] и [...x] — «всё дальше» (*), [x] — параметр (:x), (группа) — не часть адреса.
        const p = '/' + segs.filter((s) => !/^\(.*\)$/.test(s)).map((s) => (/^\[\[?\.\.\..+\]\]?$/.test(s) ? '*' : s.replace(/^\[(.+)\]$/, ':$1'))).join('/')
        if (privatePrefixes.some((x) => p === x || p.startsWith(`${x}/`))) continue
        let src = ''
        try { src = fs.readFileSync(path.join(d, n.name), 'utf8') } catch { /* нечитаемый — без методов */ }
        const methods = [...new Set([...src.matchAll(METHODS)].map((m) => m[1] || m[2]))]
        doors.push({ path: p === '/' ? '/' : p, methods: methods.length ? methods : ['?'] })
      }
    }
  }
  walk(app, [])
  return doors.sort((a, b) => a.path.localeCompare(b.path))
}

/** Файлы данных элемента на диске этого компьютера: базы (*.db, *.sqlite) и общий объём папки `data`. */
function dataOf(dir) {
  const base = path.join(dir, 'data')
  const dbs = []
  let bytes = 0
  let files = 0
  const walk = (d, depth) => {
    let names
    try { names = fs.readdirSync(d, { withFileTypes: true }) } catch { return }
    for (const n of names) {
      const p = path.join(d, n.name)
      if (n.isDirectory()) { if (depth < 6 && files < 50000) walk(p, depth + 1); continue }
      let size = 0
      try { size = fs.statSync(p).size } catch { /* исчез */ }
      bytes += size
      files++
      if (/\.(db|sqlite|sqlite3)$/.test(n.name)) {
        let wal = 0
        try { wal = fs.statSync(`${p}-wal`).size } catch { /* нет журнала */ }
        dbs.push({ rel: path.relative(dir, p).split(path.sep).join('/'), bytes: size, walBytes: wal })
      }
    }
  }
  walk(base, 0)
  return { exists: fs.existsSync(base), dbs, bytes, files }
}

const human = (b) => (b >= 1048576 ? `${(b / 1048576).toFixed(1)} MB` : b >= 1024 ? `${Math.round(b / 1024)} KB` : `${b} B`)

/**
 * Паспорт элемента: папкой `OWN-SERVICE-PROPS/` (шаблоны), иначе файлом в корне — так его несёт элемент из чужого репозитория (367-4).
 * 407: без второго пути такой элемент для поиска узла был безымянным: имя и описание есть только в корневом файле (`summary` — его
 * прежнее поле описания).
 */
function passportOf(dir) {
  const own = readJson(path.join(dir, 'OWN-SERVICE-PROPS', 'OWN-SERVICE-PROPS.json'), null)
  if (own) return own
  const old = readJson(path.join(dir, 'OWN-SERVICE-PROPS.json'), null)
  return old ? { ...old, shortDescription: old.shortDescription || old.summary || '' } : {}
}

/** Самоописания всех элементов реестра (одно чтение диска и один pm2 на вызов). */
function describeAll({ root = ROOT, roles = {}, addressOf = (id) => id, withMemory = true } = {}) {
  const reg = readJson(path.join(root, 'WEB4-ITEMS-REGISTRY', 'web4-items.json'), { services: [] })
  const services = reg.services ?? []
  const mem = withMemory ? pm2Memory() : new Map()
  const raw = services.map((s) => {
    const dir = dirOf(root, s)
    const passport = dir ? passportOf(dir) : {}
    const card = dir ? readJson(path.join(dir, 'OWN-SERVICE-PROPS', 'A2A-CARD.json'), {}) : {}
    const ext = (card.capabilities?.extensions ?? []).find((x) => String(x?.uri ?? '').includes('/a2a/ext/node/'))?.params ?? {}
    const privatePrefixes = Array.isArray(ext.private) ? ext.private : []
    const off = s.off && typeof s.off === 'object' ? (typeof s.off.reason === 'string' ? s.off.reason : s.off.reason?.en ?? 'no reason') : null
    return {
      id: s.id,
      address: addressOf(s.id),
      name: passport.name || s.id,
      kind: passport.elementType === 'custom' || s.born || s.id === 'root' ? 'custom' : 'native',
      port: s.port ?? null,
      folder: dir ? path.relative(root, dir).split(path.sep).join('/') : null,
      visibility: passport.visibility || ext.visibility || null,
      on: !off,
      offReason: off,
      byRule: Boolean(s.powerAuto),
      role: roles[s.id] || s.role || '',
      short: passport.shortDescription || '',
      long: passport.longDescription || '',
      accepts: passport.accepts || '',
      returns: passport.returns || '',
      calls: Array.isArray(passport.calls) ? passport.calls : [],
      skills: (card.skills ?? []).map((k) => ({ id: k.id, description: k.description || '', examples: k.examples || [] })),
      doors: dir ? scanDoors(dir, privatePrefixes) : [],
      data: dir ? dataOf(dir) : { exists: false, dbs: [], bytes: 0, files: 0 },
      memory: { process: mem.get(`fractera-svc-${s.id}`)?.mb ?? null, watcher: mem.get(`fractera-svc-${s.id}-watch`)?.mb ?? null },
    }
  })
  // Общее для шаблона — по данным: навык или дверь у большинства элементов.
  const count = (pick) => {
    const m = new Map()
    for (const e of raw) for (const k of new Set(pick(e))) m.set(k, (m.get(k) ?? 0) + 1)
    return m
  }
  const skillCount = count((e) => e.skills.map((k) => k.id))
  const doorCount = count((e) => e.doors.map((d) => d.path))
  const isCommon = (n) => raw.length >= 3 && n / raw.length >= COMMON_SHARE
  const commonSkills = [...skillCount].filter(([, n]) => isCommon(n)).map(([k]) => k).sort()
  const commonDoors = [...doorCount].filter(([, n]) => isCommon(n)).map(([k]) => k).sort()
  return raw.map((e) => ({
    ...e,
    ownSkills: e.skills.filter((k) => !commonSkills.includes(k.id)),
    ownDoors: e.doors.filter((d) => !commonDoors.includes(d.path)),
    commonSkills,
    calledBy: raw.filter((o) => o.id !== e.id && o.calls.includes(e.id)).map((o) => o.id),
  }))
}

const firstSentence = (t, n = 240) => {
  const s = String(t || '').trim()
  const m = s.match(/^(.+?[.!?])(\s|$)/)
  const one = m ? m[1] : s
  return one.length > n ? `${one.slice(0, n - 1)}…` : one
}

/** Одна строка о элементе для списка (`contacts --all`). */
function listLine(e) {
  const what = e.short || e.role || firstSentence(e.long) || 'no description yet'
  return `- ${e.id} · ${e.address} · ${e.kind} · ${e.on ? 'on' : `OFF (${e.offReason})`} — ${firstSentence(what, 260)}`
}

/** Полное самоописание одного элемента (`card <id>`): ответы на вопросы «что это, где живёт, где данные, как вызвать, с кем связан». */
function cardText(e) {
  const lines = []
  const mem = [e.memory.process != null ? `process ${e.memory.process} MB` : null, e.memory.watcher != null ? `watcher ${e.memory.watcher} MB` : null].filter(Boolean).join(' + ')
  lines.push(`${e.id} · ${e.name} · ${e.kind} element · ${e.on ? `on${e.byRule ? ' (turned on by the node: free memory above 1 GB)' : ''}` : `TURNED OFF (${e.offReason})`}${mem ? ` · memory ${mem}` : ''}`)
  lines.push(`What it is: ${e.short || e.role || 'no description in its passport yet'}`)
  if (e.long) lines.push(`What it does: ${e.long}`)
  if (e.role && e.role !== e.short) lines.push(`Its role in this node: ${e.role}`)
  lines.push(`Where it lives: a process on this computer (port ${e.port ?? '?'}), folder ${e.folder ?? '?'}, address ${e.address}${e.visibility === 'node' ? '; reachable only inside this node, never from the internet' : e.visibility ? `; visibility ${e.visibility}` : ''}.`)
  if (e.data.dbs.length) {
    lines.push(`Its data: on this computer's disk — ${e.data.dbs.map((d) => `${d.rel} (${human(d.bytes)}${d.walBytes ? ` + journal ${human(d.walBytes)}` : ''})`).join(', ')}; the data folder holds ${e.data.files} file(s), ${human(e.data.bytes)}. No cloud, no subscription.`)
  } else if (e.data.exists && e.data.bytes > 0) {
    lines.push(`Its data: on this computer's disk — ${e.data.files} file(s) in ${e.folder}/data, ${human(e.data.bytes)}. No cloud, no subscription.`)
  } else {
    lines.push('Its data: keeps none of its own here (it uses the node\'s data elements).')
  }
  if (e.accepts) lines.push(`Takes: ${e.accepts}`)
  if (e.returns) lines.push(`Gives: ${e.returns}`)
  lines.push(`It calls: ${e.calls.length ? e.calls.join(', ') : 'nobody'} · called by: ${e.calledBy.length ? `${e.calledBy.length} element(s) — ${e.calledBy.join(', ')}` : 'nobody named in passports'}`)
  // Дверь, принимающая все пять методов, — «any»: перечислять их — шум.
  const methodsOf = (d) => (d.methods.length >= 5 ? 'any' : d.methods.join('/'))
  if (e.ownDoors.length) lines.push(`Its own doors: ${e.ownDoors.map((d) => `${methodsOf(d)} ${d.path}`).join(' · ')}`)
  else lines.push('Its own doors: none besides the ones every element has')
  for (const k of e.ownSkills) lines.push(`Skill ${k.id} — ${firstSentence(k.description, 220)}`)
  if (e.commonSkills.length) lines.push(`Like every element it also has: ${e.commonSkills.join(', ')} (the shared frame of the template).`)
  return lines.join('\n')
}

// ── Поиск по смыслу ─────────────────────────────────────────────────────────────────────────────────────────────────────────────

function indexText(e) {
  return [e.name, e.short, e.long, e.role && e.role !== e.short ? e.role : '', ...e.ownSkills.map((k) => `${k.id.replace(/-/g, ' ')}: ${k.description} ${k.examples.join('; ')}`)]
    .filter(Boolean).join(' ').replace(/\s+/g, ' ').trim().slice(0, 6000)
}

/**
 * Ближайшие по смыслу элементы к словам задачи: [{ id, score }] (лучший первым) или null, если поиск по смыслу недоступен (нет ключа OpenAI в
 * ядре, нет элемента vectors или data). Индекс обновляется только для изменившихся текстов; удалённые элементы из него стираются.
 */
async function findByMeaning(query, descriptions, { k = 5, ms = 15000 } = {}) {
  let embed
  try { embed = require('../agent-kit/memory/embed.cjs') } catch { return null }
  const e = embed.env()
  const base = embed.dataUrl()
  if (!base || !e.DATA_SECRET || !e.OPENAI_API_KEY) return null
  try {
    const kind = await embed.kind(e, base, ms)
    const ledger = { items: {}, ...readJson(INDEX_LEDGER, {}) }
    if (ledger.model !== kind.model || ledger.dims !== kind.dims) ledger.items = {}
    const texts = descriptions.map((d) => ({ id: d.id, text: indexText(d) }))
    const stale = texts.filter((t) => ledger.items[t.id] !== crypto.createHash('sha1').update(t.text).digest('hex'))
    const headers = { 'X-Data-Secret': e.DATA_SECRET, 'Content-Type': 'application/json' }
    if (stale.length) {
      const { vectors } = await embed.vectorsOf(stale.map((t) => t.text), { e, ...kind, ms })
      await Promise.all(stale.map((t, i) => embed.call(`${base}/vectors`, { method: 'POST', headers, body: JSON.stringify({ id: `self-${t.id}`, collection: COLLECTION, text: t.text, embedding: vectors[i], refTable: 'element', refId: t.id }) }, ms)))
      for (const t of stale) ledger.items[t.id] = crypto.createHash('sha1').update(t.text).digest('hex')
    }
    const alive = new Set(texts.map((t) => t.id))
    for (const id of Object.keys(ledger.items)) {
      if (alive.has(id)) continue
      await embed.call(`${base}/vectors/self-${id}`, { method: 'DELETE', headers }, ms).catch(() => null)
      delete ledger.items[id]
    }
    fs.mkdirSync(path.dirname(INDEX_LEDGER), { recursive: true })
    fs.writeFileSync(INDEX_LEDGER, JSON.stringify({ model: kind.model, dims: kind.dims, items: ledger.items }, null, 2) + '\n')
    const { vectors: [probe] } = await embed.vectorsOf([query], { e, ...kind, ms })
    const r = await embed.call(`${base}/vectors/search`, { method: 'POST', headers, body: JSON.stringify({ collection: COLLECTION, embedding: probe, k: Math.max(k, texts.length) }) }, ms)
    const best = new Map()
    for (const x of r?.results ?? []) {
      const id = x.refId || String(x.id).replace(/^self-/, '')
      if (alive.has(id) && !best.has(id)) best.set(id, x.score)
    }
    return [...best].map(([id, score]) => ({ id, score })).sort((a, b) => b.score - a.score)
  } catch {
    return null
  }
}

module.exports = { describeAll, passportOf, listLine, cardText, findByMeaning, indexText, COLLECTION }
