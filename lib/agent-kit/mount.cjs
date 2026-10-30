// ОБЩЕЕ ПОДКЛЮЧЕНИЕ КОМПЛЕКТОВ АГЕНТА К УЗЛУ (271).
//
// 🔒 ЕДИНСТВЕННОЕ, ЧТО ОТ КОМПЛЕКТА ЖИВЁТ ВНЕ МАРШРУТОВ, И ПОЧЕМУ. Событие `upgrade` HTTP-сервера и таймеры
// опроса ботов — одни на процесс Node, а копий комплекта столько, сколько служб. Поэтому здесь нет ни строки о
// конкретной службе: список копий находится ОБХОДОМ ПАПОК при старте — `architect/<служба>/_agent-kit/server/
// entry.cjs`. Удалили папку службы — после перезапуска узла её нет ни здесь, ни где-либо ещё (закон владельца
// 2026-09-22: «если я удалю маршрут, все его кишки удалятся автоматически»).
//
// 🔒 СОКЕТ ОТБИРАЕТСЯ У NEXT ЯВНО. ✗ Оплачено у чата и памяти днём отладки: Next вешает свой обработчик
// `upgrade` при первом запросе и закрывает сокет, если его маршрутизатор что-то сматчил, — первое соединение
// живёт, следующие рвутся кодом 1006. Лечение: дать Next привязаться сейчас и тут же снять его обработчик;
// всё, кроме `/pty/<служба>`, возвращается ему.
//
// 🔒 СЛУЖБА — ИЗ АДРЕСА СОКЕТА И ИЗ ИМЕНИ ПАПКИ, А НЕ ИЗ СООБЩЕНИЯ БРАУЗЕРА.

const { existsSync, readdirSync } = require('node:fs')
const path = require('node:path')
const { WebSocketServer } = require('ws')

// 🛑 КОРЕНЬ — `process.cwd()`, как у всего узла: `server.js` запускается из корня проекта.
const ARCHITECT = path.join(process.cwd(), 'app', '[lang]', '(architectLayer)', 'architect')
const PTY_PATH = /^\/pty\/([a-z][a-z0-9-]{0,39})$/
// 🔒 ОБЩАЯ КОПИЯ ДЛЯ РОЖДЁННЫХ WEB4 ЭЛЕМЕНТОВ (326): `architect/[item]/_agent-kit` обслуживает `/pty/<id>` любого элемента,
// который В МОМЕНТ ПОДКЛЮЧЕНИЯ записан в реестре как рождённый, — элемент, рождённый после старта узла, получает терминал без
// перезапуска. Проверку «рождённый» делает сама копия (`isBornItem`), имя — по-прежнему из адреса сокета.
const BORN_GROUP = '[item]'
function bornCheck() {
  try { return require(path.join(ARCHITECT, BORN_GROUP, '_agent-kit', 'server', 'workspace.cjs')).isBornItem } catch { return () => false }
}
/** Элементы реестра, которых обслуживает общая копия, — для опроса их ботов при старте. 606: тот же ответ, что у `kitOf` (`isBorn`),
 *  а не «рождённый»: root (`kind: user` без `born`) и встроенные без своей группы иначе получали терминал, но не опрос бота. */
function bornIds(isBorn) {
  try {
    const reg = JSON.parse(require('node:fs').readFileSync(path.join(process.cwd(), 'WEB4-ITEMS-REGISTRY', 'web4-items.json'), 'utf8'))
    return (reg.services || []).filter((s) => s && typeof s.id === 'string' && isBorn(s.id)).map((s) => s.id)
  } catch { return [] }
}

/** Копии комплекта, найденные на диске: `{ <служба>: entry }`. */
function findKits() {
  const kits = {}
  let names = []
  try { names = readdirSync(ARCHITECT) } catch { return kits }
  for (const name of names) {
    const entry = path.join(ARCHITECT, name, '_agent-kit', 'server', 'entry.cjs')
    if (!existsSync(entry)) continue
    try {
      kits[name] = require(entry)
    } catch (err) {
      // Сломанная копия одной службы не роняет узел и остальные службы — но называется громко.
      console.error(`[agent-kit] копия службы «${name}» не загрузилась: ${err instanceof Error ? err.message : err}`)
    }
  }
  return kits
}

/** Подключить все найденные копии: сокет `/pty/<служба>` и опрос ботов. Зовёт `server.js` одной строкой. */
function mountAgentKits(server, app) {
  const kits = findKits()
  const names = Object.keys(kits)
  const bornKit = kits[BORN_GROUP] ?? null
  const isBorn = bornCheck()
  console.log(`[agent-kit] службы с агентом: ${names.length ? names.join(', ') : 'нет'}`)

  // 552-4б: копия комплекта — по id ЭЛЕМЕНТА, а мост получает полный ключ сессии (`<id>--work` — сессия рабочего процесса,
  // `lib/agent-kit/modes.cjs`). ✗ До этого «закончил», сокет и язык сессии `<id>--work` искали копию с именем ключа и не находили.
  const modes = require(path.join(process.cwd(), 'lib', 'agent-kit', 'modes.cjs'))
  // 599-4: список команд узла (597) — модулям комплекта через `globalThis`. `telegram.cjs` импортирует и дверь Next, а путь от корня ядра
  // сборка не разрешает («server relative imports are not implemented yet», ✗ 552-6; повторено в 597-4 и найдено пересборкой 599-4 —
  // 26 ошибок). Здесь, во время работы узла, такой путь законен.
  globalThis.__web4NodeCommands = require(path.join(process.cwd(), 'lib', 'agent-kit', 'commands.cjs'))
  const kitOf = (service) => {
    const id = modes.baseOf(service)
    return kits[id] ?? (bornKit && isBorn(id) ? bornKit : null)
  }

  if (typeof app.setupWebSocketHandler === 'function') app.setupWebSocketHandler(server)
  server.removeAllListeners('upgrade')
  const wss = new WebSocketServer({ noServer: true })

  server.on('upgrade', (req, socket, head) => {
    let pathname = ''
    try {
      ({ pathname } = new URL(req.url || '/', 'http://localhost'))
    } catch {
      socket.destroy()
      return
    }
    const hit = pathname.match(PTY_PATH)
    if (hit) {
      const kit = kitOf(hit[1])
      if (!kit) {
        socket.destroy()
        return
      }
      wss.handleUpgrade(req, socket, head, (ws) => kit.onConnection(ws, hit[1]))
      return
    }
    const upgrade = typeof app.getUpgradeHandler === 'function' ? app.getUpgradeHandler() : null
    if (upgrade) upgrade(req, socket, head)
    else socket.destroy()
  })

  // 🔒 ПРОБУЖДЕНИЕ БЕЗ БРАУЗЕРА (409-1): дверь Next (`/api/agents/wake`) и этот модуль — один процесс, но разные экземпляры
  // модулей; сессии уже живут в `globalThis`, и вход пробуждения кладётся туда же. Копия выбирается так же, как для сокета.
  globalThis.__web4AgentWake = async (service, opts) => {
    const kit = kitOf(service)
    if (!kit || typeof kit.wake !== 'function') return { ok: false, reason: 'no-agent-kit' }
    return kit.wake(service, opts)
  }
  // 409-5: «работа закончена» и закрытие терминала агентом — тот же выбор копии (`/api/agents/done`).
  globalThis.__web4AgentDone = async (service, opts) => {
    const kit = kitOf(service)
    if (!kit || typeof kit.done !== 'function') return { ok: false, reason: 'no-agent-kit' }
    const out = await kit.done(service, opts)
    // 548-11: элемент под надзором главного агента сообщил «закончил» — проснуться главному агенту (служба `build`), без вопроса
    // в Telegram: надзор человек уже выбрал. Событие, а не таймер; предел циклов — в `lib/web4-items/supervision.cjs`.
    // Только после настоящего «закончил»: у элемента есть живая сессия (`ok`), и это не закрытие терминала.
    if (out && out.ok && !opts?.close && modes.modeOfKey(service) === 'build') {
      try {
        // 615-6: главный агент жив и родился от человека — он в разговоре: доклад инструментом reply, себя не закрывает (603-3).
        const live = globalThis.__web4TerminalSessions?.get?.('build')
        const text = require(path.join(process.cwd(), 'lib', 'web4-items', 'supervision.cjs')).onDone(service, undefined, { conversation: Boolean(live && live.byPerson) })
        const main = kits.build
        if (text && main && typeof main.wake === 'function') {
          void Promise.resolve(main.wake('build', { text, from: service, confirmed: true }))
            .then((r) => console.log(`[supervision] ${service} → главный агент: ${r && r.ok ? (r.already ? 'вставлено в живую сессию' : 'проснулся') : r && r.reason}`))
            .catch((err) => console.error(`[supervision] ${service}: ${err instanceof Error ? err.message : err}`))
        }
      } catch (err) {
        console.error(`[supervision] ${service}: ${err instanceof Error ? err.message : err}`)
      }
    }
    return out
  }
  // 604: «да» человека на вопрос доверия папке — та же копия, что у сессии (дверь `/api/agents/trust`, бот главного агента).
  globalThis.__web4AgentTrust = async (key) => {
    const kit = kitOf(key)
    if (!kit || typeof kit.answerTrust !== 'function') return { ok: false, reason: 'no-agent-kit' }
    return kit.answerTrust(key)
  }
  // 620: команды сессии из Telegram — очистить контекст, сменить модель (дверь `/api/agents/session`), тот же выбор копии.
  globalThis.__web4AgentSession = (service, opts) => {
    const kit = kitOf(service)
    if (!kit || typeof kit.sessionCommand !== 'function') return { ok: false, reason: 'no-agent-kit' }
    return kit.sessionCommand(service, opts)
  }
  // 411: язык человека в Telegram элемента — меняет свой агент, когда человек стал писать на другом языке.
  globalThis.__web4PersonLang = (service, lang) => {
    const kit = kitOf(service)
    if (!kit || typeof kit.setPersonLang !== 'function') return { ok: false, error: 'no-agent-kit' }
    return kit.setPersonLang(modes.baseOf(service), lang, 'agent')
  }

  // 552-6 (владелец 2026-10-20: «если ядро решила написать человеку через Messenger она должна сумме это сделать»): боты элемента и
  // отправка его допущенным — дверь `/api/agents/telegram` (ключ узла), тот же выбор копии.
  globalThis.__web4Telegram = {
    bots: (service) => {
      const kit = kitOf(service)
      return kit && typeof kit.telegramBots === 'function' ? { ok: true, bots: kit.telegramBots(modes.baseOf(service)) } : { ok: false, error: 'no-agent-kit' }
    },
    send: async (service, slot, text) => {
      const kit = kitOf(service)
      return kit && typeof kit.telegramSend === 'function' ? kit.telegramSend(modes.baseOf(service), slot, text) : { ok: false, error: 'no-agent-kit' }
    },
  }

  for (const name of names) {
    if (name === BORN_GROUP) continue
    try { kits[name].startIdlePoller(name) } catch (err) {
      console.error(`[agent-kit] опрос бота службы «${name}» не начался: ${err instanceof Error ? err.message : err}`)
    }
  }
  // 326: боты рождённых элементов, известных при старте; элемент, рождённый позже, запускает опрос своей двери канала при
  // сохранении токена (человеком).
  if (bornKit) {
    for (const id of bornIds(isBorn)) {
      try { bornKit.startSlotPollers?.(id) } catch (err) {
        console.error(`[agent-kit] опрос ботов-ячеек элемента «${id}» не начался: ${err instanceof Error ? err.message : err}`)
      }
      try { bornKit.startIdlePoller(id) } catch (err) {
        console.error(`[agent-kit] опрос бота элемента «${id}» не начался: ${err instanceof Error ? err.message : err}`)
      }
    }
  }
}

module.exports = { mountAgentKits, findKits }
