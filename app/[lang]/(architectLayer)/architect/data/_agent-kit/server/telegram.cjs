// КАНАЛ TELEGRAM → CLAUDE CODE В ПАПКЕ АГЕНТА УЗЛА (267-3).
//
// Перенос `fractera-memory-starter/lib/channel/{telegram,identity,activation}.mjs` с двумя переменами:
//   1. `bash`, `setsid`, `HOME=/root` → ничего из этого: пути строятся `path.join` от `os.homedir()`;
//   2. папка состояния — `<узел>/data/services/<служба>/channel/telegram`, а не внутри папки службы: та —
//      клон её репозитория, и файлы бота сделали бы его грязным (закон узла о данных служб).
//
// 🔒 ОДНА СЛУЖБА — ОДНА СЕССИЯ CLAUDE CODE, И БОТ РАБОТАЕТ В НЕЙ (решение владельца 2026-09-22). Отдельного
// жителя под pm2 больше нет: терминал узла запускает `claude --channels …`, поэтому всё, что человек пишет в
// Telegram, видно в терминале, а без Telegram он продолжает ту же работу там. Запуск и остановка — ТОЛЬКО во
// вкладке «Терминал»; страница бота лишь показывает состояние.
// 🪦 До этого решения житель `scripts/agent-channel.cjs` держал ВТОРОЙ `claude` для бота — переписку в
// терминале не видел никто, а кнопки «Запустить/Остановить канал» управляли не тем, что человек видел.
//
// 🔒 ПЛАГИН ОФИЦИАЛЬНЫЙ: `telegram@claude-plugins-official`, сервер запускается `bun run` (первоисточник —
// `.mcp.json` плагина). `TELEGRAM_STATE_DIR` — своя папка на экземпляр, дословно из его README: «To run
// multiple bots on one machine… point TELEGRAM_STATE_DIR at a different directory per instance».
//
// 🔒 ПОКА ТЕРМИНАЛ ВЫКЛЮЧЕН, БОТА ЧИТАЕТ УЗЕЛ (`startIdlePoller(service)`, зовёт `lib/agent-kit/mount.cjs`). Он делает две вещи:
// впускает по ссылке `t.me/<бот>?start=<метка>` и на любое сообщение допущенного отвечает системным
// сообщением о состоянии — раньше, чем человек поймёт, что ему никто не отвечает. У бота один
// опрашиватель: как только терминал запущен с каналом, узел замолкает и бота читает плагин.

const { spawn } = require('node:child_process')
const { createHash, randomBytes } = require('node:crypto')
const { chmodSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const { isBornItem, serviceDir } = require('./workspace.cjs')
const session = require('./session.cjs')
const { claudeAuthState, extraBins, resolveBin } = require('./claude-cli.cjs')
const { tableFor } = require('./translate.cjs')
// 552-6: имя бота по режиму — только у элементов с группами навыков (тот же признак, что `hasGroups` в `lib/agent-kit/modes.cjs`).
// 🛑 Модуль режимов здесь не подключается: этот файл импортирует дверь `agent-api/channel/route.ts`, его собирает Turbopack, и
// `require(path.join(process.cwd(), …))` в сборке не разрешается («server relative imports are not implemented yet», ✗ 552-6 —
// 27 ошибок сборки). Мост так делать может: его загружают при работе, а не сборкой.
const hasSkillGroups = (dir) => Boolean(dir) && existsSync(path.join(dir, '.claude', 'skills', 'build-skills', '.claude-plugin', 'plugin.json'))

const ROOT = process.cwd()
const PLUGIN = 'telegram@claude-plugins-official'
const TOKEN_SHAPE = /^\d{6,}:[A-Za-z0-9_-]{30,}$/
const ACTIVATION_LIFETIME_MS = 60 * 60 * 1000
// 409-3: раз в 3 с (владелец 2026-10-05) — нажатие «Запустить» узел видит не позже чем через 3 с.
const IDLE_POLL_MS = 3000

const stateDir = (service) => path.join(ROOT, 'data', 'services', service, 'channel', 'telegram')
const envFile = (service) => path.join(stateDir(service), '.env')
const accessFile = (service) => path.join(stateDir(service), 'access.json')
const botFile = (service) => path.join(stateDir(service), 'bot.json')
const activationFile = (service) => path.join(stateDir(service), 'activation.json')
const messagesFile = (service) => path.join(stateDir(service), 'messages.json')
const pendingFile = (service) => path.join(ROOT, 'data', 'services', service, 'wake', 'pending.json')

function readJson(file, fallback) {
  try { return JSON.parse(readFileSync(file, 'utf8')) } catch { return fallback }
}

/** Файлы с секретом — только владельцу. На Windows права задаёт ACL папки пользователя, `chmod` там пуст. */
function writeSecret(file, text) {
  mkdirSync(path.dirname(file), { recursive: true })
  writeFileSync(file, text, { mode: 0o600 })
  try { chmodSync(file, 0o600) } catch { /* Windows */ }
}

function storedToken(service) {
  try {
    const line = readFileSync(envFile(service), 'utf8').split(/\r?\n/).find((l) => l.startsWith('TELEGRAM_BOT_TOKEN='))
    return line ? line.slice('TELEGRAM_BOT_TOKEN='.length).trim() : ''
  } catch {
    return ''
  }
}

async function tg(token, method, params = {}) {
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
      signal: AbortSignal.timeout(10_000),
    })
    return (await res.json().catch(() => null)) ?? { ok: false }
  } catch {
    return { ok: false, description: 'unreachable' }
  }
}

/** Сохранить токен, проверив его у самого Telegram (`getMe`): форма ещё не значит «рабочий». */
async function saveToken(service, raw) {
  const token = String(raw ?? '').trim()
  if (!token) return { ok: false, error: 'empty-token' }
  if (!TOKEN_SHAPE.test(token)) return { ok: false, error: 'bad-format' }
  const me = await tg(token, 'getMe')
  if (me.description === 'unreachable') return { ok: false, error: 'telegram-unreachable' }
  if (!me.ok || !me.result?.username) return { ok: false, error: 'token-rejected' }
  mkdirSync(stateDir(service), { recursive: true })
  writeFileSync(botFile(service), JSON.stringify({ name: me.result.first_name ?? '', username: me.result.username }, null, 2))
  writeSecret(envFile(service), `TELEGRAM_BOT_TOKEN=${token}\n`)
  if (!existsSync(accessFile(service))) {
    writeSecret(accessFile(service), JSON.stringify({ dmPolicy: 'allowlist', allowFrom: [], groups: {}, pending: {} }, null, 2))
  }
  return { ok: true, tail: token.slice(-4), username: me.result.username }
}

function access(service) {
  const a = readJson(accessFile(service), {})
  return { allowed: Array.isArray(a.allowFrom) ? a.allowFrom.map(String) : [] }
}

/** Ссылка допуска: одна метка на час, повторный запрос отдаёт ту же. */
function activationLink(service) {
  const bot = readJson(botFile(service), {})
  if (!bot.username) return { ok: false, error: 'no-bot-username' }
  let nonce = ''
  const a = readJson(activationFile(service), null)
  if (a?.nonce && Date.now() - a.createdAt < ACTIVATION_LIFETIME_MS) nonce = a.nonce
  if (!nonce) {
    nonce = randomBytes(12).toString('hex')
    writeSecret(activationFile(service), JSON.stringify({ createdAt: Date.now(), nonce }))
  }
  return { ok: true, url: `https://t.me/${bot.username}?start=${nonce}` }
}

/** Служба узла с папкой — единственные имена, от которых строятся пути и запускается агент. */
function isService(service) {
  return serviceDir(service) !== null
}

// ── СЕССИЯ ТЕРМИНАЛА С КАНАЛОМ ───────────────────────────────────────────────

/** Бот работает, если сессия терминала жива И запущена с каналом (запущенная до допуска — без него). */
function running(service) {
  const s = session.current(service)
  return Boolean(s && s.channel)
}

/** Терминал жив без канала — его запустили до того, как бот был подключён. */
function terminalWithoutChannel(service) {
  const s = session.current(service)
  return Boolean(s && !s.channel)
}

/**
 * 🛑 ЗАВИСИМОСТИ ПЛАГИНА СТАВЯТСЯ ДО ЗАПУСКА `claude`. ✗ Оплачено живым прогоном владельца 2026-09-22: сервер
 * плагина при ПЕРВОМ старте сам делает `bun install`, а `claude` ждёт подключения сервера 30 с (журнал
 * `--debug mcp`). Первая установка в них не укладывалась — бот молчал. Путь плагина — из
 * `~/.claude/plugins/installed_plugins.json`: у каждой машины он свой. Асинхронно — сервер сайта не встаёт.
 */
function preparePlugin(env) {
  return new Promise((resolve) => {
    const reg = readJson(path.join(os.homedir(), '.claude', 'plugins', 'installed_plugins.json'), {})
    const installPath = reg.plugins?.[PLUGIN]?.[0]?.installPath ?? ''
    if (!installPath) return resolve({ ok: false, error: `плагин ${PLUGIN} не установлен: claude plugin install ${PLUGIN}` })
    if (existsSync(path.join(installPath, 'node_modules'))) return resolve({ ok: true })
    const bun = resolveBin('bun', env.PATH || env.Path)
    if (!bun) return resolve({ ok: false, error: 'bun не найден — сервер плагина Telegram запускается им' })
    const child = spawn(bun, ['install', '--no-summary'], { cwd: installPath, env, windowsHide: true })
    let out = ''
    child.stdout.on('data', (d) => { out += d })
    child.stderr.on('data', (d) => { out += d })
    const timer = setTimeout(() => child.kill(), 300_000)
    child.on('close', (code) => {
      clearTimeout(timer)
      resolve(code === 0 ? { ok: true } : { ok: false, error: `bun install в ${installPath} не удался: ${out.slice(-300)}` })
    })
    child.on('error', (err) => {
      clearTimeout(timer)
      resolve({ ok: false, error: `bun install не запустился: ${err.message}` })
    })
  })
}

/**
 * Как запустить `claude` терминала, чтобы бот работал в нём. Нет токена или никого не допустили — `null`:
 * терминал запускается обычным агентом.
 * 🛑 `--permission-mode auto` ОБЯЗАТЕЛЕН: запрос разрешения ушёл бы в тот же канал, который ждёт ответа, и
 * сессия встала бы намертво, пока человек пишет с телефона (оплачено двумя часами молчания бота 2026-09-05).
 * 🛑 `--add-dir` папки состояния: без него — вопрос политики путей, который плагин не пересылает (закон проекта).
 */
async function channelLaunch(service, env) {
  if (!storedToken(service) || access(service).allowed.length === 0) return null
  const pathKey = Object.keys(env).find((k) => k.toUpperCase() === 'PATH') || 'PATH'
  const dirs = [...extraBins(), ...String(env[pathKey] || '').split(path.delimiter).filter(Boolean)]
  const withBins = { ...env, [pathKey]: dirs.join(path.delimiter), TELEGRAM_STATE_DIR: stateDir(service) }
  const ready = await preparePlugin(withBins)
  if (!ready.ok) return { ok: false, error: ready.error }
  return {
    ok: true,
    env: withBins,
    args: ['--channels', `plugin:${PLUGIN}`, '--add-dir', stateDir(service), '--permission-mode', 'auto', ...githubRule(service)],
  }
}

/**
 * 374-4 (слово владельца 2026-10-02: «работу через Telegram бот, коммит автоматически всегда» — «коммит и сразу отправка в
 * GitHub»; в терминале — «нельзя запрещать делать коммит по требованию»). Правило дописывается к запуску агента ЭЛЕМЕНТА: агент
 * узла (`workspace: node`) правит само ядро, его отправка в GitHub — не этот путь. Один комплект на все элементы — правило
 * получают все, без правки репозиториев элементов. Команда — скрипт ядра по абсолютному пути (дверь «Отправить» по петле).
 */
function githubRule(service) {
  const manifestFile = path.join(process.cwd(), 'app', '[lang]', '(architectLayer)', 'architect', String(service), 'agent-kit.json')
  try {
    if (['node', 'main-agent'].includes(JSON.parse(readFileSync(manifestFile, 'utf8')).workspace)) return []
  } catch { /* общая копия [item] или служба без манифеста — элемент */ }
  const script = path.join(process.cwd(), 'scripts', 'element-github-push.mjs')
  return ['--append-system-prompt', `GitHub rule of this WEB4 ITEM (node step 374). When a task comes through the Telegram channel, finish it, commit your changes and immediately send them to GitHub by running: node "${script}" ${service} — then tell the person the line it printed (===GITHUB_PUSH_OK=== or the reason). For a task typed in this terminal, commit as your instructions say and send to GitHub only when the person asks — with the same command.`]
}

// ── СИСТЕМНОЕ СООБЩЕНИЕ О СОСТОЯНИИ ───────────────────────────────────────────

/**
 * Тексты сообщения приносит страница бота на языке человека и с адресами разделов от того адреса, на котором
 * она открыта (на своём домене это публичные ссылки для телефона). Узел их хранит, потому что отвечает боту и
 * тогда, когда страница закрыта.
 */
function saveMessages(service, raw) {
  const pick = (v) => String(v ?? '').slice(0, 1000)
  const m = { active: pick(raw?.active), inactive: pick(raw?.inactive), noSubscription: pick(raw?.noSubscription) }
  if (!m.active || !m.inactive || !m.noSubscription) return { ok: false, error: 'bad-messages' }
  mkdirSync(stateDir(service), { recursive: true })
  writeFileSync(messagesFile(service), JSON.stringify(m, null, 2))
  // 411: язык страницы, где человек подключал бота, — начальный язык человека.
  if (raw?.lang) setPersonLang(service, raw.lang, 'page')
  return { ok: true }
}

const FALLBACK = {
  active: 'This message was sent by your node. Your terminal is active — write, Claude Code answers.',
  inactive: 'This message was sent by your node. Your terminal is not active — Claude Code will not answer. Open the node terminal and start the agent.',
  noSubscription: 'This message was sent by your node. Claude Code on this computer is not signed in to a subscription. Sign in first, then start the agent in the terminal.',
}

function claudeSignedIn() {
  return new Promise((resolve) => setImmediate(() => resolve(claudeAuthState().loggedIn)))
}

/** Состояние словами: подписка не подключена → сначала она; иначе — активен ли терминал. */
async function statusMessage(service) {
  const m = { ...FALLBACK, ...readJson(messagesFile(service), {}) }
  if ((await claudeSignedIn()) === false) return m.noSubscription
  return running(service) ? m.active : m.inactive
}

// ── УЗЕЛ ЧИТАЕТ БОТА, ПОКА ТЕРМИНАЛ ВЫКЛЮЧЕН ─────────────────────────────────

const idleKey = (service) => `__web4TelegramIdle:${service}`

async function idleTick(service) {
  const token = storedToken(service)
  if (!token || running(service)) return
  const got = await tg(token, 'getUpdates', { allowed_updates: ['message', 'callback_query'], timeout: 0 })
  // 409 — бота читает кто-то другой (канал только что поднялся): уступаем без шума.
  if (!got.ok || !Array.isArray(got.result) || got.result.length === 0) return
  if (running(service)) return
  const updates = got.result
  await tg(token, 'getUpdates', { offset: updates[updates.length - 1].update_id + 1, timeout: 0 })

  const a = readJson(activationFile(service), null)
  const nonce = a && Date.now() - a.createdAt < ACTIVATION_LIFETIME_MS ? a.nonce : ''
  const answered = new Set()
  for (const u of updates) {
    if (u.callback_query) { await onButton(service, token, u.callback_query); continue }
    const msg = u.message
    if (!msg || msg.chat?.type !== 'private' || !msg.from) continue
    const sender = String(msg.from.id)
    let activated = false
    if (nonce && typeof msg.text === 'string' && msg.text.trim() === `/start ${nonce}`) {
      const acc = { dmPolicy: 'allowlist', allowFrom: [], groups: {}, pending: {}, ...readJson(accessFile(service), {}) }
      if (!acc.allowFrom.map(String).includes(sender)) acc.allowFrom.push(sender)
      writeSecret(accessFile(service), JSON.stringify(acc, null, 2))
      rmSync(activationFile(service), { force: true })
      activated = true
    } else if (!access(service).allowed.includes(sender)) {
      // Чужим узел не отвечает: список допущенных — единственная граница бота.
      continue
    }
    // 597-4: the main agent's bot gets the node's menu in this person's chat at the moment of the link (scope chat stands above the
    // plugin's own menu).
    if (activated && service === 'build') {
      try { await nodeCommands().applyMenu(token, [sender], personLang(service)) } catch { /* the menu is a convenience — `npm run commands -- menu` sets it again */ }
    }
    // 409-4 (владелец 2026-10-05: агент просыпается «и на сообщение в Telegram», с подтверждением до старта): текст
    // допущенного при выключенном терминале — не «терминал не активен», а тот же вопрос с кнопками; после «Запустить» агент
    // получает это сообщение. 597-4: с вещью и подписью; команды узла — по `idleDecision`; прочие «/…» и неподключённая
    // подписка — прежнее сообщение о состоянии.
    const d = activated ? { do: 'status' } : idleDecision(msg)
    if (d.do === 'list') {
      await tg(token, 'sendMessage', { chat_id: msg.chat.id, text: await commandsText(service), disable_web_page_preview: true })
      continue
    }
    if (d.do !== 'status' && (await claudeSignedIn()) !== false) {
      const t = await askTable(service)
      const a = shortName(named(service))
      // Владелец 2026-10-06: «выключи» выключенному агенту — не повод его включать; ответ «уже выключен».
      if (d.do === 'already-off') {
        await tg(token, 'sendMessage', { chat_id: msg.chat.id, text: (t.alreadyOff ?? ASK.en.alreadyOff)(a) })
        continue
      }
      // 597-4: «включить» — само согласие человека: агент стартует без поручения (ноль токенов), вопроса с кнопками нет.
      if (d.do === 'start') {
        const out = typeof starter === 'function' ? await starter(service, {}) : { ok: false, reason: 'no-starter' }
        const said = out.ok ? (t.onNow ?? ASK.en.onNow)(a) : out.reason === 'memory' ? t.memory(a, out.freeMb, out.perSessionMb) : t.failed(a, String(out.reason ?? 'unknown'))
        await tg(token, 'sendMessage', { chat_id: msg.chat.id, text: said, disable_web_page_preview: true })
        continue
      }
      const who = [msg.from.first_name, msg.from.last_name].filter(Boolean).join(' ') || msg.from.username || sender
      const said = d.text || `(${d.thing?.label ?? 'сообщение'})`
      await askToStart(service, { text: humanPrompt(service, msg.chat.id, who, said, d.thing), from: who, about: said, kind: 'human' })
      continue
    }
    if (answered.has(msg.chat.id)) continue
    answered.add(msg.chat.id)
    await tg(token, 'sendMessage', { chat_id: msg.chat.id, text: await statusMessage(service), disable_web_page_preview: true })
  }
}

// ── ПОДТВЕРЖДЕНИЕ ЗАПУСКА В TELEGRAM (409-3) ──────────────────────────────────
//
// Владелец 2026-10-05: «запрос → подтверждение в Telegram → сессия → предложение закрыть»; «ждём без предела, проверка
// каждые 3 с»; бота нет — старт сразу. Бот элемента подключён (токен И хотя бы один допущенный — то же определение, что у
// рассылки 408-5) и сессии нет — `wake` не рождает сессию, а зовёт `askToStart`: допущенным уходит вопрос с кнопками
// «Запустить» / «Не сейчас», запросы копятся в `data/services/<id>/wake/pending.json` (переживают перезапуск узла). Нажатие
// приходит опросу узла (`idleTick`, `callback_query`) — пока терминал выключен, бота читает только он. «Запустить» → `starter`
// (его кладёт bridge.cjs: `wake` с подтверждением) и все накопленные тексты во вход агента. «Не сейчас» → запросы сняты,
// каждому вызывающему, оставившему `declineUrl`, — ответ «человек не стал запускать» (иначе его задача ждала бы вечно).

/** Подключён ли бот службы: токен и хотя бы один допущенный. */
function connected(service) {
  return Boolean(storedToken(service)) && access(service).allowed.length > 0
}

// ── ЯЗЫК ЧЕЛОВЕКА (411; владелец 2026-10-06: «в своем чате я вижу на своем языке по дефолту ну или если я уже после этого перешёл
// на другой язык») ─────────────────────────────────────────────────────────────────────────────────────────────────────────────
// Значение, а не догадка: `person.json` в папке бота — `{ lang, source, at }`. Источники: `page` — язык страницы, где бота
// подключали (страница шлёт его вместе с системными текстами); `agent` — свой агент увидел, что человек пишет на другом языке, и
// сообщил дверью `POST /api/agents/person-lang`. Страница не перекрывает выбор агента: человек уже перешёл на свой язык.
// Нет файла — прежняя догадка по кириллице системных текстов (бот, подключённый до 411).

const personFile = (service) => path.join(stateDir(service), 'person.json')
const LANG_CODE = /^[a-z]{2,3}(-[A-Za-z0-9]{2,8})?$/

function personLang(service) {
  const p = readJson(personFile(service), null)
  if (p && typeof p.lang === 'string' && LANG_CODE.test(p.lang)) return p.lang
  try { return /[а-яё]/i.test(readFileSync(messagesFile(service), 'utf8')) ? 'ru' : 'en' } catch { return 'en' }
}

function setPersonLang(service, lang, source) {
  const code = String(lang ?? '').trim().toLowerCase()
  if (!LANG_CODE.test(code)) return { ok: false, error: 'bad-lang' }
  const cur = readJson(personFile(service), null)
  if (source === 'page' && cur?.source === 'agent') return { ok: true, lang: cur.lang, kept: true }
  mkdirSync(stateDir(service), { recursive: true })
  writeFileSync(personFile(service), JSON.stringify({ lang: code, source, at: new Date().toISOString() }, null, 2))
  return { ok: true, lang: code }
}

/**
 * 411-2: таблицы текстов на языке человека — en/ru встроены, прочие языки переводятся один раз ключом OpenAI ядра и кэшируются
 * (`translate.cjs`); перевода нет — английский. Объявлены ниже `ASK` и `CLOSE`, вызываются при отправке.
 */
async function askTable(service) {
  const l = personLang(service)
  if (ASK[l.split('-')[0]]) return ASK[l.split('-')[0]]
  return tableFor('telegram-ask', ASK.en, l)
}
async function closeTable(service) {
  const l = personLang(service)
  if (CLOSE[l.split('-')[0]]) return CLOSE[l.split('-')[0]]
  return tableFor('telegram-close', CLOSE.en, l)
}


/** `<адрес>.<зона>` элемента — как подпись рассылки 408-5. */
function named(service) {
  let address = service
  try {
    const a = JSON.parse(readFileSync(path.join(ROOT, 'data', 'services', service, 'address.json'), 'utf8')).address
    if (typeof a === 'string' && a) address = a
  } catch { /* адрес = id */ }
  try {
    const zone = JSON.parse(readFileSync(path.join(ROOT, 'logs', 'domain.json'), 'utf8')).zone
    if (typeof zone === 'string' && zone && !address.includes('.')) return `${address}.${zone}`
  } catch { /* без зоны */ }
  return address
}

/**
 * 547 (владелец 2026-10-19: «ты активируешь папку также как и запускаешь агента то есть прямо из чата»): доверяет ли Claude Code
 * папке агента. Claude Code помнит доверие на путь папки (`~/.claude.json`, `projects[<путь>].hasTrustDialogAccepted`) — у нового
 * и переименованного элемента записи нет, и первый запуск стоит на вопросе «Is this a project you trust?». Узел файл только читает:
 * отвечает на вопрос тем же нажатием, что человек (`bridge.cjs`). null — не известно (файла нет, формат другой).
 */
function folderTrusted(service) {
  const dir = serviceDir(service)
  if (!dir) return null
  try {
    const projects = JSON.parse(readFileSync(path.join(os.homedir(), '.claude.json'), 'utf8')).projects ?? {}
    const key = dir.replace(/\\/g, '/')
    const entry = projects[key] ?? projects[dir]
    return entry ? entry.hasTrustDialogAccepted === true : false
  } catch { return null }
}

/** 547: пути разделов агента без языка — у рождённого элемента они под его адресом и `build/`, у служб ядра — под `architect/`. */
function sectionPaths(service) {
  if (isBornItem(service)) {
    const address = readJson(path.join(ROOT, 'data', 'services', service, 'address.json'), null)?.address
    const a = typeof address === 'string' && /^[a-z0-9-]{1,40}$/.test(address) ? address : service
    return { terminal: `/${a}/build/terminal`, subscription: `/${a}/build/subscription` }
  }
  return { terminal: `/architect/${service}/terminal`, subscription: `/architect/${service}/claude-code` }
}

/** Адрес ядра, который человек откроет с телефона: `architect.<зона>`, без своей зоны — эта машина. */
function coreOrigin() {
  const zone = readJson(path.join(ROOT, 'logs', 'domain.json'), null)?.zone
  return typeof zone === 'string' && zone ? `https://architect.${zone}` : `http://localhost:${process.env.PORT || 24680}`
}

// Тексты — языком человека (владелец 2026-10-05 одобрил образец: «Агенту roman пришёл вопрос от агента gyr1i / «…» / Агент roman
// сейчас выключен. Включить его, чтобы он ответил? / [Включить и ответить] [Не сейчас — gyr1i получит отказ]»). Кто говорит и
// кому — словами; «терминал» — внутреннее устройство, человеку говорится «агент включён / выключен». `a` — имя агента элемента
// (адрес без зоны), `c` — кто спрашивает (одно имя или список через запятую).
const ASK = {
  en: {
    oneCall: (a, c) => `Agent ${a} got a question from agent ${c}`,
    manyCalls: (a, n) => `Agent ${a} got ${n} questions`,
    fromLine: (c, q) => `from ${c}: «${q}»`,
    offCalls: (a) => `Agent ${a} is off now. Turn it on so it answers?`,
    offHuman: (a) => `Agent ${a} is off. Turn it on and pass your message to it?`,
    yourMessage: (q) => `Your message: «${q}»`,
    goCalls: 'Turn on and answer', goHuman: 'Turn on and pass',
    noCalls: (c) => `Not now — ${c} gets a refusal`, noHuman: 'Not now',
    startedCalls: (a, c) => `Agent ${a} is on and answering ${c}.`,
    startedHuman: (a) => `Agent ${a} is on and got your message.`,
    declinedCalls: (a, c) => `Agent ${a} was not turned on — ${c} gets a refusal.`,
    declinedHuman: (a) => `Agent ${a} was not turned on.`,
    memory: (a, f, n) => `Agent ${a} was not turned on: too little free memory (${f} MB free, ${n} MB needed). Press «Turn on» later.`,
    failed: (a, r) => `Agent ${a} did not turn on: ${r}. Press «Turn on» again.`,
    declineText: (a) => `The owner of ${a} chose not to turn its agent on now.`,
    toast: 'Turning on…',
    moved: '↓ More questions came — the updated question is below.',
    alreadyOff: (a) => `Agent ${a} is already off.`,
    trustLine: 'Its folder is not trusted in Claude Code yet — «Turn on» trusts it as well.',
    waitingTerminal: (a, link) => `Agent ${a} is waiting for your answer in the terminal: ${link}`,
    // 597-4: «turn on» typed to a sleeping agent's bot — the agent starts with no task.
    onNow: (a) => `Agent ${a} is on — write to it.`,
  },
  ru: {
    oneCall: (a, c) => `Агенту ${a} пришёл вопрос от агента ${c}`,
    manyCalls: (a, n) => `Агенту ${a} пришли вопросы (${n})`,
    fromLine: (c, q) => `от ${c}: «${q}»`,
    offCalls: (a) => `Агент ${a} сейчас выключен. Включить его, чтобы он ответил?`,
    offHuman: (a) => `Агент ${a} выключен. Включить его и передать ему ваше сообщение?`,
    yourMessage: (q) => `Ваше сообщение: «${q}»`,
    goCalls: 'Включить и ответить', goHuman: 'Включить и передать',
    noCalls: (c) => `Не сейчас — ${c} получит отказ`, noHuman: 'Не сейчас',
    startedCalls: (a, c) => `Агент ${a} включён и отвечает ${c}.`,
    startedHuman: (a) => `Агент ${a} включён и получил ваше сообщение.`,
    declinedCalls: (a, c) => `Агент ${a} не включён — ${c} получит отказ.`,
    declinedHuman: (a) => `Агент ${a} не включён.`,
    memory: (a, f, n) => `Агент ${a} не включён: мало свободной памяти (свободно ${f} МБ, нужно ${n} МБ). Нажмите «Включить» позже.`,
    failed: (a, r) => `Агент ${a} не включился: ${r}. Нажмите «Включить» ещё раз.`,
    declineText: (a) => `Хозяин ${a} не стал сейчас включать его агента.`,
    toast: 'Включаю…',
    moved: '↓ Пришли ещё вопросы — обновлённый вопрос ниже.',
    alreadyOff: (a) => `Агент ${a} уже выключен.`,
    trustLine: 'Его папка ещё не подтверждена в Claude Code — «Включить» подтвердит и её.',
    waitingTerminal: (a, link) => `Агент ${a} ждёт вашего ответа в терминале: ${link}`,
    onNow: (a) => `Агент ${a} включён — пишите ему.`,
  },
}

/**
 * 426 (владелец 2026-10-07: «нативно наша архитектура даже не знает о том, что у нас есть Telegram»): первой строкой — «узнай себя и
 * узел», как у задачи A2A (`lib/a2a/executor.ts` элемента): поручение в руках сильнее правила в инструкции. Только элементу, у
 * которого есть `npm run passport` (паспорт нового вида) — остальным такой команды нет.
 * 548-15: только `passport -- me` — тем же словом, что задача A2A элемента (548-14): блок `node` в нём постоянного размера, а
 * `passport -- project` на пробуждении рос бы с числом элементов узла; соседа агент ищет по нужде.
 */
function knowYourself(service) {
  try {
    const pkg = JSON.parse(readFileSync(path.join(serviceDir(service), 'package.json'), 'utf8'))
    if (!pkg?.scripts?.passport) return ''
  } catch { return '' }
  return 'Сначала узнай себя: npm run passport -- me (навык own-service-props-detection; вывод читай целиком, не режь head; блок node — где ты живёшь). Соседа ищи только по нужде: npm run a2a -- find <английские слова>. Как отвечать человеку — навык telegram-channel. '
}

/**
 * 409-4: что вставить агенту из сообщения человека — кто, откуда и как ответить (инструмент reply канала Telegram).
 * 597-4: вещь сообщения (фото, документ, голос…) едет номером файла — агент скачает её инструментом канала. ✗ До 597-4 спящий бот на фото
 * отвечал справкой о состоянии, и вещь терялась: «фото, потом «запомни, это моя мама»» будило агента без фото.
 */
function humanPrompt(service, chatId, who, said, thing = null) {
  const att = thing ? ` [вложение: ${thing.label}, file_id ${thing.file_id} — скачай его инструментом download_attachment канала и прочитай]` : ''
  return `${knowYourself(service)}Сообщение из Telegram от ${who} (chat_id ${chatId}), пока ты был выключен: ${said}${att} — ответь ему в Telegram инструментом reply канала (chat_id ${chatId}).`
}

// 597-4: the node's commands (`lib/agent-kit/commands.cjs`) — put on `globalThis` by the bridge's mount (`lib/agent-kit/mount.cjs`).
// 🛑 Not `require(path.join(ROOT, …))`: a door imports this file, and the core's build cannot resolve a path from the working folder
// («server relative imports are not implemented yet», ✗ 552-6; repeated in 597-4 and found by the rebuild of 599-4 — 26 errors).
const nodeCommands = () => {
  const m = globalThis.__web4NodeCommands
  if (!m) throw new Error('the node commands are not mounted')
  return m
}
const THING_KINDS = [['document', 'документ'], ['voice', 'голосовое'], ['audio', 'аудио'], ['video', 'видео'], ['video_note', 'видеосообщение']]

/** The thing a Telegram message carries — { kind, label, file_id } — or null. A photo — its largest size (the plugin does the same). */
function thingOf(msg) {
  if (Array.isArray(msg?.photo) && msg.photo.length) return { kind: 'photo', label: 'фото', file_id: msg.photo[msg.photo.length - 1].file_id }
  for (const [k, label] of THING_KINDS) if (msg?.[k]?.file_id) return { kind: k, label, file_id: msg[k].file_id }
  return null
}

/**
 * 597-4: what a sleeping bot does with one message — code with no model, so only what a miss cannot hurt (owner 2026-10-26: «анализ прямого
 * совпадения это вариант который нельзя использовать» — the agent's model reads the rest): a bare «команды» / /commands → the list; a bare
 * «включить» / /on → the agent starts with no task; «выключи» → it is already off; a text or a thing (photo, document, voice…, with its
 * caption) → into the question «turn on and pass?», as before — now with the thing; /start, /help, /status and other slashes → the status.
 */
function idleDecision(msg) {
  const text = String(msg?.text ?? msg?.caption ?? '').trim()
  const thing = thingOf(msg)
  let cmds = null
  try { cmds = nodeCommands() } catch { /* no list — the old behaviour */ }
  if (!thing) {
    const bare = cmds ? cmds.bareOf(text) : null
    if (bare === 'commands') return { do: 'list' }
    if (bare === 'on') return { do: 'start' }
    if (bare === 'off' || OFF_WORDS.test(text)) return { do: 'already-off' }
    // A slash command of the node's list with words («/remember …») is a message; any other slash — the status, as before.
    if (text.startsWith('/') && !(cmds && cmds.slashOf(text))) return { do: 'status' }
  }
  if (text || thing) return { do: 'message', text, thing }
  return { do: 'status' }
}

/** The list of the node's commands in the person's language (ru and en built in, any other — translated once and cached). */
async function commandsText(service) {
  const lang = personLang(service)
  const cmds = nodeCommands()
  if (['ru', 'en'].includes(lang.split('-')[0])) return cmds.humanList(lang)
  const t = await tableFor('telegram-commands', { list: cmds.humanList('en') }, lang)
  return t.list
}

/** «Выключи» и его родня целиком, без другого текста: выключенному агенту это не поручение, а просьба, которая уже исполнена. */
// 548-15: `\s` вместо `s` — обратные косые были потеряны (найдено в 545), и «выключи .» с пробелом не узнавалось.
const OFF_WORDS = /^\s*(выключи(ть|сь)?|выключай|закрой|закрыть|стоп|off|turn( it)? off|switch off|stop|close)\s*[.!]*\s*$/i

const allHuman = (items) => items.length > 0 && items.every((it) => it.kind === 'human')

const cutText = (t, n) => (t.length > n ? `${t.slice(0, n - 1)}…` : t)

/** Имя элемента для человека: адрес без зоны узла (`roman`, а не `roman.throughsongs.com` и не id). */
function shortName(nameOrAddress) {
  const s = String(nameOrAddress || '')
  let zone = ''
  try { zone = JSON.parse(readFileSync(path.join(ROOT, 'logs', 'domain.json'), 'utf8')).zone || '' } catch { /* без зоны */ }
  return zone && s.endsWith(`.${zone}`) ? s.slice(0, -zone.length - 1) : s
}

/** Кто спрашивает — имена вызывающих без повторов. */
const callersOf = (items) => [...new Set(items.filter((it) => it.kind !== 'human').map((it) => shortName(it.from) || '?'))].join(', ')

function askText(service, items, t) {
  const a = shortName(named(service))
  const calls = items.filter((it) => it.kind !== 'human').slice(-5)
  const human = items.filter((it) => it.kind === 'human').slice(-5)
  const lines = []
  if (calls.length === 1) lines.push(t.oneCall(a, shortName(calls[0].from) || '?'), `«${cutText(calls[0].about, 300)}»`)
  else if (calls.length > 1) {
    lines.push(t.manyCalls(a, calls.length))
    for (const it of calls) lines.push(t.fromLine(shortName(it.from) || '?', cutText(it.about, 200)))
  }
  // Только сообщения человека — вопрос первой строкой, его сообщение под ним; есть вопросы агентов — вопрос о включении в конце.
  if (!calls.length) lines.push(t.offHuman(a))
  for (const it of human) lines.push(t.yourMessage(cutText(it.about, 300)))
  if (calls.length) lines.push(t.offCalls(a))
  if (folderTrusted(service) === false) lines.push(t.trustLine ?? ASK.en.trustLine)
  return cutText(lines.join('\n'), 3500)
}

const buttons = (p, t) => {
  const human = allHuman(p.items)
  return {
    inline_keyboard: [[
      { text: human ? t.goHuman : t.goCalls, callback_data: `wake:${p.id}:go` },
      { text: human ? t.noHuman : t.noCalls(callersOf(p.items)), callback_data: `wake:${p.id}:no` },
    ]],
  }
}

let starter = null
/** bridge.cjs кладёт сюда запуск с подтверждением — без круговой зависимости модулей. */
function setStarter(fn) { starter = fn }

/**
 * Спросить человека в Telegram, запускать ли терминал. Запрос уже висит — задача добавляется к нему, и вопрос приходит ЗАНОВО
 * новым сообщением внизу переписки (владелец 2026-10-06: правка старого сообщения прятала кнопки вверху — он их не увидел и
 * написал боту текстом); со старого сообщения кнопки снимаются, под ним — «обновлённый вопрос ниже».
 * Возвращает `{ ok, pending: true, asked }` (`asked` — сколько чатов получили вопрос).
 */
async function askToStart(service, { text, from, about, declineUrl, kind = 'call' } = {}) {
  const token = storedToken(service)
  const file = pendingFile(service)
  const p = readJson(file, null) ?? { id: randomBytes(6).toString('hex'), createdAt: new Date().toISOString(), items: [], asked: [] }
  p.items.push({ kind, text: text ?? '', from: from ?? '', about: about ?? '', declineUrl: declineUrl ?? '', at: new Date().toISOString() })
  const t = await askTable(service)
  const body = askText(service, p.items, t)
  // Старые сообщения вопроса: без кнопок и со строкой «обновлённый вопрос ниже» — кнопки живут только на последнем.
  for (const a of p.asked) {
    await tg(token, 'editMessageText', { chat_id: a.chat, message_id: a.messageId, text: `${askText(service, p.items.slice(0, -1), t)}

${t.moved ?? ASK.en.moved}`, disable_web_page_preview: true })
  }
  p.asked = []
  for (const chat of access(service).allowed) {
    const r = await tg(token, 'sendMessage', { chat_id: chat, text: body, reply_markup: buttons(p, t), disable_web_page_preview: true })
    if (r.ok && r.result?.message_id) p.asked.push({ chat, messageId: r.result.message_id })
  }
  mkdirSync(path.dirname(file), { recursive: true })
  writeFileSync(file, JSON.stringify(p, null, 2))
  return { ok: true, pending: true, asked: p.asked.length }
}

/** Заменить вопрос итогом во всех чатах; `keep` — оставить кнопки (нажать «Запустить» ещё раз). */
async function closeAsk(service, token, p, outcome, keep, t) {
  const text = `${askText(service, p.items, t)}\n\n${outcome}`
  for (const a of p.asked) {
    await tg(token, 'editMessageText', { chat_id: a.chat, message_id: a.messageId, text, ...(keep ? { reply_markup: buttons(p, t) } : {}) })
  }
}

/** Ответ вызывающему «человек не стал запускать» — его дверью задачи, ключом узла, только по петле. */
async function declineCaller(url, text) {
  try {
    const u = new URL(url)
    if (u.hostname !== '127.0.0.1' && u.hostname !== 'localhost') return
    await fetch(u, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Node-Key': process.env.SETTINGS_SECRET ?? '' },
      body: JSON.stringify({ text, failed: true }),
      signal: AbortSignal.timeout(10_000),
    })
  } catch { /* вызывающий недоступен — его задача останется ждать */ }
}

/** Нажатие кнопки вопроса. Только допущенный и только действующий запрос. */
async function onButton(service, token, q) {
  const sender = String(q.from?.id ?? '')
  const m = /^wake:([0-9a-f]+):(go|no)$/.exec(String(q.data ?? ''))
  const p = readJson(pendingFile(service), null)
  if (!access(service).allowed.includes(sender) || !m || !p || p.id !== m[1]) {
    await tg(token, 'answerCallbackQuery', { callback_query_id: q.id })
    return
  }
  const t = await askTable(service)
  const a = shortName(named(service))
  const c = callersOf(p.items)
  const human = allHuman(p.items)
  if (m[2] === 'no') {
    const declined = human ? t.declinedHuman(a) : t.declinedCalls(a, c)
    await tg(token, 'answerCallbackQuery', { callback_query_id: q.id, text: declined })
    rmSync(pendingFile(service), { force: true })
    await closeAsk(service, token, p, declined, false, t)
    for (const it of p.items) if (it.declineUrl) await declineCaller(it.declineUrl, t.declineText(a))
    return
  }
  await tg(token, 'answerCallbackQuery', { callback_query_id: q.id, text: t.toast })
  const text = p.items.map((it) => it.text).filter(Boolean).join('\n\n')
  const out = typeof starter === 'function' ? await starter(service, { text: text || undefined, taskUrls: p.items.map((it) => it.declineUrl).filter(Boolean) }) : { ok: false, reason: 'no-starter' }
  if (out.ok) {
    rmSync(pendingFile(service), { force: true })
    const startedText = human ? t.startedHuman(a) : t.startedCalls(a, c)
    // Владелец 2026-10-06: фраза не дублируется — у вопроса только снимаются кнопки, итог идёт одним сообщением ниже.
    for (const x of p.asked) await tg(token, 'editMessageReplyMarkup', { chat_id: x.chat, message_id: x.messageId, reply_markup: { inline_keyboard: [] } })
    // Владелец 2026-10-05: «нажатие кнопку ничего визуально не меняет» — правка сообщения наверху не видна; итог — новым
    // сообщением внизу, за ним пойдут ответ агента и «выключить агента?».
    for (const x of p.asked) await tg(token, 'sendMessage', { chat_id: x.chat, text: startedText, disable_web_page_preview: true })
  } else {
    const why = out.reason === 'memory' ? t.memory(a, out.freeMb, out.perSessionMb) : t.failed(a, String(out.reason ?? 'unknown'))
    await closeAsk(service, token, p, why, true, t)
  }
}

// ── ПРЕДЛОЖЕНИЕ ЗАКРЫТЬ ТЕРМИНАЛ (409-5) ──────────────────────────────────────
//
// Пока терминал запущен, бота читает плагин каналов, и чужие кнопки он выбрасывает (server.ts 0.0.7: принимает только
// `perm:…`). Поэтому вопрос — текстом, без кнопок (владелец 2026-10-05: «Ответ текстом»): ответ «выключить» получает агент через
// канал и закрывает свой терминал дверью ядра (`POST /api/agents/done` с `close`). Бота нет — ничего не шлётся и ничего не
// закрывается: закрывать без ответа человека нельзя.

// 597-4 (владелец 2026-10-25: «в конце каждого блока когда сейчас всплывают контейнер с предложением выключить или разобрать сделать
// вкладку информацию которая присылают инструкцию о всех жёстко запрограммированных командах»): третья строка — «команды».
const CLOSE = {
  en: {
    done: (a) => `Agent ${a} has finished. Turn it off? Reply «off» — the agent will turn itself off.\nReply «review» if you first want the agent to suggest how to improve its skills.\nReply «commands» — I will send the list of the node's commands.`,
    timeout: (a) => `Agent ${a} has been on for 60 minutes. Turn it off? Reply «off» — the agent will turn itself off.\nReply «review» if you first want the agent to suggest how to improve its skills.\nReply «commands» — I will send the list of the node's commands.`,
  },
  ru: {
    // 410-3: «разбор» — агент перед выключением предлагает, как улучшить свои навыки (навык self-review элемента).
    done: (a) => `Агент ${a} закончил. Выключить его? Ответьте «выключить» — агент выключится сам.\nОтветьте «разбор», если хотите, чтобы сначала агент предложил, как улучшить свои навыки.\nОтветьте «команды» — пришлю список команд узла.`,
    timeout: (a) => `Агент ${a} работает уже 60 минут. Выключить его? Ответьте «выключить» — агент выключится сам.\nОтветьте «разбор», если хотите, чтобы сначала агент предложил, как улучшить свои навыки.\nОтветьте «команды» — пришлю список команд узла.`,
  },
}

async function askToClose(service, why, { reviewed = false } = {}) {
  if (!connected(service)) return { ok: true, asked: 0, reason: 'no-telegram' }
  const token = storedToken(service)
  const c = await closeTable(service)
  const full = c[why === 'timeout' ? 'timeout' : 'done'](shortName(named(service)))
  // После разбора в этой сессии — без второй строки (предложение разбора); строка «команды» (597-4) остаётся.
  const text = reviewed ? full.split('\n').filter((_, i) => i !== 1).join('\n') : full
  let asked = 0
  for (const chat of access(service).allowed) {
    const r = await tg(token, 'sendMessage', { chat_id: chat, text, disable_web_page_preview: true })
    if (r.ok) asked++
  }
  return { ok: true, asked }
}

/**
 * Запускается один раз на службу общим подключением узла (`lib/agent-kit/mount.cjs`), не дверью Next.
 * 🔒 У КАЖДОЙ КОПИИ СВОЙ ОПРОС ТОЛЬКО СВОЕЙ СЛУЖБЫ (271): обход всех служб из каждой копии дал бы по
 * опрашивателю на копию — у бота был бы не один читатель.
 */
function startIdlePoller(service) {
  const key = idleKey(service)
  if (globalThis[key]) return
  let busy = false
  globalThis[key] = setInterval(async () => {
    if (busy) return
    busy = true
    try { await idleTick(service) } catch (err) { console.error(`[telegram] узел не прочитал бота: ${err instanceof Error ? err.message : err}`) }
    busy = false
  }, IDLE_POLL_MS)
  globalThis[key].unref?.()
}

/**
 * Имя и ручка для BotFather (546, владелец 2026-10-19: «после слова Fractera название элемента»; выбор «Элемент + код узла»):
 * «Fractera-<адрес элемента>» и `Fractera_<адрес>_<код узла>_bot`. ✗ Прежде код был `Math.random` на КАЖДЫЙ запрос, а страница
 * спрашивает дверь каждые 3 с — имена бежали на глазах. Код узла постоянный (хэш папки узла и имени машины): адрес бота один на
 * весь Telegram, а `build`, `auth`, `root` есть у каждого узла. Ручка — только латиница, цифры и «_», не длиннее 32 знаков.
 */
const NODE_CODE = createHash('sha256').update(`${ROOT}|${os.hostname()}`).digest('hex').slice(0, 4)
const elementAddress = (service) => {
  const address = readJson(path.join(ROOT, 'data', 'services', service, 'address.json'), null)?.address
  return typeof address === 'string' && /^[a-z0-9-]{1,40}$/.test(address) ? address : service
}

/**
 * 552-6 (владелец 2026-10-20: имена ботов без слова Fractera, с режимом; ручка — «Полностью, обрезая адрес»): у элемента с группами
 * навыков имя `<Элемент>-<режим>-<ячейка>` и ручка `<адрес>_<режим>_<ячейка>_<код узла>_bot`; слова режима полностью, адрес элемента
 * обрезается, чтобы ручка была ≤ 32 знаков (`templa_workspace_orders_d897_bot`). Зовут этот модуль (бот H2A) и `telegram-slots.cjs`.
 */
function namedSuggestion(service, mode, cell) {
  const element = elementAddress(service)
  const tail = `_${mode}_${cell}_${NODE_CODE}_bot`
  const handle = element.replace(/[^A-Za-z0-9]+/g, '_').slice(0, 32 - tail.length).replace(/_+$/, '')
  return { name: `${element.charAt(0).toUpperCase()}${element.slice(1)}-${mode}-${cell}`, username: `${handle || 'e'}${tail}` }
}

function suggestion(service) {
  if (hasSkillGroups(serviceDir(service))) return namedSuggestion(service, 'messenger', 'h2a')
  const element = elementAddress(service)
  const tail = `_${NODE_CODE}_bot`
  const handle = element.replace(/[^A-Za-z0-9]+/g, '_').slice(0, 32 - 'Fractera_'.length - tail.length).replace(/_+$/, '')
  return { name: `Fractera-${element}`, username: `Fractera_${handle}${tail}` }
}

function channelState(service) {
  const token = storedToken(service)
  const bot = readJson(botFile(service), {})
  return {
    service,
    configured: Boolean(token),
    tail: token ? token.slice(-4) : null,
    botName: bot.name ?? null,
    botUsername: bot.username ?? null,
    allowed: access(service).allowed.length,
    running: running(service),
    terminalWithoutChannel: terminalWithoutChannel(service),
    stateDir: stateDir(service),
    suggestion: suggestion(service),
    links: sectionPaths(service),
  }
}

/**
 * 547, запасной путь: терминал агента стоит на вопросе, на который узел ответить не вправе (агента включили не из чата) — бот
 * зовёт человека туда, где вопрос виден. Один раз на вопрос.
 * 592-4 (план шага 592, согласованный владельцем 2026-10-24, — новое поведение «система пишет вам сама»): у элемента без своего
 * бота то же сообщение уходит допущенным бота главного агента — архитектору, на языке его человека, со ссылкой на терминал
 * элемента. ✗ 589-4: строитель stripe без бота 25 минут стоял на вопросе, о котором не знал никто. Бота нет и у главного агента —
 * молчит, как прежде. Ключ сессии рабочего процесса (`<id>--work`) — не элемент: у него нет своей страницы терминала, молчит.
 */
const MAIN_AGENT = 'build'
async function tellWaiting(service) {
  const via = storedToken(service) ? service : service !== MAIN_AGENT && isService(service) && connected(MAIN_AGENT) ? MAIN_AGENT : null
  if (!via) return { sent: 0 }
  const token = storedToken(via)
  const t = await askTable(via)
  const a = shortName(named(service))
  const link = `${coreOrigin()}/${personLang(via)}${sectionPaths(service).terminal}`
  let sent = 0
  const chats = access(via).allowed
  for (const chat of chats) {
    const r = await tg(token, 'sendMessage', { chat_id: chat, text: (t.waitingTerminal ?? ASK.en.waitingTerminal)(a, link), disable_web_page_preview: true })
    if (r?.ok) sent++
  }
  // 592-4: строка журнала ядра — иначе о вопросе на экране и о том, дошёл ли он до человека, не знает никто, кроме Telegram.
  console.log(`[telegram] ${service}: вопрос на экране → бот ${via === service ? 'элемента' : `главного агента (${via})`}, отправлено ${sent} из ${chats.length}`)
  return { sent, via }
}

module.exports = {
  // 552-6: помощники и правило имени для ячеек ботов (`telegram-slots.cjs`).
  tg, readJson, writeSecret, NODE_CODE, namedSuggestion, hasSkillGroups,
  PLUGIN, isService, stateDir, storedToken, saveToken, activationLink, saveMessages, channelLaunch,
  running, channelState, startIdlePoller, connected, askToStart, setStarter, askToClose, personLang, setPersonLang, tellWaiting,
  // 597-4: the sleeping bot's decision — exported for the probe that checks it without a bot.
  idleDecision, thingOf,
}
