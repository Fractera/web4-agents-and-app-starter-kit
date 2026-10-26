// ЯЧЕЙКИ TELEGRAM-БОТОВ ЭЛЕМЕНТА (узел, шаг 552-6): кроме бота H2A (`telegram.cjs`, папка `channel/telegram`) у элемента с группами
// навыков ещё три бота — `h2h` (Messenger → H2H), `orders` (Рабочий процесс → A2A: ваши заказы), `work` (A2A: ваша работа).
//
// Владелец 2026-10-20: «поднимем четыре телеграмма … Просто сделаем здесь такой же подключение телеграмма но подставим эти названия в
// будущем будем думать как с ними работать»; активация — «Как у H2A, с опросом»; ручка — «Полностью, обрезая адрес»; «remember about
// saving info to own service props»; «научи ядро при необходимости работать с этими агентами то есть если ядро решила написать
// человеку через Messenger она должна сумме это сделать».
//
// 🔒 У каждой ячейки своя папка `data/services/<id>/channel/telegram-<ячейка>` — те же файлы, что у бота H2A (`.env` с токеном, `bot.json`,
// `access.json`, `activation.json`); токен наружу не отдаётся никогда.
// 🔒 Опрос ячейки делает ровно две вещи: впускает по ссылке `t.me/<бот>?start=<метка>` и допущенному на любое сообщение отвечает одной
// строкой «бот подключён, работа с ним строится». Агента НЕ будит и сессии не рождает — как с ботами работать, владелец решит потом.
// 🔒 Писать человеку через бота ячейки может ядро (`send`, дверь `/api/agents/telegram`) — только допущенным по ссылке.

const { randomBytes } = require('node:crypto')
const { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } = require('node:fs')
const path = require('node:path')
const { serviceDir } = require('./workspace.cjs')
const telegram = require('./telegram.cjs')

const { tg, readJson, writeSecret, personLang } = telegram
const ROOT = process.cwd()

/** Ячейка → слова имени: режим и ячейка (владелец: «template messenger H2H … template workspace work»). `h2a` — нынешний бот. */
const SLOTS = { h2a: ['messenger', 'h2a'], h2h: ['messenger', 'h2h'], orders: ['workspace', 'orders'], work: ['workspace', 'work'] }
const EXTRA = ['h2h', 'orders', 'work']
const TOKEN_SHAPE = /^\d{6,}:[A-Za-z0-9_-]{30,}$/
const ACTIVATION_LIFETIME_MS = 60 * 60 * 1000
const IDLE_POLL_MS = 3000
// Ответ опроса — на языке человека бота H2A (`person.json`), иначе английский.
const ANSWER = {
  en: (bot) => `This bot (@${bot}) is connected to the element. How it will work is still being built.`,
  ru: (bot) => `Этот бот (@${bot}) подключён к элементу. Как он будет работать, ещё строится.`,
}

const isExtra = (slot) => EXTRA.includes(slot)
const dir = (service, slot) => path.join(ROOT, 'data', 'services', service, 'channel', `telegram-${slot}`)
const file = (service, slot, name) => path.join(dir(service, slot), name)

function token(service, slot) {
  try {
    const line = readFileSync(file(service, slot, '.env'), 'utf8').split(/\r?\n/).find((l) => l.startsWith('TELEGRAM_BOT_TOKEN='))
    return line ? line.slice('TELEGRAM_BOT_TOKEN='.length).trim() : ''
  } catch {
    return ''
  }
}

const allowed = (service, slot) => {
  const a = readJson(file(service, slot, 'access.json'), {})
  return Array.isArray(a.allowFrom) ? a.allowFrom.map(String) : []
}

/** Есть ли у элемента группы навыков — только у такого четыре бота и новые имена (как весь шаг 552). */
const grouped = (service) => telegram.hasSkillGroups(serviceDir(service))

/** Имя и ручка для BotFather — правило одно, в `telegram.cjs` (`namedSuggestion`): ручка ≤ 32, адрес элемента обрезается. */
const suggestion = (service, slot) => telegram.namedSuggestion(service, ...SLOTS[slot])

async function saveToken(service, slot, raw) {
  const t = String(raw ?? '').trim()
  if (!t) return { ok: false, error: 'empty-token' }
  if (!TOKEN_SHAPE.test(t)) return { ok: false, error: 'bad-format' }
  // Один бот — одна ячейка: тот же токен в другой ячейке или у бота H2A дал бы боту двух читателей (409).
  const taken = [...EXTRA.filter((s) => s !== slot).map((s) => token(service, s)), telegram.storedToken(service)]
  if (taken.includes(t)) return { ok: false, error: 'token-used-by-another-bot' }
  const me = await tg(t, 'getMe')
  if (me.description === 'unreachable') return { ok: false, error: 'telegram-unreachable' }
  if (!me.ok || !me.result?.username) return { ok: false, error: 'token-rejected' }
  mkdirSync(dir(service, slot), { recursive: true })
  writeFileSync(file(service, slot, 'bot.json'), JSON.stringify({ name: me.result.first_name ?? '', username: me.result.username }, null, 2))
  writeSecret(file(service, slot, '.env'), `TELEGRAM_BOT_TOKEN=${t}\n`)
  if (!existsSync(file(service, slot, 'access.json'))) {
    writeSecret(file(service, slot, 'access.json'), JSON.stringify({ dmPolicy: 'allowlist', allowFrom: [], groups: {}, pending: {} }, null, 2))
  }
  startPoller(service, slot)
  return { ok: true, tail: t.slice(-4), username: me.result.username, name: me.result.first_name ?? '' }
}

/** Ссылка допуска: одна метка на час, повторный запрос отдаёт ту же. */
function activationLink(service, slot) {
  const bot = readJson(file(service, slot, 'bot.json'), {})
  if (!bot.username) return { ok: false, error: 'no-bot-username' }
  let nonce = ''
  const a = readJson(file(service, slot, 'activation.json'), null)
  if (a?.nonce && Date.now() - a.createdAt < ACTIVATION_LIFETIME_MS) nonce = a.nonce
  if (!nonce) {
    nonce = randomBytes(12).toString('hex')
    writeSecret(file(service, slot, 'activation.json'), JSON.stringify({ createdAt: Date.now(), nonce }))
  }
  return { ok: true, url: `https://t.me/${bot.username}?start=${nonce}` }
}

function state(service, slot) {
  const t = token(service, slot)
  const bot = readJson(file(service, slot, 'bot.json'), {})
  return {
    service, slot,
    configured: Boolean(t),
    tail: t ? t.slice(-4) : null,
    botName: bot.name ?? null,
    botUsername: bot.username ?? null,
    allowed: allowed(service, slot).length,
    running: false,
    terminalWithoutChannel: false,
    stateDir: dir(service, slot),
    suggestion: suggestion(service, slot),
  }
}

/** Боты элемента для паспорта и главного агента: `{ <ячейка>: { username, name, people } }`, без токенов; H2A — из `telegram.cjs`. */
function bots(service) {
  const out = {}
  const main = readJson(path.join(telegram.stateDir(service), 'bot.json'), {})
  if (main.username && telegram.storedToken(service)) {
    const a = readJson(path.join(telegram.stateDir(service), 'access.json'), {})
    out.h2a = { username: main.username, name: main.name ?? '', people: Array.isArray(a.allowFrom) ? a.allowFrom.length : 0 }
  }
  for (const slot of EXTRA) {
    const bot = readJson(file(service, slot, 'bot.json'), {})
    if (bot.username && token(service, slot)) out[slot] = { username: bot.username, name: bot.name ?? '', people: allowed(service, slot).length }
  }
  return out
}

/** Написать допущенным бота ячейки (ядро → человек). `h2a` — нынешний бот элемента. */
async function send(service, slot, text) {
  const body = String(text ?? '').trim()
  if (!body) return { ok: false, error: 'empty-text' }
  const t = slot === 'h2a' ? telegram.storedToken(service) : token(service, slot)
  if (!t) return { ok: false, error: 'no-bot' }
  const chats = slot === 'h2a'
    ? (readJson(path.join(telegram.stateDir(service), 'access.json'), {}).allowFrom ?? []).map(String)
    : allowed(service, slot)
  if (!chats.length) return { ok: false, error: 'nobody-activated' }
  let sent = 0
  for (const chat of chats) {
    const r = await tg(t, 'sendMessage', { chat_id: chat, text: body.slice(0, 4000), disable_web_page_preview: true })
    if (r.ok) sent++
  }
  return sent ? { ok: true, sent } : { ok: false, error: 'telegram-refused' }
}

async function tick(service, slot) {
  const t = token(service, slot)
  if (!t) return
  const got = await tg(t, 'getUpdates', { allowed_updates: ['message'], timeout: 0 })
  if (!got.ok || !Array.isArray(got.result) || got.result.length === 0) return
  const updates = got.result
  await tg(t, 'getUpdates', { offset: updates[updates.length - 1].update_id + 1, timeout: 0 })
  const a = readJson(file(service, slot, 'activation.json'), null)
  const nonce = a && Date.now() - a.createdAt < ACTIVATION_LIFETIME_MS ? a.nonce : ''
  const bot = readJson(file(service, slot, 'bot.json'), {}).username ?? ''
  const answered = new Set()
  for (const u of updates) {
    const msg = u.message
    if (!msg || msg.chat?.type !== 'private' || !msg.from) continue
    const sender = String(msg.from.id)
    if (nonce && typeof msg.text === 'string' && msg.text.trim() === `/start ${nonce}`) {
      const acc = { dmPolicy: 'allowlist', allowFrom: [], groups: {}, pending: {}, ...readJson(file(service, slot, 'access.json'), {}) }
      if (!acc.allowFrom.map(String).includes(sender)) acc.allowFrom.push(sender)
      writeSecret(file(service, slot, 'access.json'), JSON.stringify(acc, null, 2))
      rmSync(file(service, slot, 'activation.json'), { force: true })
    } else if (!allowed(service, slot).includes(sender)) {
      continue // чужим бот не отвечает: список допущенных — единственная граница
    }
    if (answered.has(msg.chat.id)) continue
    answered.add(msg.chat.id)
    const say = ANSWER[personLang(service)] ?? ANSWER.en
    await tg(t, 'sendMessage', { chat_id: msg.chat.id, text: say(bot) })
  }
}

/** Опрос ячейки — один на ячейку в процессе (ключ в `globalThis`), повторный вызов безвреден. */
function startPoller(service, slot) {
  if (!isExtra(slot)) return
  const key = `__web4TelegramSlot:${service}:${slot}`
  if (globalThis[key]) return
  let busy = false
  globalThis[key] = setInterval(async () => {
    if (busy) return
    busy = true
    try { await tick(service, slot) } catch (err) { console.error(`[telegram ${slot}] узел не прочитал бота «${service}»: ${err instanceof Error ? err.message : err}`) }
    busy = false
  }, IDLE_POLL_MS)
  globalThis[key].unref?.()
}

/** При старте узла — опрос каждой ячейки с токеном. */
function startPollers(service) {
  for (const slot of EXTRA) if (token(service, slot)) startPoller(service, slot)
}

module.exports = { SLOTS, EXTRA, isExtra, grouped, suggestion, saveToken, activationLink, state, bots, send, startPollers }
