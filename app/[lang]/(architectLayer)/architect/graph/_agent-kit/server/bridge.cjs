// МОСТ ТЕРМИНАЛА СЛУЖБЫ (267-1, перенос `fractera-memory-starter/server.mjs:613–900`; в маршруте службы — 271).
//
// 🔒 СОКЕТ УЗЛА ПРИНАДЛЕЖИТ НЕ МОСТУ, А ОБЩЕМУ ПОДКЛЮЧЕНИЮ `lib/agent-kit/mount.cjs`: событие `upgrade` одно на
// процесс, а копий комплекта столько, сколько служб. Подключение принимает `/pty/<служба>` и отдаёт сокет
// сюда — `onConnection(ws, service)`. Служба приходит из АДРЕСА, а не из сообщения браузера.
//
// 🔒 СПИСОК РЕЖИМОВ ЗАКРЫТЫЙ, СВОБОДНОЙ КОМАНДЫ ПО ПРОВОДУ НЕТ: браузер выбирает режим по имени, а что
// набрать в оболочке, решает сервер.
//
// 🛑 `node-pty` — НАТИВНЫЙ МОДУЛЬ, ЕГО ОТКАЗ ГРОМКИЙ. Сайт поднимается и без терминала, но причина
// печатается в журнал и в сам терминал: молча пропавший терминал читается как «сломали вход в подписку».
// Измерено 2026-09-22: у `node-pty@1.1.0` готовые сборки есть под Windows и macOS, под Linux — нет.

const { existsSync, readFileSync, unlinkSync, writeFileSync } = require('node:fs')
const path = require('node:path')
const { redeemTicket } = require('./ticket.cjs')
const session = require('./session.cjs')
const { serviceDir } = require('./workspace.cjs')
const { claudeBin, resolveBin } = require('./claude-cli.cjs')
const telegram = require('./telegram.cjs')
const { channelLaunch } = telegram
const os = require('node:os')
// 552-4: режимы сессии (первое слово запроса, группы навыков, ключ сессии) — один модуль ядра, общий с прибором `check:modes`.
// Из корня узла, как `supervision.cjs`: у копий комплекта свой путь, а модуль один.
const modes = require(path.join(process.cwd(), 'lib', 'agent-kit', 'modes.cjs'))

const INIT_DEADLINE_MS = 10_000
const CLOSE_POLICY = 1008
/** 551-7: длина задачи из ссылки — та же, что у окна вставки (`core/client/terminal-paste.mjs`, PASTE_LIMIT). */
const TASK_LIMIT = 20_000

let pty = null
let ptyLoadError = ''
try {
  pty = require('node-pty')
} catch (err) {
  ptyLoadError = err instanceof Error ? err.message : String(err)
  console.error(`[pty] МОДУЛЬ НЕ ЗАГРУЖЕН: ${ptyLoadError}\n[pty] сайт работает, терминал будет отказывать. Лечение: npm rebuild node-pty`)
}

/**
 * Команда, которую сервер набирает в оболочке короткого терминала. `\r` — Enter и для cmd.exe, и для bash.
 * Агента здесь нет: он запускается файлом `claude` напрямую, без оболочки (см. `startAgent`); личность ему
 * даёт сама папка, а не добавленный промпт.
 */
const MODES = {
  // 🔒 `claude auth login` — ПОДКОМАНДА, А НЕ `/login` ВНУТРИ ИНТЕРФЕЙСА (измерено у чата, 114-2): набирать
  // команду в полноэкранном интерфейсе значило бы зависеть от раскладки. Начинает обмен безусловно — даже
  // у вошедшего, поэтому кнопка на странице зовётся «войти заново», когда вход уже есть.
  login: (bin) => `${bin} auth login\r`,
}

/**
 * Коротких терминалов входа — ОДИН на узел. Каждый `claude auth login` на этой машине сам открывает
 * вкладку в браузере; два входа разом дали бы две вкладки и два кода, из которых годен один
 * (владелец 2026-09-22: «открывается много вкладок на авторизацию»).
 */
const MAX_EPHEMERAL = 1
let ephemeral = 0
/** Службы, чей агент сейчас запускается (ставятся зависимости плагина): второй запуск той же службы отказывает, а не двоит сессию. */
const starting = new Set()

function shellPath() {
  if (process.env.PTY_SHELL) return process.env.PTY_SHELL
  const candidates = process.platform === 'win32'
    ? [process.env.ComSpec, 'C:\\Windows\\System32\\cmd.exe']
    : ['/bin/zsh', '/bin/bash', '/bin/sh']
  for (const c of candidates) if (c && existsSync(c)) return c
  return candidates[candidates.length - 1]
}

// 🔒 ОКРУЖЕНИЕ ОБОЛОЧКИ — БЕЗ СЕКРЕТОВ УЗЛА. Next загружает `.env.local` узла в `process.env`, и там лежат
// ключ Cloudflare, секреты входа и данных. Целиком наследовать нельзя, а собрать с нуля, как в памяти на
// Linux, нельзя тоже: на Windows `claude` ищет вход в `USERPROFILE`, `APPDATA`, `LOCALAPPDATA`, и
// обрезанное окружение даёт агента, который «не вошёл». Поэтому снимается ровно то, что похоже на секрет.
const SECRET = /(SECRET|TOKEN|PASSWORD|PASSWD|PRIVATE|API_KEY|_KEY$|^DATABASE_URL$|^AUTH_)/i
// Метки чужой сессии Claude Code — см. `lib/channel/telegram.cjs` (оплачено живым прогоном 2026-09-22):
// с ними `claude` считает себя вложенной сессией и не поднимает серверы плагинов.
const INHERITED_SESSION = /^(CLAUDECODE|CLAUDE_CODE_.*|CLAUDE_PID|CLAUDE_EFFORT)$/i

function shellEnv(shell) {
  const env = {}
  for (const [k, v] of Object.entries(process.env)) {
    if (typeof v === 'string' && !SECRET.test(k) && !INHERITED_SESSION.test(k)) env[k] = v
  }
  // Сервер сайта работает в продакшне; агенту и его сборкам это знание чужое.
  delete env.NODE_ENV
  delete env.PORT
  env.TERM = 'xterm-256color'
  if (process.platform !== 'win32') env.SHELL = shell
  return env
}

/**
 * РОДИТЬ СЕССИЮ АГЕНТА СЛУЖБЫ — одна функция для кнопки в окне терминала и для пробуждения без браузера (узел, шаг 409-1;
 * владелец: «агент должен уметь запускать собственный терминал»). `notice` — строки человеку (в окно терминала или никуда),
 * `wanted` — нужен ли ещё запуск после установки плагина канала (окно закрыли — не рождать).
 */
// ── 587-5: ПЕРВОЕ ЗАДАНИЕ УЗЛА ДЛЯ ГЛАВНОГО АГЕНТА ─────────────────────────────────────────────────────────────────────────────
// Пишет его ядро (`lib/web4-items/first-task.ts`, дверь `/api/node/first-task`); здесь — только «забрать». Служба главного агента — `build`.
const MAIN_AGENT = 'build'
const FIRST_TASK = () => path.join(process.cwd(), 'data', 'node', 'first-task.json')

function takeFirstTask() {
  try {
    const raw = JSON.parse(readFileSync(FIRST_TASK(), 'utf8'))
    const text = typeof raw.text === 'string' ? raw.text.replace(/[\u0000-\u0008\u000b-\u001f\u007f]/g, '').trim() : ''
    try { unlinkSync(FIRST_TASK()) } catch { /* уже забрано */ }
    return text || null
  } catch {
    return null
  }
}

/** Первое поручение: в терминале — само задание; в сессии с ботом Telegram — сначала вопрос человеку в Telegram. */
function firstTaskPrompt(task, viaChannel) {
  if (!viaChannel) return `The person wrote this task on the home page of the node's site. Do it:\n\n${task}`
  return `The person wrote this task on the home page of the node's site before connecting Telegram:\n\n${task}\n\n` +
    `First write to the person in Telegram, in their language: «Вы просили: «<the task in short>». Запускаем его в работу?» ` +
    `Start the work only after they answer yes.`
}

async function spawnAgent(service, notice = () => {}, wanted = () => true, firstPrompt = '', { answerTrust = false, pass = 'main' } = {}) {
  if (!pty) {
    notice(`[терминал недоступен: node-pty не загружен — ${ptyLoadError}]`)
    return { ok: false, reason: 'pty-unavailable' }
  }
  if (starting.has(service)) return { ok: false, reason: 'starting' }
  const existing = session.current(service)
  if (existing) return { ok: true, session: existing, already: true }
  // 552-4: `service` — ключ сессии; у сессии рабочего процесса это `<id>--work`, а папка, данные и бот — элемента `<id>`.
  const element = modes.baseOf(service)
  const mode = modes.modeOfKey(service)
  const cwd = serviceDir(element)
  if (!cwd) {
    notice(`[папка агента не найдена: службы «${String(service ?? '').slice(0, 40)}» нет в реестре узла или на диске]`)
    return { ok: false, reason: 'no-agent-dir' }
  }
  // 🛑 АГЕНТ ЗАПУСКАЕТСЯ ФАЙЛОМ `claude`, А НЕ НАБИРАЕТСЯ В ОБОЛОЧКЕ. ✗ Оплачено владельцем 2026-09-22:
  // на вопросе о доверии он нажал Enter, выбор по умолчанию был «No, exit», `claude` вышел — а оболочка
  // `cmd.exe` осталась жить, индикатор горел «Работает», и слова человека уходили в командную строку
  // Windows («'hello' is not recognized…»). Без оболочки выход агента и есть конец сессии: страница
  // говорит «Агент завершил работу» и снова даёт кнопку запуска.
  const shell = shellPath()
  let env = shellEnv(shell)
  const bin = resolveBin('claude', env.PATH || env.Path)
  if (!bin) {
    notice('[claude не найден ни в PATH, ни в ~/.local/bin — установите Claude Code]')
    return { ok: false, reason: 'no-claude' }
  }
  // 🔒 БОТ TELEGRAM РАБОТАЕТ В ЭТОЙ ЖЕ СЕССИИ (решение владельца 2026-09-22): бот подключён — `claude`
  // запускается с каналом, и всё, что человек пишет в Telegram, видно здесь. Первый запуск ставит
  // зависимости плагина — это может занять минуту, и человек видит, чего ждёт.
  let args = []
  starting.add(service)
  notice('[запускаю агента…]')
  // 552-4: бот элемента — только у сессии строительства; опрашивать бота может один процесс (409), а мессенджер до 552-6 живёт там.
  const launch = mode === 'work' ? null : await channelLaunch(element, env).catch((err) => ({ ok: false, error: err instanceof Error ? err.message : String(err) }))
  starting.delete(service)
  if (launch && !launch.ok) {
    notice(`[бот Telegram не подключится: ${launch.error}]\r\n[агент запускается без него]`)
  } else if (launch) {
    env = launch.env
    args = launch.args
  }
  if (!wanted() || session.current(service)) return { ok: false, reason: 'gone' }
  const viaChannel = args.length > 0
  // 548-7: свои данные службы (`data/services/<id>`) — рабочая папка агента всегда, с ботом и без: изоляция элемента
  // (`scripts/element-isolate.mjs`) закрывает чтение вне рабочих папок, а здесь живут его заказы, журналы и вложения.
  // 🛑 `--add-dir` забирает ВСЕ следующие аргументы как папки: в конце списка он съел бы первое поручение агенту (✗ замерено
  // 2026-10-20 на erpxd: пустой ввод, журнала нет). Поэтому — первым, и за ним всегда другой флаг.
  const ownData = path.join(process.cwd(), 'data', 'services', element)
  if (existsSync(ownData) && !args.includes(ownData)) args = ['--add-dir', ownData, ...(args.length ? args : ['--permission-mode', 'auto'])]
  // 569-3: свои встроенные инструменты папки агента (`.claude/launch-tools.txt`, `lib/agent-kit/modes.cjs`). 🛑 `--tools` забирает СПИСОК
  // значений, как `--add-dir`: первым, и за ним всегда другой флаг — иначе съел бы первое поручение.
  const tools = typeof modes.launchTools === 'function' ? modes.launchTools(cwd) : null
  if (tools) args = ['--tools', tools, ...(args.length ? args : ['--permission-mode', 'auto'])]
  // 548-20 (✗ 2026-10-20: Telegram молчал у разбуженных сессий): у Claude Code ОДИН на машину кэш неудачных подключений MCP
  // (`~/.claude/mcp-needs-auth-cache.json`, ключ — имя сервера, 15 минут). Плагин канала включён у человека глобально и стартует в
  // любой сессии; без бота токена нет — он падает, и 15 минут ВСЕ сессии машины пишут «Skipping connection (recent failure cached…)»
  // и живут без Telegram (замерено: падение y7jos без бота 02:30:33Z; erpxd 23:48:48Z → «Skipping» у главного агента 23:49:28Z).
  // Поэтому сессия без канала запускается с плагином, выключенным на этот запуск, — падать нечему. После `--add-dir`: тот забирает
  // папки до следующего флага, а `viaChannel` уже посчитан.
  // 552-4: у элемента с группами навыков `--settings` несёт и группы режима (`lib/agent-kit/modes.cjs`); у остальных — как прежде.
  const off = viaChannel ? {} : { [telegram.PLUGIN]: false }
  // 552-5: системная подсказка сессии — фраза режима и, если у элемента есть `.claude/modes/<режим>.md`, законы режима (одним файлом).
  // 590-5: у сессии строительства — свой проход (`main` · `design` · `texts`): свои вендорные навыки, файл законов прохода, модель.
  if (modes.hasGroups(cwd)) args = [...args, '--settings', JSON.stringify(modes.modeSettings(cwd, mode, off, pass)), ...modes.promptArgs(cwd, mode, path.join(process.cwd(), 'data', 'node', 'agent-prompts'), service, pass)]
  else if (!viaChannel) args = [...args, '--settings', JSON.stringify({ enabledPlugins: off })]
  // 591: душа узла (`lib/agent-kit/soul.md`) — в системной подсказке каждой сессии: у элемента с группами её кладёт `promptArgs`
  // первой, у остальных (главный агент, элемент старого шаблона) — здесь, одна.
  if (!modes.hasGroups(cwd) && typeof modes.soulArgs === 'function') args = [...args, ...modes.soulArgs(path.join(process.cwd(), 'data', 'node', 'agent-prompts'), service)]
  // 426 (✗ 2026-10-07: первое сообщение из Telegram пропало целиком — вставка по «3 с тишины» ушла раньше, чем Claude Code начал
  // принимать ввод, пока грузился плагин каналов): первое поручение новой сессии — аргументом запуска. `claude "<запрос>"` в
  // интерактивном режиме берёт его первым, когда готов, — момент готовности не угадывается. Многострочный текст с кавычками и
  // кириллицей доходит через node-pty байт в байт (замерено тем же днём).
  // 551-7: поручение, начатое с «-», `claude` прочёл бы флагом — пробел впереди оставляет его текстом.
  // 570: модель по роду работы (`lib/agent-kit/modes.cjs` `launchModel`) — один флаг с одним значением, до поручения.
  const model = typeof modes.launchModel === 'function' ? modes.launchModel(cwd, mode, pass) : null
  if (model) args = [...args, '--model', model]
  // 590-5: команда элемента `npm run pass` узнаёт проход своей сессии из окружения и не переключает сессию на тот же проход.
  if (modes.hasGroups(cwd) && mode === 'build') env = { ...env, FRACTERA_PASS: pass }
  // 587-5 (владелец 2026-10-24): «если пользователь авторизуется в Claude Code Agent а затем придёт терминал … если есть такая запись то
  // подставить её как в техническое задание в терминал, сразу после подтверждения папки. Если же пользователь активировать Telegram …
  // сразу же отправляются это задание с текстом … запускаем его в работу?». Первое задание узла (главная root → `data/node/first-task.json`)
  // забирает первая сессия главного агента, начатая без своего поручения: запись стирается, второй путь её уже не видит. Вопрос доверия
  // папке остаётся человеку — поручение `claude` берёт после него.
  if (!firstPrompt && element === MAIN_AGENT) {
    const task = takeFirstTask()
    if (task) firstPrompt = firstTaskPrompt(task, viaChannel)
  }
  if (firstPrompt) args = [...args, firstPrompt.startsWith('-') ? ` ${firstPrompt}` : firstPrompt]
  let child
  try {
    child = pty.spawn(bin, args, { cols: 120, rows: 32, cwd, env, name: 'xterm-256color' })
  } catch (err) {
    notice(`[claude не запустился: ${err instanceof Error ? err.message : String(err)}]`)
    return { ok: false, reason: 'spawn-failed' }
  }
  // 548-13: канал — это аргументы плагина Telegram, а не любые аргументы (поручение и `--add-dir` каналом не делают).
  const born = session.register({ service, pid: child.pid, proc: child, cwd, channel: viaChannel })
  born.taskUrls = new Set()
  born.pass = pass
  // 551-7: запуск со страницы с задачей из ссылки — вопрос доверия папке отвечает мост; согласие — нажатие, которое привело сюда.
  if (answerTrust) {
    born.answerTrust = true
    born.trustOk = true
  }
  child.onData((data) => {
    session.remember(born, data)
    for (const client of born.clients) if (client.readyState === client.OPEN) client.send(data)
    watchPrompt(born)
    watchTrust(born)
    watchAsk(born)
  })
  child.onExit(() => {
    session.exited(born)
    startQueuedPass(element)
  })
  return { ok: true, session: born }
}

// ── ПРОХОДЫ: ОЧЕРЕДЬ ВМЕСТО УБИЙСТВА ЖИВОЙ СЕССИИ (590-5) ─────────────────────────────────────────────────────────────────────────
// Запрос другого прохода, пока идёт сессия строительства, не убивает её: проход ждёт здесь и рождается, когда та закроется (агент
// закрывает себя сам командой `npm run pass`, записав `current-step.md`). Таймеров нет: очередь проверяется только при выходе сессии;
// запись старше получаса там же снимается со строкой в журнале — выход сессии на другой день не родит забытый проход.
const queuedPass = new Map()
const QUEUE_TTL_MS = 30 * 60 * 1000

function startQueuedPass(element) {
  const next = queuedPass.get(element)
  if (!next) return
  queuedPass.delete(element)
  if (Date.now() - next.at > QUEUE_TTL_MS) {
    console.log(`[agents/wake] ${element}: проход ${next.pass} ждал дольше получаса — снят, не рождаю`)
    return
  }
  // Переключение просил человек (агент исполнил его слова) — вопроса в Telegram и вопроса доверия папке не нужно.
  wake(element, { text: next.text, confirmed: true })
    .then((r) => console.log(`[agents/wake] ${element}: проход ${next.pass} из очереди → ${r.ok ? (r.started ? 'started' : r.queued ? 'queued again' : 'ok') : r.reason}`))
    .catch((err) => console.error(`[agents/wake] ${element}: проход ${next.pass} из очереди — ${err instanceof Error ? err.message : err}`))
}

// ── ВОПРОС-РАЗРЕШЕНИЕ НА ЭКРАНЕ → ЗАДАЧА A2A «ЖДЁТ ЧЕЛОВЕКА» (418-4; владелец 2026-10-07: «to do it now») ──────────────────────
// Агент, разбуженный задачей A2A, может встать на вопросе Claude Code «разрешить?» — и до ответа человека не делает ничего, а
// задача у вызывающего выглядит «работает». Здесь экран читается после затишья: вопрос есть — каждой задаче этой сессии уходит
// `{ state: "input-required" }`, вопрос ушёл — `{ state: "working" }`. Только переходы, без таймеров опроса: проверка идёт по
// выводу самого терминала. Признаки — из строк самой программы `claude.exe` (2026-10-07): у каждого диалога разрешения вопрос
// «Do you want to …» и вариант «No, and tell Claude what to do differently»; «Yes, and don't ask again for» — у большинства.
// 🛑 Ink рисует пробелы сдвигом курсора (`ESC[nC`): он заменяется пробелом до снятия управляющих последовательностей.
const PROMPT_QUIET_MS = 800
const plainScreen = (raw) => raw
  .replace(/\x1b\[\d*C/g, ' ')
  .replace(/\x1b\[[0-9;?]*[ -\/]*[@-~]/g, '')
  .replace(/\x1b\][^\x07\x1b]*(?:\x07|\x1b\\)/g, '')
  .replace(/\x1b[()][0-9A-Za-z]/g, '')
  .replace(/\s+/g, ' ')
/** 547: стоит ли на экране вопрос доверия папке Claude Code («Is this a project you created or one you trust?»). */
function trustOnScreen(buffer) {
  const tail = plainScreen(buffer.slice(-4000)).replace(/\s+/g, '')
  return /Isthisaprojectyoucreatedoroneyoutrust/i.test(tail) && /Yes,Itrustthisfolder/i.test(tail)
}
/**
 * 547 (владелец 2026-10-19: «ты активируешь папку также как и запускаешь агента то есть прямо из чата»): у пробуждённого агента
 * вопрос доверия папке отвечается так, как ответил бы человек, — стрелка вниз на «Yes, I trust this folder» и Enter, — но только
 * когда включение подтверждено кнопкой в Telegram (`trustOk`; вопрос с кнопками говорит и о папке). Иначе бот зовёт человека в
 * терминал (`telegram.tellWaiting`). Один раз на сессию; запуск со страницы терминала кнопкой не трогается — человек видит вопрос
 * сам. 551-7 (владелец 2026-10-20: «при таком переходе активировать терминал и подтверждается папка»): у запуска со страницы с
 * задачей из ссылки (`answerTrust`) вопрос отвечается так же, без Telegram.
 */
function watchTrust(s) {
  if (!(s.viaWake || s.answerTrust) || s.trustDone) return
  clearTimeout(s.trustTimer)
  s.trustTimer = setTimeout(() => {
    if (session.current(s.service) !== s || s.trustDone || !trustOnScreen(s.buffer)) return
    s.trustDone = true
    if (!s.trustOk) { void telegram.tellWaiting(s.service).catch(() => {}); return }
    try { s.proc.write('\x1b[B') } catch { return }
    setTimeout(() => { try { s.proc.write('\r') } catch { /* процесс завершён */ } }, 250)
  }, PROMPT_QUIET_MS)
  s.trustTimer.unref?.()
}

/**
 * 548 (владелец 2026-10-19: выйти за свою папку агент может, «но чтобы он это сделал он должен явно спросить разрешения у
 * архитектора»): порог ставит `scripts/element-isolate.mjs` (`permissions.ask` элемента), и Claude Code задаёт вопрос в терминале.
 * У агента, разбуженного из Telegram, этот вопрос иначе висел бы молча — бот зовёт человека в терминал по ссылке. Ответить за
 * человека узел не вправе: разрешение даёт только он. Один раз на каждый вопрос.
 */
function watchAsk(s) {
  if (!s.viaWake) return
  clearTimeout(s.askTimer)
  s.askTimer = setTimeout(() => {
    if (session.current(s.service) !== s) return
    const waiting = promptOnScreen(s.buffer)
    if (waiting && !s.askNotified) { s.askNotified = true; void telegram.tellWaiting(s.service).catch(() => {}) }
    if (!waiting) s.askNotified = false
  }, PROMPT_QUIET_MS)
  s.askTimer.unref?.()
}

/** Висит ли на хвосте экрана вопрос-разрешение Claude Code. */
function promptOnScreen(buffer) {
  const tail = plainScreen(buffer.slice(-4000))
  return /Do you want to /.test(tail) && /(tell Claude what to do differently|Yes, and don't ask again|1\. ?Yes)/.test(tail)
}
function watchPrompt(s) {
  if (!s.taskUrls || s.taskUrls.size === 0) return
  clearTimeout(s.promptTimer)
  s.promptTimer = setTimeout(() => {
    if (session.current(s.service) !== s) return
    const waiting = promptOnScreen(s.buffer)
    if (waiting === Boolean(s.promptWaiting)) return
    s.promptWaiting = waiting
    for (const url of s.taskUrls) void tellTask(url, waiting ? 'input-required' : 'working')
  }, PROMPT_QUIET_MS)
  s.promptTimer.unref?.()
}
/** Дверь задачи вызывающего — только петля этой машины, ключ узла; отказ двери (задача уже закрыта) — не ошибка. */
async function tellTask(url, state) {
  try {
    const u = new URL(url)
    if (u.hostname !== '127.0.0.1' && u.hostname !== 'localhost') return
    await fetch(u, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Node-Key': process.env.SETTINGS_SECRET ?? '' },
      body: JSON.stringify({ state }),
      signal: AbortSignal.timeout(10_000),
    })
  } catch { /* дверь недоступна — задача останется в прежнем состоянии */ }
}
/** Запомнить двери задач A2A, которые эта сессия выполняет. */
function rememberTasks(s, urls) {
  if (!s.taskUrls) s.taskUrls = new Set()
  for (const u of urls) if (typeof u === 'string' && u) s.taskUrls.add(u)
}

const MB = 1024 * 1024
/** Память на одну сессию (владелец 2026-10-05: «примерно 300 МБ свободной памяти на один терминал»); переменная — для прибора. */
const perSessionMb = () => Number(process.env.AGENT_SESSION_MB) || 300

/** Вставить текст во вход агента, когда его экран затих (интерфейс поднялся): вставкой в скобках, затем Enter. */
function pasteWhenReady(s, text, { quietMs = 3000, maxMs = 120_000 } = {}) {
  const t0 = Date.now()
  let last = -1
  let since = Date.now()
  const timer = setInterval(() => {
    if (session.current(s.service) !== s) return clearInterval(timer)
    const len = s.buffer.length
    if (len !== last) {
      last = len
      since = Date.now()
    }
    if ((len > 0 && Date.now() - since >= quietMs) || Date.now() - t0 > maxMs) {
      clearInterval(timer)
      s.proc.write(`\x1b[200~${text}\x1b[201~`)
      // 409-3: один Enter через 400 мс терялся у сессии с каналом Telegram (экран владельца: задача стоит во вводе, не
      // отправлена). Повтор безопасен: пустой Enter в Claude Code ничего не делает.
      for (const ms of [400, 2500, 6000]) setTimeout(() => { if (session.current(s.service) === s) s.proc.write('\r') }, ms)
    }
  }, 500)
  timer.unref?.()
}

/**
 * РАЗБУДИТЬ АГЕНТА СЛУЖБЫ БЕЗ БРАУЗЕРА (409-1). Сессия жива — только вставить текст. Свободной памяти меньше нормы на сессию —
 * отказ с цифрами, ничего не рождается (задача ждёт). Открытая потом страница терминала видит этот же экран.
 */
async function wake(element, { text, from, about, declineUrl, confirmed, taskUrls = [] } = {}) {
  const urls = [declineUrl, ...taskUrls].filter(Boolean)
  // 552-4 (владелец 2026-10-20: «каждый из этих процессов может отправлять первое слово»): у элемента с группами навыков запрос
  // идёт в сессию своего процесса по первому слову; слова нет — строительство, и это пишется в журнал узла. Ключ сессии
  // рабочего процесса — `<id>--work`. У элемента без групп — одна сессия и текст как есть.
  let service = element
  let pass = 'main'
  const grouped = modes.hasGroups(serviceDir(element))
  if (text && grouped) {
    const word = modes.modeOfText(text)
    if (!word) console.log(`[agents/wake] ${element}: запрос без первого слова процесса — строительство`)
    const mode = word ?? 'build'
    // 590-5: у строительства — проход по слову («Build process, design:» · «Build process, texts:» · «Build process:»).
    if (mode === 'build') pass = modes.passOfText(text) ?? 'main'
    text = modes.withWord(text, mode)
    service = modes.sessionKey(element, mode)
  }
  // 590-5: слово прохода без задачи — родить сессию прохода без поручения (ноль токенов).
  const task = text && grouped ? modes.taskOfText(text) : text
  const live = session.current(service)
  if (live) {
    if (grouped && modes.modeOfKey(service) === 'build' && (live.pass ?? 'main') !== pass) {
      queuedPass.set(element, { pass, text: task ? text : `${modes.PASS_WORDS[pass] ?? modes.WORDS.build}`, at: Date.now() })
      console.log(`[agents/wake] ${element}: проход ${pass} ждёт — идёт сессия прохода ${live.pass ?? 'main'}`)
      return { ok: true, queued: pass, running: live.pass ?? 'main' }
    }
    rememberTasks(live, urls)
    if (text && task) pasteWhenReady(live, text, { quietMs: 500 })
    return { ok: true, already: true }
  }
  // 409-3: бот элемента подключён — сначала вопрос человеку в Telegram; сессия родится по кнопке «Запустить» (`confirmed`).
  // 552-4: бот и вопрос — элемента, а не ключа сессии; кнопка «Запустить» вернётся сюда с тем же текстом и тем же режимом.
  if (!confirmed && telegram.connected(element)) return telegram.askToStart(element, { text, from, about, declineUrl })
  const freeMb = Math.floor(os.freemem() / MB)
  const per = perSessionMb()
  if (freeMb < per) return { ok: false, reason: 'memory', freeMb, perSessionMb: per }
  const r = await spawnAgent(service, undefined, undefined, text && task ? `${text}\n\n${finishRule(service)}` : '', { pass })
  if (!r.ok) return { ok: false, reason: r.reason }
  rememberTasks(r.session, urls)
  // 547: агент включён пробуждением; кнопка «Включить» в Telegram — согласие и на папку.
  r.session.viaWake = true
  r.session.trustOk = Boolean(confirmed)
  // 409-5 (владелец: «timeout more then 60 min»): через 60 минут от пробуждения — вопрос «закрыть терминал?». Только для
  // пробуждённых сессий; сама сессия не закрывается — закрывает агент по ответу человека. Переменная — для прибора.
  const born = r.session
  // 552-4: у сессии рабочего процесса нет канала — ответ «выключить» до неё не дойдёт; её закрывает «закончил» (см. `done`).
  if (modes.modeOfKey(service) !== 'work') {
    const timer = setTimeout(() => { if (session.current(service) === born) telegram.askToClose(service, 'timeout', { reviewed: Boolean(born.reviewed) }) }, wakeTimeoutMs())
    timer.unref?.()
  }
  return { ok: true, started: true, freeMb, perSessionMb: per }
}

const wakeTimeoutMs = () => Number(process.env.AGENT_WAKE_TIMEOUT_MS) || 60 * 60 * 1000

/**
 * 409-5: как пробуждённому агенту закончить — дописывается к первому вставленному тексту, поэтому знает любой элемент без
 * правки его репозитория. Адрес — порт работающего сервера ядра (`process.env.PORT` этого процесса), не запомненное число.
 */
function finishRule(service) {
  // 🛑 `localhost`, не `127.0.0.1`: сервер ядра слушает `localhost`, на Windows это IPv6 — по `127.0.0.1` вызов агента в 409-5
  // отказал (curl, код 7), агент нашёл адрес сам в `logs/runtime.json` (закон проекта «хост подписки — тот, что слушает сервер»).
  const base = `http://localhost:${process.env.PORT || 24680}/api/agents`
  const door = `${base}/done`
  // 552-4 (владелец 2026-10-20: «Узел закрывает её сам»): сессия рабочего процесса без Telegram — «закончил» её и закрывает.
  if (modes.modeOfKey(service) === 'work') {
    return `${languageRule(modes.baseOf(service), base)} Это сессия рабочего процесса. Если это была задача A2A от другого агента (заказ) и она закрыта — до сообщения узлу сохрани сводку заказа по навыку order-summary (нет такого навыка — пропусти). Когда ответишь, сообщи узлу: POST ${door} с заголовком X-Node-Key = SETTINGS_SECRET из .env.local и телом {"service":"${service}"} — узел закроет эту сессию сам. Тело — файлом UTF-8 (curl --data-binary @файл).`
  }
  // 412-4 (владелец 2026-10-06: «в момент закрытия … был бы обязан создать саммари по проделанной работе»): задача A2A — заказ;
  // его сводка без персональных данных пишется ДО сообщения «закончил». Навыка нет у элемента — правило к нему не относится.
  return `${languageRule(service, base)} Если это была задача A2A от другого агента (заказ) и она закрыта — до сообщения узлу сохрани сводку заказа по навыку order-summary (нет такого навыка — пропусти). Когда закончишь и ответишь, сообщи узлу: POST ${door} с заголовком X-Node-Key = SETTINGS_SECRET из .env.local и телом {"service":"${service}"} — человек получит в Telegram вопрос «выключить агента?». Если человек ответит «выключить» (или «закрыть», на любом языке) — тот же запрос с телом {"service":"${service}","close":true}. Если человек ответит «разбор» (на любом языке) — сделай разбор своей работы по навыку self-review (нет такого навыка — скажи человеку, что разбор этому агенту недоступен), предложения пришли ему в Telegram по номерам, прими ответы вида «1 да, 2 нет», а затем снова отправь первый запрос, добавив в тело "reviewed":true — вопрос «выключить?» придёт ещё раз, уже без «разбор». Тело — файлом UTF-8 (curl --data-binary @файл).`
}

/**
 * 411-4 (владелец 2026-10-06: «в своем чате я вижу на своем языке … перешёл на Украинский … следовать продолжать на Украинский но
 * точно не по-китайски»): язык человека — из `person.json` бота элемента; агент пишет человеку на нём и сообщает узлу, когда
 * человек перешёл на другой язык (дверь `person-lang`) — с этого момента и вопросы ядра идут на новом языке.
 */
function languageRule(service, base) {
  const code = telegram.personLang(service)
  let name = code
  try { name = new Intl.DisplayNames(['ru'], { type: 'language' }).of(code) || code } catch { /* код как есть */ }
  return `Язык человека: ${name} (${code}). Всё, что пишешь человеку в Telegram, — на этом языке, на каком бы языке ни пришла задача. Если человек стал писать тебе на другом языке — сообщи узлу: POST ${base}/person-lang с тем же заголовком и телом {"service":"${service}","lang":"<код BCP 47, например uk>"} — и дальше пиши ему на новом языке.`
}

/**
 * АГЕНТ СООБЩИЛ «РАБОТА ЗАКОНЧЕНА» (409-5). Без `close` — человеку в Telegram «Агент <имя> закончил. Выключить его? Ответьте
 * «выключить»» (решение владельца «Ответ текстом»: пока терминал запущен, бота читает плагин и чужие кнопки выбрасывает). С `close`
 * — агент получил «закрыть» от человека и закрывает свой терминал; остановка — после ответа двери, чтобы агент его увидел.
 */
async function done(service, { close = false, reviewed = false } = {}) {
  const live = session.current(service)
  if (!live) return { ok: false, reason: 'no-session' }
  // 552-4 (владелец 2026-10-20: «Узел закрывает её сам»): сессия рабочего процесса закрывается по «закончил», без вопроса.
  if (close || modes.modeOfKey(service) === 'work') {
    const t = setTimeout(() => { if (session.current(service) === live) session.stop(service, 'closed-by-agent') }, 1500)
    t.unref?.()
    return { ok: true, closing: true }
  }
  // Владелец 2026-10-06: «делай паузу 5 секунд» — пара «спрашивает / отвечает» уходит в Telegram в фоне, и вопрос «выключить?»
  // её обгонял. Переменная — для прибора.
  await new Promise((r) => setTimeout(r, Number(process.env.AGENT_CLOSE_ASK_DELAY_MS) || 5000))
  // 414 (владелец 2026-10-06: «Он сначала мне предлагает закончить разговор а потом кидает ответы»): 5 с — только чтобы рассылка
  // успела начаться; дальше порядок по событию — ждём, пока пара разговора с этим элементом уйдёт в Telegram (перевод занимает
  // десятки секунд), не дольше 2 минут. Реестр пишет `lib/a2a/telegram-relay.ts` ядра.
  const relay = globalThis.__web4RelayPending?.get(service)
  if (relay) await Promise.race([relay, new Promise((r) => setTimeout(r, 120_000))])
  if (session.current(service) !== live) return { ok: false, reason: 'no-session' }
  // Владелец 2026-10-06: «второй раз не предлагать разбор после первого» — разбор в этой сессии был, строки «разбор» больше нет.
  if (reviewed) live.reviewed = true
  // 548-20 (владелец 2026-10-20: «Ты что считаешь что пользователя нужно каждый раз дёргать»): элемент под надзором главного агента
  // выключит главный агент (`npm run close`) — человеку не пишется «Выключить его?». Его «закончил» по-прежнему будит главного агента.
  try {
    if (require(path.join(process.cwd(), 'lib', 'web4-items', 'supervision.cjs')).byMain(service)) return { ok: true, asked: false, ledByMain: true }
  } catch { /* нет записи надзора — спросить, как прежде */ }
  // 592-3 (план шага 592, согласованный владельцем 2026-10-24): сессию, которую включил главный агент (`npm run task` → запись в
  // `data/node/woken-by-main.json`), у элемента без бота закрывает её же «закончил»: спросить «выключить?» некого, а живая сессия
  // держит ~300 МБ памяти человека. ✗ 589: reverse после ответа ядра остался включённым. Терминал открыт — кто-то смотрит, сессия
  // остаётся; у элемента с ботом и у включённой человеком — прежний вопрос.
  const id = modes.baseOf(service)
  if (!telegram.connected(id) && live.clients.size === 0 && wokenByMain(id)) {
    forgetWokenByMain(id)
    const t = setTimeout(() => { if (session.current(service) === live) session.stop(service, 'closed-woken-by-main') }, 1500)
    t.unref?.()
    return { ok: true, closing: true, wokenByMain: true }
  }
  return telegram.askToClose(service, 'done', { reviewed: Boolean(live.reviewed) })
}

/** 592-3: агентов, которых включил главный агент, записывает его команда `task` (`scripts/main-agent-cli.mjs`, `markWoken`). */
const wokenFile = () => path.join(process.cwd(), 'data', 'node', 'woken-by-main.json')
function wokenByMain(id) {
  try { return Object.prototype.hasOwnProperty.call(JSON.parse(readFileSync(wokenFile(), 'utf8')), id) } catch { return false }
}
function forgetWokenByMain(id) {
  try {
    const j = JSON.parse(readFileSync(wokenFile(), 'utf8'))
    delete j[id]
    writeFileSync(wokenFile(), JSON.stringify(j, null, 2) + '\n', 'utf8')
  } catch { /* записи нет — стирать нечего */ }
}

// 409-3: кнопка «Запустить» в Telegram рождает сессию этим же путём, уже с подтверждением.
telegram.setStarter((service, opts) => wake(service, { ...opts, confirmed: true }))

/** Принять сокет службы — его отдаёт общее подключение узла (`lib/agent-kit/mount.cjs`). */
function onConnection(ws, service) {
  {
    let attached = null
    let started = false

    const deadline = setTimeout(() => {
      if (!started) ws.close(CLOSE_POLICY, 'no-init')
    }, INIT_DEADLINE_MS)

    function fail(reason) {
      clearTimeout(deadline)
      console.error(`[pty] отказ: ${reason}`)
      ws.close(CLOSE_POLICY, reason)
    }

    /**
     * Подключиться к живой сессии агента или родить её — только по явному запуску.
     * 🛑 Подключение без `start` к спящей сессии ничего не рождает и закрывается с причиной `not-running`:
     * страница, открытая «просто посмотреть», не имеет права поднять процесс.
     */
    async function startAgent(service, wantStart, task = '') {
      if (!pty) {
        ws.send(`\r\n[терминал недоступен: node-pty не загружен — ${ptyLoadError}]\r\n`)
        fail('pty-unavailable')
        return
      }
      if (starting.has(service)) {
        fail('starting')
        return
      }
      let s = session.current(service)
      if (!s) {
        if (!wantStart) {
          started = true
          clearTimeout(deadline)
          ws.close(1000, 'not-running')
          return
        }
        started = true
        clearTimeout(deadline)
        // 409-1: запуск — общая функция с пробуждением без браузера (`spawnAgent` выше). 551-7: задача из ссылки — первым поручением.
        // 552-4: терминал страницы — сессия строительства; задача из ссылки у элемента с группами открывается словом своего процесса.
        const first = task && modes.hasGroups(serviceDir(service)) ? modes.withWord(task, 'build') : task
        // 590-5: задача из ссылки со словом прохода рождает сессию этого прохода; кнопка без задачи — основной проход.
        const pass = first && modes.hasGroups(serviceDir(service)) ? (modes.passOfText(first) ?? 'main') : 'main'
        const r = await spawnAgent(service, (line) => ws.send(`\r\n${line}\r\n`), () => ws.readyState === ws.OPEN, first, { answerTrust: Boolean(task), pass })
        if (!r.ok) {
          fail(r.reason)
          return
        }
        s = r.session
      } else if (task) {
        // 551-7: агент успел запуститься другим путём — задача не вставляется сама (на экране может стоять вопрос, Enter ответил бы
        // на него): браузер подключится заново, задача ждёт в окне вставки.
        started = true
        fail('already-running')
        return
      } else if (s.buffer) {
        // Возврат на страницу показывает прежний экран: сначала накопленное, потом живой поток.
        ws.send(s.buffer)
      }
      s.clients.add(ws)
      attached = s
      started = true
      clearTimeout(deadline)
    }

    /**
     * Короткий терминал входа в подписку (267-2): живёт ровно столько, сколько сокет.
     * 🔒 В отличие от агента, он не переживает уход со страницы: вход — разовое действие, и оставленный
     * без присмотра `claude auth login` просто ждал бы кода вечно.
     */
    let own = null
    function startLogin(service) {
      if (!pty) {
        ws.send(`\r\n[терминал недоступен: node-pty не загружен — ${ptyLoadError}]\r\n`)
        fail('pty-unavailable')
        return
      }
      if (ephemeral >= MAX_EPHEMERAL) {
        fail('too-many-sessions')
        return
      }
      const shell = shellPath()
      try {
        own = pty.spawn(shell, [], { cols: 100, rows: 24, cwd: serviceDir(service) || os.homedir(), env: shellEnv(shell), name: 'xterm-256color' })
      } catch (err) {
        ws.send(`\r\n[оболочка ${shell} не запустилась: ${err instanceof Error ? err.message : String(err)}]\r\n`)
        fail('spawn-failed')
        return
      }
      ephemeral += 1
      started = true
      clearTimeout(deadline)
      const child = own
      child.onData((data) => {
        if (ws.readyState === ws.OPEN) ws.send(data)
      })
      child.onExit(() => {
        if (own === child) own = null
        ephemeral = Math.max(0, ephemeral - 1)
        if (ws.readyState === ws.OPEN) ws.close(1000, 'exited')
      })
      setTimeout(() => {
        try { child.write(MODES.login(claudeBin())) } catch { /* оболочка уже закрыта */ }
      }, 800)
    }

    ws.on('message', (raw) => {
      let msg = null
      try { msg = JSON.parse(raw.toString()) } catch { return }
      if (!msg || typeof msg !== 'object') return

      if (msg.type === 'init') {
        if (started) return
        // Билет одноразовый и живёт минуту; его выдала дверь под ролью архитектора.
        if (!redeemTicket(msg.ticket)) {
          fail('bad-ticket')
          return
        }
        if (msg.mode === 'agent') {
          // 551-7: задача приходит только с запуском; предел и чистка — как у окна вставки (`terminal-paste.mjs`, PASTE_LIMIT).
          const task = msg.start === true && typeof msg.task === 'string'
            ? msg.task.replace(/[\u0000-\u0008\u000b-\u001f\u007f]/g, '').slice(0, TASK_LIMIT).trim()
            : ''
          startAgent(service, msg.start === true, task)
          return
        }
        if (msg.mode === 'login') {
          startLogin(service)
          return
        }
        fail('unknown-mode')
        return
      }
      const target = attached ? attached.proc : own
      if (!target) return
      if (msg.type === 'stdin' && typeof msg.data === 'string') {
        try { target.write(msg.data) } catch { /* процесс завершён */ }
        return
      }
      if (msg.type === 'resize' && msg.cols && msg.rows) {
        try { target.resize(Number(msg.cols), Number(msg.rows)) } catch { /* процесс завершён */ }
      }
    })

    ws.on('close', () => {
      clearTimeout(deadline)
      // Короткий терминал входа умирает вместе с сокетом.
      if (own) {
        const child = own
        own = null
        try { child.kill() } catch { /* уже мёртв */ }
      }
      // Уход со страницы отключает, но не убивает.
      if (attached) {
        attached.clients.delete(ws)
        attached = null
      }
    })
  }
}

module.exports = { onConnection, spawnAgent, wake, done, finishRule, shellPath, shellEnv, ptyLoadError: () => ptyLoadError, hasPty: () => pty !== null }
