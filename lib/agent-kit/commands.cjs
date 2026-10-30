// THE NODE'S HARD COMMANDS (node step 597). One list — `commands.json` next to this file — and everything built from it: the lines in the
// prompt of every session with a person (`modes.cjs`), the main agent's bot menu and the answer of a sleeping bot (`telegram.cjs`), the
// main agent's `npm run commands` (`scripts/node-commands.mjs`). Owner 2026-10-25: «инструкцию о всех жёстко запрограммированных командах
// таких как: запомни, напомни о, включить, выключить, какие-нибудь новые инструкции которые будут появляться в будущем». A new command is
// one entry of the file.
// 🔒 A command is recognised by the PURPOSE of a message, by the model, not by its words (owner 2026-10-26: «у нас 82 языка … пользователь
// может забыть слово и писать его с ошибкой … анализ прямого совпадения это вариант который нельзя использовать»). The agent reads every
// message with its model anyway — no extra call. Exact matching lives only where no model runs and a miss loses nothing: the bot menu's
// slash commands and a bare «команды» / «включить» to a sleeping bot; anything else reaches the agent as before.
const { readFileSync } = require('node:fs')
const path = require('node:path')

const FILE = path.join(__dirname, 'commands.json')
// Telegram Bot API, setMyCommands: «Text of the command; 1-32 characters. Can contain only lowercase English letters, digits and
// underscores»; description «1-256 characters».
const SLASH = /^[a-z0-9_]{1,32}$/

function load(file = FILE) {
  const j = JSON.parse(readFileSync(file, 'utf8'))
  return Array.isArray(j?.commands) ? j.commands : []
}

/** The list, or [] when the file is missing or broken: a session must start even then (the prompt simply has no commands). */
function safeLoad(file = FILE) {
  try {
    const list = load(file)
    return check(list).length ? [] : list
  } catch {
    return []
  }
}

/** Problems of the list, [] when it is good: Bot API names, both languages, who runs it. */
function check(list) {
  const problems = []
  const ids = new Set()
  const slashes = new Set()
  for (const [i, c] of (Array.isArray(list) ? list : []).entries()) {
    const at = typeof c?.id === 'string' ? `«${c.id}»` : `#${i + 1}`
    if (typeof c?.id !== 'string' || !/^[a-z][a-z0-9-]*$/.test(c.id)) problems.push(`${at}: id — lowercase latin`)
    else if (ids.has(c.id)) problems.push(`${at}: id repeats`)
    ids.add(c?.id)
    if (!SLASH.test(String(c?.slash ?? ''))) problems.push(`${at}: slash «${c?.slash}» — 1–32 characters a–z, 0–9, «_» (Bot API)`)
    else if (slashes.has(c.slash)) problems.push(`${at}: slash repeats`)
    slashes.add(c?.slash)
    for (const l of ['ru', 'en']) {
      const w = c?.words?.[l]
      if (!Array.isArray(w) || !w.length || w.some((x) => typeof x !== 'string' || !x.trim())) problems.push(`${at}: words.${l} — at least one example`)
      const what = c?.what?.[l]
      if (typeof what !== 'string' || !what.trim() || what.length > 256) problems.push(`${at}: what.${l} — 1–256 characters (a menu line)`)
    }
    if (!['main', 'any'].includes(c?.by)) problems.push(`${at}: by — main or any`)
    if (c?.by === 'main' && !c?.run) problems.push(`${at}: by main needs run — the command the main agent runs`)
  }
  if (!problems.length && !ids.has('commands')) problems.push('no entry «commands»: the person must always be able to ask for the list')
  return problems
}

const q = (w) => `«${w}»`
const examples = (c) => [...c.words.ru, ...c.words.en].map(q).join(', ')
// The part after «Word … — » of a line: the prompt names the examples before it.
const tail = (s) => String(s).replace(/^.*? — /, '')
const HEAD = '# Hard commands of the node (node step 597)'
const PURPOSE = 'Recognise them by the PURPOSE of a message, in any language and any words, with typos and autocorrect — the examples are not a word list (owner 2026-10-26: «анализ прямого совпадения это вариант который нельзя использовать»). The same word inside a story or a task is not a command; when the purpose is unclear, ask one short question.'

/**
 * The lines for a session's prompt. The main agent runs the node's commands; an element's agent knows the list, carries out its own
 * («turn off», «review», «commands») and passes the others to the main agent — only the main agent has the core's commands.
 */
function promptText(isMain, list = safeLoad()) {
  if (!list.length) return ''
  if (isMain) {
    return [
      HEAD,
      PURPOSE,
      ...list.map((c) => `- ${tail(c.what.en)} (${examples(c)}; menu /${c.slash})${c.run ? ` → ${c.run}` : ''}`),
      'A slash command from the bot\'s menu is the same as the words. Remember and remind — a thing and its words in one call, keeping told apart from a schedule or from the person\'s picture — skill use-deep-memory.',
      // 617: a voice note is the person's words — the model cannot hear sound, the core's transcription door can.
      'A voice note from the person is the same as their words: download it (download_attachment), then npm run transcribe -- <path>, and act on the text (a voice note to keep goes to npm run remember -- … --file <path> as it is).',
    ].join('\n')
  }
  const own = list.filter((c) => c.by === 'any' && c.id !== 'on')
  const others = list.filter((c) => c.by === 'main' || c.id === 'on')
  return [
    HEAD,
    PURPOSE,
    ...own.map((c) => `- ${tail(c.what.en)} (${examples(c)})`),
    `- ${others.map((c) => tail(c.what.en).split(';')[0]).join('; ')} — the node's main agent does these, not you: tell the person to send them to it (its Telegram bot or the core's terminal — npm run passport -- me, block node).`,
    'Asked for the commands, send the person this list, in their language:',
    ...list.map((c) => `  - ${c.what.en}`),
  ].join('\n')
}

const langOf = (lang) => (String(lang || 'en').split('-')[0].toLowerCase() === 'ru' ? 'ru' : 'en')

/** The list for a person: Russian or English (another language — English; the Telegram bridge translates it). */
function humanList(lang, list = safeLoad()) {
  const l = langOf(lang)
  const head = l === 'ru'
    ? 'Команды узла — скажите своими словами на любом языке или выберите в меню бота:'
    : 'Commands of the node — say it in your own words, in any language, or pick it in the bot\'s menu:'
  return [head, ...list.map((c) => `• ${c.what[l]}${c.menu === false ? '' : ` (/${c.slash})`}`)].join('\n')
}

/** The main agent's bot menu (setMyCommands): every command but those marked menu: false. */
function menu(lang, list = safeLoad()) {
  const l = langOf(lang)
  return list.filter((c) => c.menu !== false).map((c) => ({ command: c.slash, description: c.what[l] }))
}

/**
 * Put the menu into the chat of each admitted person: scope `chat` stands above the plugin's own menu, which it writes into
 * `all_private_chats` on every start (plugin 0.0.7, server.ts:1014; Bot API «Determining list of commands»). → [{ chat, ok, why }]
 */
async function applyMenu(token, chats, lang, list = safeLoad()) {
  const commands = menu(lang, list)
  const out = []
  for (const chat of chats ?? []) {
    try {
      const r = await fetch(`https://api.telegram.org/bot${token}/setMyCommands`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ commands, scope: { type: 'chat', chat_id: Number(chat) || chat } }),
        signal: AbortSignal.timeout(15_000),
      })
      const j = await r.json().catch(() => null)
      out.push({ chat: String(chat), ok: Boolean(j?.ok), why: j?.ok ? undefined : String(j?.description ?? `HTTP ${r.status}`) })
    } catch (e) {
      out.push({ chat: String(chat), ok: false, why: e instanceof Error ? e.message : String(e) })
    }
  }
  return out
}

/** «/remember text» or «/remember@bot text» of this list → { id, rest }; anything else → null. Telegram sends menu commands exactly. */
function slashOf(text, list = safeLoad()) {
  const m = /^\/([a-z0-9_]{1,32})(?:@\w+)?(?:\s+([\s\S]*))?$/i.exec(String(text ?? '').trim())
  if (!m) return null
  const c = list.find((x) => x.slash === m[1].toLowerCase())
  return c ? { id: c.id, rest: (m[2] ?? '').trim() } : null
}

const norm = (s) => String(s ?? '').toLowerCase().replace(/ё/g, 'е').replace(/[\s.!?…]+$/u, '').replace(/\s+/g, ' ').trim()

/**
 * A whole message that is only a command — its slash with nothing after it, or one of its example words alone → its id; otherwise null.
 * Only for code that runs with no model (a sleeping bot): a miss is harmless there, the message goes to the agent as any other.
 */
function bareOf(text, list = safeLoad()) {
  const slash = slashOf(text, list)
  if (slash) return slash.rest ? null : slash.id
  const said = norm(text)
  if (!said) return null
  const c = list.find((x) => [...x.words.ru, ...x.words.en].some((w) => norm(w) === said))
  return c ? c.id : null
}

module.exports = { FILE, load, safeLoad, check, promptText, humanList, menu, applyMenu, slashOf, bareOf, HEAD }
