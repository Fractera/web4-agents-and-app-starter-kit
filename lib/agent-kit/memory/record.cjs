// THE NODE'S DIARY (node step 595-6): everything the person said and every answer of the node's agents, copied from Claude Code's
// session log without a model — the owner's law for memory, 2026-09-16: «если архитектор тебе сказал сделать запись, ты не должен
// думать, к чему она относится» — nothing is filtered by meaning. Claude Code deletes old session logs (cleanupPeriodDays); this copy
// stays in data/node/memory/episodes/<YYYY-MM>.jsonl, outside git.
//   as a hook (Stop and SessionEnd, given by the bridge to the main agent and to build sessions):  node record.cjs <agent id>  < hook JSON
//   from code: recordSession(<session log>, <agent id>)  — `npm run memory -- backfill` copies past sessions the same way.
// Words only: tool calls, tool results, files and system insertions are not the conversation. A session log is read from where the
// last run stopped (data/node/memory/episodes/.read.json), so a run never writes a line twice; a hook never blocks the session.
const fs = require('fs')
const path = require('path')

const ROOT = path.join(__dirname, '..', '..', '..')
const DIR = path.join(ROOT, 'data', 'node', 'memory')
const EPISODES = path.join(DIR, 'episodes')
const READ = path.join(EPISODES, '.read.json')
const SETTINGS = path.join(DIR, 'settings.json')
const MAX = 8000

const readJson = (file, fallback) => {
  try { return JSON.parse(fs.readFileSync(file, 'utf8').replace(/^﻿/, '')) } catch { return fallback }
}
/** The person's switch («не запоминай», step 595-9): off — nothing is written. No file — on. */
const memoryOn = () => readJson(SETTINGS, {}).on !== false

// A Telegram message inside a session: <channel source="plugin:telegram:telegram" chat_id=… user=… ts=…>text</channel>.
const CHANNEL = /^<channel source="([^"]*)"([^>]*)>\n?([\s\S]*?)\n?<\/channel>\s*$/
// A Telegram message that came while the agent was off: the core wakes it with this text (telegram.cjs, «пока ты был выключен»).
const OFFLINE = /Сообщение из Telegram от (.+?) \(chat_id \d+\), пока ты был выключен: ([\s\S]*?) — ответь ему в Telegram инструментом reply/
// A task of the node opens with the word of its process (node step 552); slash commands and their output are not words.
const NODE_TASK = /^\s*(Build process|Working process|Messenger)\b/
const COMMAND = /^<(command-name|command-message|local-command-stdout|local-command-caveat)>/
const attr = (s, name) => (s.match(new RegExp(`${name}="([^"]*)"`)) || [])[1]

// The node's own texts typed into a live session (supervision, an element's question, a capability request).
const NODE_TEXT = /^\s*(Узел:|Node:|Element \S+ (asks|needs|finished)|Элемент \S+ )/

// `first` — the first typed message of a session: the bridge's launch prompt, so it is the node's text, unless it wraps a Telegram
// message that came while the agent was off (measured on the main agent's 34 sessions, 2026-10-25).
function fromUser(o, first) {
  const content = o.message && o.message.content
  if (typeof content !== 'string') return []
  const text = content.trim()
  if (!text) return []
  const ch = text.match(CHANNEL)
  if (ch) return [{ who: 'person', via: /telegram/.test(ch[1]) ? 'telegram' : ch[1], user: attr(ch[2], 'user'), text: ch[3].trim() }]
  if (o.isMeta || COMMAND.test(text)) return []
  const off = text.match(OFFLINE)
  if (off) return [{ who: 'person', via: 'telegram', user: off[1], text: off[2].trim() }]
  if (first || NODE_TASK.test(text) || NODE_TEXT.test(text)) return [{ who: 'node', via: 'core', text }]
  return [{ who: 'person', via: 'terminal', text }]
}

function fromAssistant(o) {
  const content = (o.message && o.message.content) || []
  if (!Array.isArray(content)) return []
  const out = []
  const said = content.filter((c) => c.type === 'text' && c.text && c.text.trim()).map((c) => c.text.trim()).join('\n\n')
  if (said) out.push({ who: 'agent', via: 'terminal', text: said })
  for (const c of content) {
    if (c.type === 'tool_use' && /__reply$/.test(c.name || '') && c.input && typeof c.input.text === 'string') out.push({ who: 'agent', via: 'telegram', text: c.input.text.trim() })
  }
  return out
}

/** Copies the new words of one session log into the diary; returns how many lines were written. */
function recordSession(file, agent, { sessionId } = {}) {
  if (!file || !fs.existsSync(file)) return 0
  // 595-9: memory switched off («не запоминай») — the words of this time are read past and never written: the mark still moves, so
  // turning memory on again does not bring them back (✗ the first version returned before reading, and «on» would have copied them).
  const off = !memoryOn()
  const key = sessionId || path.basename(file, '.jsonl')
  fs.mkdirSync(EPISODES, { recursive: true })
  const state = readJson(READ, {})
  const seen = typeof state[key] === 'object' && state[key] ? state[key] : { o: 0, f: false, skip: false }
  if (seen.skip) return 0
  const buf = fs.readFileSync(file)
  const from = Math.min(seen.o || 0, buf.length)
  const last = buf.lastIndexOf(0x0a)
  if (last < from) return 0
  const fresh = buf.subarray(from, last + 1).toString('utf8')
  let written = 0
  for (const line of fresh.split('\n')) {
    if (!line.trim()) continue
    let o
    try { o = JSON.parse(line) } catch { continue }
    // `claude -p` (entrypoint sdk-cli) is a check or automation, never a conversation with the person: the whole session is skipped.
    if (o.entrypoint === 'sdk-cli') { seen.skip = true; break }
    let rows = []
    if (o.type === 'user') {
      const typed = typeof o.message?.content === 'string' && !o.isMeta && !COMMAND.test(o.message.content.trim())
      rows = fromUser(o, typed && !seen.f)
      if (typed) seen.f = true
    } else if (o.type === 'assistant') rows = fromAssistant(o)
    if (off) continue
    for (const r of rows) {
      const t = o.timestamp || new Date().toISOString()
      const row = { t, agent, session: key, who: r.who, via: r.via, ...(r.user ? { user: r.user } : {}), text: r.text.slice(0, MAX) }
      fs.appendFileSync(path.join(EPISODES, `${t.slice(0, 7)}.jsonl`), `${JSON.stringify(row)}\n`)
      written += 1
    }
  }
  seen.o = last + 1
  state[key] = seen
  fs.writeFileSync(READ, JSON.stringify(state))
  return written
}

// 595-8: the associations hook (recall.cjs) classifies a message by the same rules — only the person's words are looked up.
module.exports = { recordSession, memoryOn, fromUser, EPISODES, DIR, SETTINGS }

if (require.main === module) {
  const agent = process.argv[2] || 'unknown'
  let raw = ''
  process.stdin.setEncoding('utf8')
  process.stdin.on('data', (c) => { raw += c })
  process.stdin.on('end', () => {
    try {
      const input = JSON.parse(raw || '{}')
      recordSession(input.transcript_path, agent, { sessionId: input.session_id })
    } catch { /* a diary never stops the session */ }
    process.exit(0)
  })
}
