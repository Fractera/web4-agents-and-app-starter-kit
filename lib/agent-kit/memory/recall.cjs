// ASSOCIATIONS (node step 595-8): before every message of the person the node looks in its diary for what was said about the same
// thing — words only, without a model and without the network — and gives the agent up to three findings with the date and who said
// it. The bridge gives it as a UserPromptSubmit hook to the main agent (the whole diary) and to build sessions (an element: only its
// own rows, isolation 548-6); a working-process session gets none. The rows of the current session are skipped: they are in context.
//   as a hook:  node recall.cjs <agent id>  < hook JSON (prompt, session_id)        to look:  npm run memory -- recall <id> "<words>"
// How a row is found: the words of the message lose stop words and endings (Snowball stemmer for Russian, written here; a light one
// for English), a word matches a word of the row by its stem or by a long common beginning (грузовик ~ грузовичок); rows are ranked by
// BM25 with weights — the person's words over the answers, names, numbers and ids over plain words, fresh over old. A row is given only
// when it covers the informative part of the message (a word the diary never saw counts at full weight against it) and matches two of
// its words, or a name, or the message has one word.
// 595-8б (the owner 2026-10-25: «Миша должен» / «Мише должны»; «любые другие языки могут работать с ещё более сильным отклонением»): the
// words above belong to Russian and English and miss forms, synonyms and other scripts. The hook searches BY MEANING first — vectors of
// the diary's lines (embed.cjs), any language — and falls back to the words only when the vectors cannot answer.
// The words go inside «», line breaks folded, a closing » doubled — a model reads them (the writer's construction).
const fs = require('fs')
const path = require('path')
const { EPISODES, memoryOn, fromUser } = require('./record.cjs')

const MAIN = 'build' // the main agent's service id, as in the bridge
const MONTHS = 12
const MAX_FINDINGS = 3
const MAX_TEXT = 1500
const SNIPPET = 380
const MIN_COVER = 0.35
const MAX_TERMS = 12
const WHO = { person: 1.3, agent: 1, node: 0.6 }
const K1 = 1.2
const B = 0.75

// ── Snowball Russian stemmer (snowballstem.org/algorithms/russian/stemmer.html) ──────────────────────────────────────────────────────
const VOWEL = 'аеиоуыэюя'
const isV = (c) => VOWEL.includes(c)
const list = (s, aya = false) => s.split(' ').map((e) => [e, aya])
const byLength = (...lists) => lists.flat().sort((a, b) => b[0].length - a[0].length)
const GERUND = byLength(list('в вши вшись', true), list('ив ивши ившись ыв ывши ывшись'))
const ADJECTIVE = byLength(list('ее ие ые ое ими ыми ей ий ый ой ем им ым ом его ого ему ому их ых ую юю ая яя ою ею'))
const PARTICIPLE = byLength(list('ем нн вш ющ щ', true), list('ивш ывш ующ'))
const REFLEXIVE = byLength(list('ся сь'))
const VERB = byLength(list('ла на ете йте ли й л ем н ло но ет ют ны ть ешь нно', true),
  list('ила ыла ена ейте уйте ите или ыли ей уй ил ыл им ым ен ило ыло ено ят ует уют ит ыт ены ить ыть ишь ую ю'))
const NOUN = byLength(list('а ев ов ие ье е иями ями ами еи ии и ией ей ой ий й иям ям ием ем ам ом о у ах иях ях ы ь ию ью ю ия ья я'))

// Snowball `among`: the longest ending inside RV decides; its condition failing means no ending of this class (no shorter retry).
function among(w, rv, endings) {
  for (const [e, aya] of endings) {
    if (w.length - e.length < rv || !w.endsWith(e)) continue
    if (!aya) return w.slice(0, -e.length)
    const i = w.length - e.length - 1
    return i >= rv && (w[i] === 'а' || w[i] === 'я') ? w.slice(0, -e.length) : null
  }
  return null
}

function stemRu(word) {
  const w0 = word
  const n = w0.length
  let c = 0
  const gopast = (test) => { while (c < n && !test(w0[c])) c++; if (c >= n) return false; c += 1; return true }
  let rv = n
  let r2 = n
  if (gopast(isV)) { rv = c; if (gopast((x) => !isV(x)) && gopast(isV) && gopast((x) => !isV(x))) r2 = c }
  let w = w0
  const g = among(w, rv, GERUND)
  if (g !== null) w = g
  else {
    const r = among(w, rv, REFLEXIVE)
    if (r !== null) w = r
    const a = among(w, rv, ADJECTIVE)
    if (a !== null) {
      w = a
      const p = among(w, rv, PARTICIPLE)
      if (p !== null) w = p
    } else {
      const v = among(w, rv, VERB)
      if (v !== null) w = v
      else {
        const s = among(w, rv, NOUN)
        if (s !== null) w = s
      }
    }
  }
  if (w.endsWith('и') && w.length - 1 >= rv) w = w.slice(0, -1)
  for (const e of ['ость', 'ост']) if (w.endsWith(e) && w.length - e.length >= r2) { w = w.slice(0, -e.length); break }
  if ((w.endsWith('ейше') || w.endsWith('ейш')) && w.length - (w.endsWith('ейше') ? 4 : 3) >= rv) {
    w = w.slice(0, w.endsWith('ейше') ? -4 : -3)
    if (w.endsWith('нн')) w = w.slice(0, -1)
  } else if (w.endsWith('нн') && w.length - 2 >= rv) w = w.slice(0, -1)
  else if (w.endsWith('ь') && w.length - 1 >= rv) w = w.slice(0, -1)
  return w
}

// A light English stemmer: inflections only (a long common beginning does the rest).
function stemEn(w) {
  if (w.length <= 3) return w
  if (w.endsWith('ies') && w.length > 4) return `${w.slice(0, -3)}y`
  if (w.endsWith('sses')) return w.slice(0, -2)
  if (/(s|x|z|ch|sh)es$/.test(w)) return w.slice(0, -2)
  if (w.endsWith('s') && !w.endsWith('ss') && !w.endsWith('us')) w = w.slice(0, -1)
  if (w.endsWith('ing') && w.length > 5) return w.slice(0, -3)
  if (w.endsWith('ed') && w.length > 4) return w.slice(0, -2)
  return w
}

// Function words and the words people use to point at the past («помнишь», «напомни», «что мы решили»): they say nothing about WHAT.
const STOP = new Set(`и в во не что он на я с со как а то все всё она так его но да ты к у же вы за бы по только ее её мне было вот от
меня еще ещё нет о из ему теперь когда даже ну вдруг ли если уже или ни быть был него до вас нибудь опять уж вам ведь там потом себя
ничего ей может они тут где есть надо ней для мы тебя их чем была сам чтоб без будто чего раз тоже себе под будет ж тогда кто этот того
потому этого какой совсем ним здесь этом один почти мой тем чтобы нее неё сейчас были куда зачем всех никогда можно при наконец два об
другой хоть после над больше тот через эти нас про всего них какая много разве три эту моя впрочем хорошо свою этой перед иногда лучше
чуть том нельзя такой им более всегда конечно всю между это эта этим этих тебе твой твоя твои твоё твое твоего твоей твою мои моё мое
моего моей мою нам вами ими кого кому ком чём каком какие каких какую каким какое такое такая такие такую такого также просто очень
вообще давай давайте скажи скажите пожалуйста слушай смотри кстати помнишь помните помню напомни напомните вспомни вспомнить
рассказывал рассказывала рассказать расскажи говорил говорила сказал сказала спрашивал спросил обсуждали обсуждать решили решил
новости новость дела дело вопрос хочу хотел хотела хотим хочешь хотеть мог могу можешь могли нужно нужен нужна буду будешь будем будут
наш наша наше наши ваш ваша ваше ваши свой своя свое своё свои нему нем нём ага угу ок окей ладно привет спасибо типа вроде именно
a an the and or but if then else when where what which who whom whose this that these those is are was were be been being have has
had do does did of in on at by for with about against between into through during before after above below to from up down out
off over under again further once here there all any both each few more most other some such no nor not only own same so than
too very can will just should now i me my we our you your he him his she her it its they them their how why would could please
hi hello thanks ok okay yes remember recall tell said say told news com www http https`.split(/\s+/).filter(Boolean))

const CYR = /[а-яё]/i
const LAT = /[a-z]/i

/** Words of a text with their stems; `strong` (names, numbers, ids, a Latin word in Russian text) is computed for a message only. */
function words(text, { strongCheck = false } = {}) {
  const src = String(text ?? '')
  const cyrText = strongCheck && CYR.test(src)
  const out = []
  const re = /[\p{L}\p{N}]+/gu
  let m
  while ((m = re.exec(src))) {
    const raw = m[0]
    const low = raw.toLowerCase().replace(/ё/g, 'е')
    if (low.length < 2 || STOP.has(low)) continue
    const stem = CYR.test(low) ? stemRu(low) : stemEn(low)
    if (stem.length < 3 && !/\d/.test(stem)) continue
    let strong = false
    if (strongCheck) {
      const before = src.slice(0, m.index).replace(/\s+$/, '')
      const sentenceStart = !before || /[.!?…:\n«"]$/.test(before)
      strong = /\d/.test(raw) || (cyrText && LAT.test(raw)) || (raw[0] !== raw[0].toLowerCase() && !sentenceStart)
    }
    out.push({ raw, low, stem, at: m.index, strong })
  }
  return out
}

/** Two stems (or two words) match: the same, or (both ≥ 5) a common beginning of ≥ 5 letters covering ≥ 80 % of the shorter. */
function matches(a, b) {
  if (a === b) return true
  const short = Math.min(a.length, b.length)
  if (short < 5) return false
  let i = 0
  while (i < short && a[i] === b[i]) i += 1
  return i >= 5 && i >= 0.8 * short
}

function readRows(file) {
  try {
    return fs.readFileSync(file, 'utf8').split('\n').filter(Boolean).map((l) => { try { return JSON.parse(l) } catch { return null } }).filter((r) => r && typeof r.text === 'string')
  } catch {
    return []
  }
}

function diary(files) {
  const all = files ?? (() => {
    try { return fs.readdirSync(EPISODES).filter((f) => /^\d{4}-\d{2}\.jsonl$/.test(f)).sort().reverse().slice(0, MONTHS).map((f) => path.join(EPISODES, f)) } catch { return [] }
  })()
  return all.flatMap(readRows)
}

const fold = (s) => String(s ?? '').replace(/\s+/g, ' ').trim()
const quote = (s) => `«${s.replace(/»/g, '»»')}»`
const when = (t) => `${String(t).slice(0, 10)} ${String(t).slice(11, 16)} UTC`

function snippet(text, at) {
  const flat = String(text)
  let from = Math.max(0, at - 120)
  let to = Math.min(flat.length, from + SNIPPET)
  from = Math.max(0, to - SNIPPET)
  let s = fold(flat.slice(from, to))
  if (from > 0) s = `…${s.replace(/^\S*\s/, '')}`
  if (to < flat.length) s = `${s.replace(/\s\S*$/, '')}…`
  return s
}

/**
 * Findings for a message: [{ row, score, cover, at }] best first, at most three, one per exchange. `rows` defaults to the diary;
 * `agent` scopes it (the main agent — everything; an element — its own rows); `sessionId` is skipped.
 */
function findings(message, agent, { sessionId = null, rows = null, now = Date.now() } = {}) {
  const query = words(message, { strongCheck: true })
  const terms = []
  for (const q of query) {
    const had = terms.find((t) => t.stem === q.stem)
    if (had) had.strong = had.strong || q.strong
    else terms.push({ stem: q.stem, low: q.low, strong: q.strong })
  }
  if (!terms.length) return []
  const scope = (rows ?? diary()).filter((r) => (agent === MAIN || r.agent === agent) && (!sessionId || r.session !== sessionId))
  if (!scope.length) return []
  const N = scope.length
  const avgChars = scope.reduce((s, r) => s + r.text.length, 0) / N || 1
  const lower = scope.map((r) => r.text.toLowerCase().replace(/ё/g, 'е'))
  // Candidates: a row holds the first letters of a term — every real match does (a match shares ≥ 5 first letters or the whole stem).
  // ✗ Snowball cuts a nominative short («диван» → «дива», «дивану» → «диван»): words are compared too, the key is their common start.
  const head = (t) => { let i = 0; while (i < t.stem.length && t.stem[i] === t.low[i]) i += 1; return t.low.slice(0, Math.min(5, Math.max(i, 1))) }
  const keys = terms.map(head)
  const hits = new Map() // row index → Map(term index → { tf, at })
  for (let i = 0; i < N; i += 1) {
    if (!keys.some((k) => lower[i].includes(k))) continue
    const own = words(scope[i].text)
    const got = new Map()
    terms.forEach((t, ti) => {
      let tf = 0
      let at = -1
      // ✗ First run of the check set (595-8): «Токио» and «токены» both stem to «ток». A stem under 4 letters says too little — such
      // words match only as words.
      for (const w of own) if ((t.stem.length >= 4 && matches(t.stem, w.stem)) || matches(t.low, w.low)) { tf += 1; if (at < 0) at = w.at }
      if (tf) got.set(ti, { tf, at })
    })
    if (got.size) hits.set(i, got)
  }
  const df = terms.map((_, ti) => [...hits.values()].filter((g) => g.has(ti)).length)
  const idf = df.map((d) => Math.log(1 + (N - d + 0.5) / (d + 0.5)))
  // The informative part of the message: the rarest words first; a long message keeps its twelve most informative words.
  const order = terms.map((t, ti) => ti).sort((a, b) => idf[b] * (terms[b].strong ? 2 : 1) - idf[a] * (terms[a].strong ? 2 : 1)).slice(0, MAX_TERMS)
  const mass = (ti) => idf[ti] * (terms[ti].strong ? 2 : 1)
  const total = order.reduce((s, ti) => s + mass(ti), 0)
  const scored = []
  for (const [i, got] of hits) {
    const used = order.filter((ti) => got.has(ti))
    if (!used.length) continue
    const cover = used.reduce((s, ti) => s + mass(ti), 0) / total
    const strongHit = used.some((ti) => terms[ti].strong)
    if (cover < MIN_COVER || !(used.length >= 2 || strongHit || order.length === 1)) continue
    const r = scope[i]
    const norm = 1 - B + (B * r.text.length) / avgChars
    let score = 0
    for (const ti of used) { const { tf } = got.get(ti); score += mass(ti) * ((tf * (K1 + 1)) / (tf + K1 * norm)) }
    const age = Math.max(0, (now - Date.parse(r.t)) / 86_400_000) || 0
    score *= (WHO[r.who] ?? 1) * (0.75 + 0.25 * Math.exp(-age / 30))
    scored.push({ i, row: r, score, cover, at: Math.min(...used.map((ti) => got.get(ti).at)) })
  }
  // One finding per exchange: a turn of the person (or of the node) with the answers after it, in one session.
  // Sessions of different agents interleave in the diary — the turn that opened an exchange is kept per session.
  const exchange = new Map()
  const open = new Map()
  scope.forEach((r, i) => {
    if (r.who !== 'agent' || !open.has(r.session)) open.set(r.session, i)
    exchange.set(i, `${r.session}:${open.get(r.session)}`)
  })
  const best = new Map()
  for (const s of scored.sort((a, b) => b.score - a.score)) if (!best.has(exchange.get(s.i))) best.set(exchange.get(s.i), s)
  return [...best.values()].slice(0, MAX_FINDINGS)
}

/** The person's words of a message, or null (a node's task, a command, a system insertion) — the diary's own rules (`fromUser`). */
function personWords(prompt) {
  const said = fromUser({ message: { content: String(prompt ?? '') } }, false)[0]
  return !said || said.who !== 'person' || /^\s*</.test(said.text) ? null : said.text
}

const HEADER = {
  words: "From the node's memory, about what this message mentions (found by words; true then — check it if it matters):",
  meaning: "From the node's memory, about what this message means (found by meaning; true then — check it if it matters):",
}

function format(found, agent, how) {
  if (!found.length) return ''
  const lines = [HEADER[how]]
  let size = lines[0].length
  for (const f of found) {
    const r = f.row
    const whose = r.agent === agent ? '' : `agent ${r.agent} · `
    const who = r.who === 'person' ? `the person${r.user ? ` (@${r.user})` : ''}` : r.who === 'node' ? 'the node' : r.agent === agent ? 'you' : 'its agent'
    const line = `- ${when(r.t)} · ${whose}${who}${r.via ? `, ${r.via}` : ''}: ${quote(snippet(r.text, f.at))}`
    if (size + line.length + 1 > MAX_TEXT) break
    lines.push(line)
    size += line.length + 1
  }
  return lines.length > 1 ? lines.join('\n') : ''
}

/** The hook's text found by words, or '' (not the person's words, nothing found, memory switched off). The fallback of `recallBest`. */
function recall(prompt, agent, { sessionId = null, rows = null } = {}) {
  if (!agent || !memoryOn()) return ''
  const said = personWords(prompt)
  return said ? format(findings(said, agent, { sessionId, rows }), agent, 'words') : ''
}

// 595-8б: a vector's cosine at or above this is «about the same thing». Calibrated on the 595-8 check sets (live diary, before the
// multilingual set was run): expected rows scored 0.451–0.692, the unrelated questions' best rows 0.162–0.348 — the middle of the gap.
// Never tuned on the set it is proven on (completed-steps/595-8b.md).
const MIN_SCORE = 0.4

/**
 * By meaning first (vectors, any language): the nearest lines of the agent's scope above MIN_SCORE, one per exchange, at most three. The
 * vector path failing (no key, no network, no vector element, too slow) falls back to words, and the header says which path found it.
 * Returns { text, how } — how: meaning · words · off · none.
 */
async function recallBest(prompt, agent, { sessionId = null, rows = null, ms = 4000 } = {}) {
  if (!agent || !memoryOn()) return { text: '', how: 'off' }
  const said = personWords(prompt)
  if (!said) return { text: '', how: 'none' }
  const all = rows ?? diary()
  const scope = all.filter((r) => (agent === MAIN || r.agent === agent) && (!sessionId || r.session !== sessionId))
  try {
    const embed = require('./embed.cjs')
    // Only collections that hold a vector are asked: an agent with nothing stored costs no call to OpenAI (✗ measured 595-8б: an element
    // with an empty collection still waited ≈1.5 s for the question's vector).
    const stored = new Set(Object.values(embed.ledger().ids))
    const agents = (agent === MAIN ? [...new Set(all.filter((r) => r.who !== 'node').map((r) => r.agent))] : [agent]).filter((a) => stored.has(a))
    // Nothing stored for this scope (no key yet, vectors not added) — the meaning search cannot answer, so the words do.
    if (!agents.length) throw new Error('no vectors stored for this agent yet')
    const byId = new Map(scope.map((r, i) => [embed.rowId(r), i]))
    const hits = (await embed.search(said, agents, { k: 10, ms })).filter((h) => h.score >= MIN_SCORE && byId.has(h.id))
    const open = new Map()
    const exchange = scope.map((r, i) => { if (r.who !== 'agent' || !open.has(r.session)) open.set(r.session, i); return `${r.session}:${open.get(r.session)}` })
    const seen = new Set()
    const found = []
    for (const h of hits) {
      const i = byId.get(h.id)
      if (seen.has(exchange[i])) continue
      seen.add(exchange[i])
      found.push({ row: scope[i], at: 0, score: h.score })
      if (found.length === MAX_FINDINGS) break
    }
    return { text: format(found, agent, 'meaning'), how: 'meaning', found }
  } catch (err) {
    return { text: format(findings(said, agent, { sessionId, rows: all }), agent, 'words'), how: 'words', why: err instanceof Error ? err.message : String(err) }
  }
}

module.exports = { recall, recallBest, findings, stemRu, stemEn, words, matches, personWords, MAIN, MIN_SCORE }

if (require.main === module) {
  const agent = process.argv[2] || ''
  let raw = ''
  let done = false
  const run = async () => {
    if (done) return
    done = true
    let text = ''
    try {
      const input = JSON.parse(raw || '{}')
      text = (await recallBest(input.prompt, agent, { sessionId: input.session_id || null })).text
    } catch { /* memory never stops a message */ }
    if (!text) process.exit(0)
    process.stdout.write(JSON.stringify({ hookSpecificOutput: { hookEventName: 'UserPromptSubmit', additionalContext: text } }), () => process.exit(0))
  }
  process.stdin.setEncoding('utf8')
  process.stdin.on('data', (c) => { raw += c })
  process.stdin.on('end', run)
  process.stdin.on('error', run)
  setTimeout(run, 2000)
}
