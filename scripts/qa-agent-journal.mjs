// ПРИБОР ПРОВЕРКИ АГЕНТА БЕЗ МОДЕЛИ (узел, шаг 548-12): `npm run qa:agent -- <служба> [--session <id>] [--all]`.
//
// Слово владельца 2026-10-19: «Должен задать вопросы и измерить какой контекст они расходуют для ответа на эти вопросы …
// быстрыми компактными с минимальной достаточным расходом токенов при помощи необходимых навыков, с гарантией того что при
// вопросах про строительство навыки про рабочие процесс не вызываются».
// Вопрос агенту задаёт человек (Telegram, терминал) — прибор только читает уже записанный журнал сессии Claude Code
// (`~/.claude/projects/<папка>/<сессия>.jsonl`, закон проекта «проверять дёшево — чтением снятых журналов»):
//   что загрузилось на старте — инструкции (CLAUDE.md ядра — УТЕЧКА), список навыков и навыки без описания (бюджет списка);
//   сколько стоил каждый запрос — новые токены, прочитанные из кэша, выход; итог по каждому вопросу человека;
//   какие навыки вызваны и какой у них процесс (Builder / Work / Both — по описанию навыка в папке агента);
//   какие пути вне своей папки назвали инструменты агента.
// Служба: id элемента (`pjq5v`), его адрес (`template`) или `build` — главный агент (корень ядра с шага 610; до него — `data/main-agent`).

import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'

const ROOT = process.cwd()
const readJson = (p, d = null) => { try { return JSON.parse(readFileSync(p, 'utf8')) } catch { return d } }
const [service, ...rest] = process.argv.slice(2)
if (!service) { console.log('usage: npm run qa:agent -- <element id | address | build> [--session <id>] [--all]'); process.exit(1) }
const flag = (n) => { const i = rest.indexOf(n); return i >= 0 ? rest[i + 1] : null }

// Папка агента — как её выбирает узел (`_agent-kit/server/workspace.cjs`).
function folderOf(s) {
  if (s === 'build') return ROOT
  const reg = readJson(join(ROOT, 'WEB4-ITEMS-REGISTRY', 'web4-items.json'), { services: [] }).services ?? []
  const entry = reg.find((e) => e.id === s) ?? reg.find((e) => readJson(join(ROOT, 'data', 'services', e.id, 'address.json'), {})?.address === s)
  if (!entry) return null
  const base = join(ROOT, 'WEB4-ITEMS', entry.kind === 'user' ? 'user' : 'core')
  const address = readJson(join(ROOT, 'data', 'services', entry.id, 'address.json'), {})?.address
  for (const n of [address, entry.id].filter(Boolean)) if (existsSync(join(base, n))) return join(base, n)
  return null
}
const folder = folderOf(service)
if (!folder) { console.log(`===QA_AGENT_FAIL=== no folder for «${service}»`); process.exit(1) }
const mangled = folder.replace(/[:\\/]/g, '-')
const dir = join(homedir(), '.claude', 'projects', mangled)
if (!existsSync(dir)) { console.log(`===QA_AGENT_FAIL=== no journals in ${dir}`); process.exit(1) }
const sessions = readdirSync(dir).filter((f) => f.endsWith('.jsonl')).map((f) => ({ f, t: statSync(join(dir, f)).mtimeMs })).sort((a, b) => b.t - a.t)
const pick = flag('--session') ? sessions.find((s) => s.f.startsWith(flag('--session'))) : sessions[0]
if (!pick) { console.log('===QA_AGENT_FAIL=== session not found'); process.exit(1) }
const rows = readFileSync(join(dir, pick.f), 'utf8').split('\n').filter(Boolean).map((l) => { try { return JSON.parse(l) } catch { return null } }).filter(Boolean)

// Природа своих навыков агента — по началу описания.
const natureOf = (() => {
  const out = {}
  const base = join(folder, '.claude', 'skills')
  if (!existsSync(base)) return out
  const nature = (dir) => {
    let t = ''
    try { t = readFileSync(join(dir, 'SKILL.md'), 'utf8') } catch { return null }
    const desc = (t.match(/^description:\s*>?\s*\n?\s*(.*)$/m)?.[1] ?? '').trim()
    return /^Builder skill/i.test(desc) ? 'build' : /^Work(ing)? (skill|process)/i.test(desc) ? 'work' : /^Both natures/i.test(desc) ? 'both' : existsSync(join(dir, 'SOURCE.md')) ? 'vendor' : /^Build process/i.test(desc) ? 'build' : '?'
  }
  for (const d of readdirSync(base, { withFileTypes: true })) {
    if (!d.isDirectory()) continue
    // Группа-плагин (552-2): в списке навык стоит как `<группа>:<навык>`, агент зовёт его и полным, и коротким именем.
    if (existsSync(join(base, d.name, '.claude-plugin', 'plugin.json'))) {
      const inner = join(base, d.name, 'skills')
      for (const s of existsSync(inner) ? readdirSync(inner, { withFileTypes: true }) : []) {
        const n = s.isDirectory() ? nature(join(inner, s.name)) : null
        if (n) { out[s.name] = n; out[`${d.name}:${s.name}`] = n }
      }
      continue
    }
    const n = nature(join(base, d.name))
    if (n) out[d.name] = n
  }
  return out
})()

console.log(`===QA_AGENT=== ${service} · folder ${folder}`)
console.log(`session ${pick.f.replace('.jsonl', '')} · last write ${new Date(pick.t).toISOString()} · ${sessions.length} session(s) in the folder`)

const ins = rows.find((r) => r.attachment?.type === 'instructions')?.attachment
const nodeMd = join(ROOT, 'CLAUDE.md').toLowerCase()
for (const f of ins?.files ?? []) {
  const leak = String(f.path).toLowerCase() === nodeMd
  console.log(`instruction: ${f.path} — ${(f.content ?? '').length} chars${leak ? '  ← LEAK: the node instruction' : ''}`)
}
const sk = rows.find((r) => r.attachment?.type === 'skill_listing')?.attachment
if (sk) {
  const entries = String(sk.content).split('\n').filter((l) => /^- [^ ]+:/.test(l)).map((l) => l.slice(2, l.indexOf(': ') > 0 ? l.indexOf(': ') : undefined))
  const described = new Set(entries)
  const names = sk.names ?? []
  const own = names.filter((n) => natureOf[n])
  const foreign = names.filter((n) => !natureOf[n])
  const bare = own.filter((n) => !described.has(n) && natureOf[n] !== 'vendor')
  console.log(`skill listing: ${names.length} names, ${String(sk.content).length} chars · own ${own.length}, foreign ${foreign.length}${foreign.length ? ` (${foreign.join(', ')})` : ''}`)
  console.log(`own skills without description (budget overflow): ${bare.length ? bare.join(', ') : 'none'}`)
}

// Запросы: один `message.id` — один запрос модели; по вопросам человека.
const seen = new Set()
const turns = []
let cur = null
const skills = []
const outside = new Set()
const norm = (p) => String(p).replace(/\\/g, '/').toLowerCase()
const own = norm(folder)
const homeN = norm(homedir())
for (const r of rows) {
  // Новый вопрос человека: его текст в терминале (запись без isMeta) или сообщение канала Telegram (isMeta, `<channel …>`).
  if (r.type === 'user') {
    const c = r.message?.content
    const results = Array.isArray(c) && c.some((x) => x.type === 'tool_result')
    const txt = typeof c === 'string' ? c : Array.isArray(c) ? c.filter((x) => x.type === 'text').map((x) => x.text).join(' ') : ''
    const channel = txt.includes('<channel source=') && !txt.startsWith('Base directory for this skill')
    if (!results && txt.trim() && (channel || !r.isMeta)) {
      cur = { at: r.timestamp?.slice(11, 19), said: (channel ? 'Telegram: ' : '') + txt.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 140), req: 0, neu: 0, cached: 0, out: 0, first: null }
      turns.push(cur)
    }
  }
  if (r.type === 'assistant' && r.message) {
    const m = r.message
    if (!seen.has(m.id)) {
      seen.add(m.id)
      const u = m.usage ?? {}
      if (!cur) { cur = { at: r.timestamp?.slice(11, 19), said: '(start)', req: 0, neu: 0, cached: 0, out: 0, first: null }; turns.push(cur) }
      const neu = (u.cache_creation_input_tokens ?? 0) + (u.input_tokens ?? 0)
      cur.req++; cur.neu += neu; cur.cached += u.cache_read_input_tokens ?? 0; cur.out += u.output_tokens ?? 0
      if (!cur.first) cur.first = neu + (u.cache_read_input_tokens ?? 0)
    }
    for (const b of m.content ?? []) {
      if (b.type !== 'tool_use') continue
      const i = b.input ?? {}
      if (b.name === 'Skill') skills.push(`${i.skill} (${natureOf[i.skill] ?? 'foreign'})`)
      for (const t of [i.file_path, i.path, i.command, i.pattern].filter(Boolean)) {
        for (const p of String(t).matchAll(/([a-zA-Z]:[\\/][^\s"'`|&;<>()]*|\/[a-zA-Z]\/[^\s"'`|&;<>()]*)/g)) {
          const n = norm(p[1]).replace(/^\/([a-z])\//, '$1:/')
          if (n.startsWith(homeN) && !n.startsWith(own) && !n.includes('/appdata/local/temp') && !n.includes('/.claude/') && !n.includes('/data/services/')) outside.add(p[1])
        }
      }
    }
  }
}
let first = null
for (const t of turns) {
  if (first === null && t.first) first = t.first
  console.log(`turn ${t.at} «${t.said}» — ${t.req} requests · new ${t.neu} · from cache ${t.cached} · out ${t.out}`)
}
const sum = turns.reduce((a, t) => ({ req: a.req + t.req, neu: a.neu + t.neu, cached: a.cached + t.cached, out: a.out + t.out }), { req: 0, neu: 0, cached: 0, out: 0 })
console.log(`first request: ${first ?? '—'} input tokens · total: ${sum.req} requests, new ${sum.neu}, from cache ${sum.cached}, out ${sum.out}`)
console.log(`skills invoked: ${skills.length ? skills.join(', ') : 'none'}${skills.some((s) => s.endsWith('(work)')) ? '  ← a WORK skill was invoked' : ''}`)
console.log(`paths outside the folder named by tools: ${outside.size ? [...outside].slice(0, 10).join(', ') : 'none'}`)
