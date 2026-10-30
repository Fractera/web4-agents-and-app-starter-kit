// 615-2 — ХОД РАБОТЫ АГЕНТА В TELEGRAM: хук Claude Code (async) на каждое действие сессии с каналом; его ставит мост (`bridge.cjs`).
//
// Владелец 2026-10-30: «можем ли мы в Telegram чат пробрасывать очень сжатые и короткие фрагменты похожие на это буквально потри слова на
// каждое событие с временем?»; формат — «-thinking 13:37:23 fractera-picture-generator: …»; вид — «varian 2 is best» (блок кода, 🧠).
// ✗ Чем вызвано: 13:22–13:24 главный агент 2,5 минуты работал над ответом, а человек в Telegram не видел ничего.
//
// Как: событие → фраза из словаря по виду действия (мыслей модели в стенограмме нет — блоки thinking пустые, замер 615) → строка в
// состоянии чата → черновик `sendMessageDraft` (Bot API: личный чат, тот же draft_id перерисовывается, «temporary 30-second preview»).
// 🔒 Сырые команды, пути и тексты не уходят никогда — только слова словаря, имя навыка или файла, номер элемента.
// 🔒 Ответ агента (`reply` канала) закрывает черновик: следующее действие начинает новый. Черновик старше 30 с — тоже новый.
// 🔒 Не чаще раза в секунду на чат: отправляет последняя записанная строка. Ошибки молчат — ход не вправе мешать агенту.
// Запуск (мост, exec-вид): node progress.cjs <корень узла> <элемент> ; JSON события — stdin. Ноль токенов модели.

const fs = require('node:fs')
const path = require('node:path')

const PLUGIN_TOOL = 'mcp__plugin_telegram_telegram__'
const KEEP = 6
const DRAFT_LIFE_MS = 30_000
const GAP_MS = 1000

const readJson = (f, fb) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')) } catch { return fb } }
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
const base = (p) => String(p ?? '').replace(/\\/g, '/').replace(/\/+$/, '').split('/').pop()
const short = (s, n = 40) => { const t = String(s ?? '').replace(/["'`$<>{}|\\]/g, '').replace(/\s+/g, ' ').trim(); return t.length > n ? `${t.slice(0, n - 1)}…` : t }

// Словарь: функции от аргумента (что именно), en и ru; прочие языки — переводом таблицы (411-2), иначе en.
const PHRASES = {
  en: {
    find: (a) => `looking for an element «${a}»`, contacts: () => 'looking at the node', card: (a) => `reading the card of ${a}`,
    task: (a) => `passing a task to ${a}`, state: () => 'checking the elements', create: () => 'creating an element', supervise: (a) => `leading ${a}`,
    person: () => 'checking the channel', close: (a) => `turning off ${a}`, done: () => 'finishing', remember: () => 'remembering', remind: () => 'recalling',
    lagrix: () => 'looking at Lagrix', needs: () => 'reading requests', skillsBase: () => 'searching the skills base', trust: (a) => `trusting the folder of ${a}`,
    passport: () => 'reading my passport', neighbour: () => 'looking for a neighbour', blocks: () => 'working with blocks', history: () => 'reading the history',
    npm: (a) => `running ${a}`, git: (a) => `git ${a}`, push: () => 'sending to GitHub', script: (a) => `running ${a}`, door: () => 'calling a node door',
    list: () => 'looking at files', readFile: (a) => `reading ${a}`, readSkill: (a) => `reading the skill ${a}`, search: () => 'searching the files',
    edit: (a) => `editing ${a}`, skill: (a) => `skill ${a}`, web: (a) => `reading ${a}`, webSearch: () => 'searching the web', tool: () => 'loading a tool',
    reply: () => 'writing the answer', react: () => 'reacting', attachment: () => 'opening the attachment', editMessage: () => 'editing the message',
    command: () => 'running a command', work: () => 'working', replyCore: () => 'answering the main agent', mainAgent: 'main agent',
    hint: () => 'Words for me: «off» — when we are done; «review» — I suggest how to improve my skills; «commands» — the node\'s commands.',
  },
  ru: {
    find: (a) => `ищу элемент «${a}»`, contacts: () => 'смотрю узел', card: (a) => `смотрю карточку ${a}`,
    task: (a) => `передаю задачу ${a}`, state: () => 'смотрю элементы', create: () => 'создаю элемент', supervise: (a) => `веду ${a}`,
    person: () => 'проверяю канал', close: (a) => `выключаю ${a}`, done: () => 'заканчиваю', remember: () => 'запоминаю', remind: () => 'вспоминаю',
    lagrix: () => 'смотрю сеть Lagrix', needs: () => 'читаю запросы', skillsBase: () => 'ищу в базе навыков', trust: (a) => `подтверждаю папку ${a}`,
    passport: () => 'узнаю себя', neighbour: () => 'ищу соседа', blocks: () => 'работаю с блоками', history: () => 'читаю историю',
    npm: (a) => `запускаю ${a}`, git: (a) => `git ${a}`, push: () => 'отправляю в GitHub', script: (a) => `запускаю ${a}`, door: () => 'обращаюсь к двери узла',
    list: () => 'смотрю файлы', readFile: (a) => `читаю ${a}`, readSkill: (a) => `читаю навык ${a}`, search: () => 'ищу в файлах',
    edit: (a) => `правлю ${a}`, skill: (a) => `навык ${a}`, web: (a) => `читаю ${a}`, webSearch: () => 'ищу в интернете', tool: () => 'подключаю инструмент',
    reply: () => 'пишу ответ', react: () => 'ставлю реакцию', attachment: () => 'открываю вложение', editMessage: () => 'правлю сообщение',
    command: () => 'выполняю команду', work: () => 'работаю', replyCore: () => 'отвечаю главному агенту', mainAgent: 'главный агент',
    hint: () => 'Слова для меня: «выключить» — когда закончим; «разбор» — предложу, как улучшить мои навыки; «команды» — список команд узла.',
  },
}

const NPM = { find: 'find', contacts: 'contacts', card: 'card', task: 'task', state: 'state', create: 'create', supervise: 'supervise', person: 'person',
  close: 'close', done: 'done', remember: 'remember', remind: 'remind', lagrix: 'lagrix', needs: 'needs', need: 'needs', 'skills-base': 'skillsBase',
  skills: 'skillsBase', trust: 'trust', passport: 'passport', a2a: 'neighbour', blocks: 'blocks', evolution: 'history', 'reply-core': 'replyCore' }
const WITH_ID = new Set(['card', 'task', 'supervise', 'close', 'trust'])

/** Событие → [ключ словаря, аргумент]. Только слова словаря и короткие имена — ни команд, ни путей целиком. */
function phraseOf(tool, input) {
  if (tool.startsWith(PLUGIN_TOOL)) {
    const t = tool.slice(PLUGIN_TOOL.length)
    return [{ reply: 'reply', react: 'react', download_attachment: 'attachment', edit_message: 'editMessage' }[t] ?? 'work']
  }
  if (tool === 'Bash' || tool === 'PowerShell') {
    const cmd = String(input?.command ?? '')
    const npm = /\bnpm\s+run\s+(?:--silent\s+)?([a-z0-9:_-]+)(?:\s+--)?\s*([^\n;&|]*)/i.exec(cmd)
    if (npm) {
      const key = NPM[npm[1].toLowerCase()]
      const rest = npm[2].replace(/\s*\d*>.*$/, '').trim()
      if (key === 'find') return ['find', short(rest, 30)]
      if (key && WITH_ID.has(key)) return [key, short(rest.split(/\s+/)[0], 24)]
      return key ? [key] : ['npm', short(npm[1], 24)]
    }
    const git = /\bgit\s+([a-z-]+)/.exec(cmd)
    if (git) return git[1] === 'push' ? ['push'] : ['git', short(git[1], 12)]
    // ✗ живой прогон 615-3: `node -e "…"` показался «запускаю -e» — флаг node не имя скрипта
    const node = /\bnode\s+(?:"([^"]+)"|(\S+))/.exec(cmd)
    if (node && !(node[2] ?? '').startsWith('-')) return ['script', short(base(node[1] ?? node[2]), 30)]
    if (node) return ['command']
    if (/\bcurl\b|Invoke-(RestMethod|WebRequest)/i.test(cmd)) return ['door']
    if (/^\s*(ls|dir|Get-ChildItem)\b/i.test(cmd)) return ['list']
    if (/\b(grep|rg|findstr|Select-String|find)\b/i.test(cmd)) return ['search']
    return ['command']
  }
  if (tool === 'Read') {
    const p = String(input?.file_path ?? '').replace(/\\/g, '/')
    const skill = /\/skills\/([^/]+)\/SKILL\.md$/i.exec(p)
    return skill ? ['readSkill', short(skill[1], 30)] : ['readFile', short(base(p), 30)]
  }
  if (tool === 'Write' || tool === 'Edit' || tool === 'NotebookEdit') return ['edit', short(base(input?.file_path), 30)]
  if (tool === 'Glob' || tool === 'Grep') return ['search']
  if (tool === 'Skill') return ['skill', short(input?.skill ?? input?.name, 30)]
  if (tool === 'WebFetch') { try { return ['web', new URL(input?.url).hostname] } catch { return ['web', 'web'] } }
  if (tool === 'WebSearch') return ['webSearch']
  if (tool === 'ToolSearch') return ['tool']
  if (/skills_find/.test(tool)) return ['skillsBase']
  return ['work']
}

async function tableFor(root, lang) {
  const l = String(lang || 'en').split('-')[0]
  if (PHRASES[l]) return PHRASES[l]
  try {
    const translate = require(path.join(root, 'app', '[lang]', '(architectLayer)', 'architect', 'build', '_agent-kit', 'server', 'translate.cjs'))
    const t = await translate.tableFor('telegram-progress', PHRASES.en, lang)
    return { ...PHRASES.en, ...t }
  } catch { return PHRASES.en }
}

/** Бот элемента: токен, допущенные чаты, язык человека — или null. */
function botOf(root, element) {
  const dir = path.join(root, 'data', 'services', element, 'channel', 'telegram')
  const line = (() => { try { return fs.readFileSync(path.join(dir, '.env'), 'utf8').split(/\r?\n/).find((l) => l.startsWith('TELEGRAM_BOT_TOKEN=')) } catch { return '' } })()
  const token = line ? line.slice('TELEGRAM_BOT_TOKEN='.length).trim() : ''
  const chats = (readJson(path.join(dir, 'access.json'), {}).allowFrom ?? []).map(String)
  if (!token || !chats.length) return null
  return { bot: element, token, chats, lang: readJson(path.join(dir, 'person.json'), {}).lang || 'en' }
}

/**
 * 615-3 (владелец: «главное агент может работать одновременно с несколькими другими агентами поэтому промежуточные ответы … других
 * элементов должны начинаться … -thinking 13:37:23 fractera-picture-generator:»): элемент, которого включил главный агент
 * (`data/node/woken-by-main.json`, `npm run task`) или ведёт надзором (`supervision.cjs` `byMain`), пишет ход в чат главного агента;
 * остальные — в чат своего бота; нет бота — никуда.
 */
function ledByMain(root, element) {
  if (element === 'build') return false
  if (Object.prototype.hasOwnProperty.call(readJson(path.join(root, 'data', 'node', 'woken-by-main.json'), {}), element)) return true
  try { return require(path.join(root, 'lib', 'web4-items', 'supervision.cjs')).byMain(element, root) } catch { return false }
}

function route(root, element) {
  return botOf(root, ledByMain(root, element) ? 'build' : element)
}

function agentName(root, element, t) {
  if (element === 'build') return t.mainAgent
  const a = readJson(path.join(root, 'data', 'services', element, 'address.json'), {}).address
  return typeof a === 'string' && /^[a-z0-9-]{1,40}$/.test(a) ? a : element
}

// ── состояние чата: последние строки и номер черновика; запись под замком (хуки разных действий идут параллельно) ──
const stateFile = (root, bot, chat) => path.join(root, 'data', 'node', 'progress', `${bot}-${chat}.json`)

async function withLock(file, fn) {
  const lock = `${file}.lock`
  fs.mkdirSync(path.dirname(file), { recursive: true })
  for (let i = 0; i < 100; i++) {
    try {
      const fd = fs.openSync(lock, 'wx')
      try { return await fn() } finally { fs.closeSync(fd); try { fs.unlinkSync(lock) } catch {} }
    } catch (err) {
      if (err.code !== 'EEXIST') throw err
      try { if (Date.now() - fs.statSync(lock).mtimeMs > 5000) fs.unlinkSync(lock) } catch {}
      await sleep(30)
    }
  }
  return null
}

function render(lines) {
  return `<pre>${lines.map((l) => `🧠 thinking ${esc(l.at)} ${esc(l.who)}:\n   ${esc(l.what)}`).join('\n')}</pre>`
}

async function tg(token, method, body) {
  try {
    const r = await fetch(`https://api.telegram.org/bot${token}/${method}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal: AbortSignal.timeout(10_000) })
    return await r.json()
  } catch { return { ok: false } }
}

const hhmmss = () => new Date().toTimeString().slice(0, 8)

async function onPre(root, element, ev) {
  // сам ответ строкой не рисуется: хук идёт в фоне и мог бы показать «пишу ответ» уже после ответа — ответ и так заменяет ход
  if (String(ev.tool_name ?? '') === `${PLUGIN_TOOL}reply`) return
  const r = route(root, element)
  if (!r) return
  const t = await tableFor(root, r.lang)
  const [key, arg] = phraseOf(String(ev.tool_name ?? ''), ev.tool_input)
  const what = (t[key] ?? PHRASES.en[key] ?? PHRASES.en.work)(arg ?? '')
  const row = { at: hhmmss(), who: agentName(root, element, t), what }
  for (const chat of r.chats) {
    const file = stateFile(root, r.bot, chat)
    const mine = await withLock(file, async () => {
      const s = readJson(file, null)
      const fresh = !s || Date.now() - (s.updatedAt ?? 0) > DRAFT_LIFE_MS
      const next = fresh ? { draftId: 1 + Math.floor(Math.random() * 2_000_000_000), lines: [], sentAt: 0, seq: 0 } : s
      next.lines = [...next.lines, row].slice(-KEEP)
      next.seq += 1
      next.updatedAt = Date.now()
      fs.writeFileSync(file, JSON.stringify(next))
      return { seq: next.seq, wait: Math.max(0, (next.sentAt ?? 0) + GAP_MS - Date.now()) }
    })
    if (!mine) continue
    if (mine.wait) await sleep(mine.wait)
    const send = await withLock(file, async () => {
      const s = readJson(file, null)
      if (!s || s.seq !== mine.seq) return null // строку уже несёт более поздний хук
      s.sentAt = Date.now()
      fs.writeFileSync(file, JSON.stringify(s))
      return s
    })
    if (send) await tg(r.token, 'sendMessageDraft', { chat_id: Number(chat), draft_id: send.draftId, text: render(send.lines), parse_mode: 'HTML' })
  }
}

async function onPost(root, element, ev) {
  if (String(ev.tool_name ?? '') !== `${PLUGIN_TOOL}reply`) return
  const r = route(root, element)
  // ответ ушёл — черновик этого хода закрыт: следующее действие начнёт новый. Закрывает только хозяин чата (615-3: ответ элемента в своём
  // боте не закрывает черновик чата главного агента).
  if (!r || r.bot !== element) return
  for (const chat of r.chats) {
    const file = stateFile(root, r.bot, chat)
    await withLock(file, async () => { try { fs.unlinkSync(file) } catch {} })
  }
  // 615-6: время ответа человеку — по нему мост не даёт главному агенту закрыться без доклада после вставки узла
  try { fs.writeFileSync(path.join(root, 'data', 'node', 'progress', `replied-${element}.json`), JSON.stringify({ at: Date.now() })) } catch {}
  if (element === 'build') await hintOnce(root, r, String(ev.session_id ?? ''))
}

/**
 * 615-4 (владелец 2026-10-30: «Один раз за сессию … После первого ответа сессии — одно короткое сообщение с тремя словами; дальше молчит.and
 * напоминание — через 60 минут работы»): после первого ответа сессии главного агента — одно сообщение «выключить · разбор · команды»;
 * вопрос после каждого ответа (603-3) не возвращается, напоминание через 60 минут остаётся в мосте. Сессии помнятся сутки.
 */
async function hintOnce(root, r, sessionId) {
  if (!sessionId) return
  const file = path.join(root, 'data', 'node', 'progress', 'hinted.json')
  const first = await withLock(file, async () => {
    const seen = readJson(file, {})
    if (seen[sessionId]) return false
    const now = Date.now()
    for (const [k, at] of Object.entries(seen)) if (now - at > 24 * 3600_000) delete seen[k]
    seen[sessionId] = now
    fs.writeFileSync(file, JSON.stringify(seen))
    return true
  })
  if (!first) return
  const t = await tableFor(root, r.lang)
  for (const chat of r.chats) await tg(r.token, 'sendMessage', { chat_id: Number(chat), text: (t.hint ?? PHRASES.en.hint)(), disable_web_page_preview: true })
}

module.exports = { phraseOf, render, PHRASES }

if (require.main === module) {
  const [root, element] = process.argv.slice(2)
  let raw = ''
  process.stdin.setEncoding('utf8')
  process.stdin.on('data', (d) => { raw += d })
  process.stdin.on('end', async () => {
    try {
      const ev = JSON.parse(raw)
      if (root) process.chdir(root)
      if (ev.hook_event_name === 'PreToolUse') await onPre(root, element, ev)
      else if (ev.hook_event_name === 'PostToolUse') await onPost(root, element, ev)
    } catch { /* ход не мешает агенту */ }
    process.exit(0)
  })
}
