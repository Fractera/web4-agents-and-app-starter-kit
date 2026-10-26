// ПЕРЕВОД ТЕКСТОВ TELEGRAM НА ЯЗЫК ЧЕЛОВЕКА (шаг 411-2; владелец 2026-10-06: «в своем чате я вижу на своем языке»).
//
// Встроены en и ru. Для любого другого языка английские шаблоны переводятся ОДИН раз ключом OpenAI ядра (тот же порядок, что
// `lib/env-file.ts` → `openAiKeyFor`: окружение процесса, затем `.env.local` ядра) и кладутся в `data/i18n-cache/telegram-<lang>.json`.
// Нет ключа или перевод не прошёл — английский (и в следующий раз попытка снова). Модель — `gpt-5-mini`: её имя сверено с живым
// списком ключа (roman `app/api/i18n/translate/route.ts`, 2026-08-11).

const { existsSync, mkdirSync, readFileSync, writeFileSync } = require('node:fs')
const { createHash } = require('node:crypto')
const path = require('node:path')

const ROOT = process.cwd()
const MODEL = 'gpt-5-mini'
const API = 'https://api.openai.com/v1/chat/completions'

function coreKey() {
  if (process.env.OPENAI_API_KEY) return process.env.OPENAI_API_KEY
  try {
    const line = readFileSync(path.join(ROOT, '.env.local'), 'utf8').split(/\r?\n/).find((l) => l.startsWith('OPENAI_API_KEY='))
    return line ? line.slice('OPENAI_API_KEY='.length).trim().replace(/^["']|["']$/g, '') : ''
  } catch {
    return ''
  }
}

/** Перевести значения объекта `{ ключ: текст }` на язык `lang`; `null` — не вышло. Метки `{1}`, `{2}`… сохраняются. */
async function translateMap(map, lang) {
  const key = coreKey()
  if (!key) return null
  try {
    const res = await fetch(API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model: MODEL,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: `Translate every value of the JSON object into the language with BCP 47 code «${lang}». Keep the keys. Keep placeholders like {1}, {2}, {3} exactly and keep line breaks. Keep the «» marks but translate the words inside them too (they are words the person types back, so they must be in the target language), except placeholders. Natural, short, friendly; it is a Telegram bot speaking to its owner. Return only the JSON object.` },
          { role: 'user', content: JSON.stringify(map) },
        ],
      }),
      signal: AbortSignal.timeout(60_000),
    })
    if (!res.ok) return null
    const body = await res.json()
    const out = JSON.parse(body.choices?.[0]?.message?.content ?? 'null')
    if (!out || typeof out !== 'object') return null
    for (const k of Object.keys(map)) {
      const marks = map[k].match(/\{\d\}/g) ?? []
      if (typeof out[k] !== 'string' || !marks.every((m) => out[k].includes(m))) return null
    }
    return out
  } catch {
    return null
  }
}


const cacheFile = (name, lang) => path.join(ROOT, 'data', 'i18n-cache', `${name}-${lang}.json`)

/**
 * Таблица текстов на языке `lang` из английской `en` (значения — строки или функции с позиционными аргументами). Функции
 * переводятся шаблоном: вызываются с метками `{1}`, `{2}`…, перевод превращается обратно в функцию.
 */
async function tableFor(name, en, lang) {
  const file = cacheFile(name, lang)
  const src = {}
  for (const [k, v] of Object.entries(en)) src[k] = typeof v === 'function' ? v('{1}', '{2}', '{3}') : v
  // 597-4: the cache remembers WHICH English it translated — a changed text is translated again (✗ before, the old translation was
  // served forever: the cache knew only the table's name and the language).
  const source = createHash('sha1').update(JSON.stringify(src)).digest('hex').slice(0, 12)
  let tpl = null
  if (existsSync(file)) {
    try { tpl = JSON.parse(readFileSync(file, 'utf8')) } catch { tpl = null }
  }
  if (tpl && tpl._source !== source) tpl = null
  if (!tpl) {
    tpl = await translateMap(src, lang)
    if (!tpl) return en
    tpl._source = source
    mkdirSync(path.dirname(file), { recursive: true })
    writeFileSync(file, JSON.stringify(tpl, null, 2))
  }
  const out = {}
  for (const [k, v] of Object.entries(en)) {
    const t = typeof tpl[k] === 'string' ? tpl[k] : null
    if (!t) { out[k] = v; continue }
    out[k] = typeof v === 'function' ? (...args) => t.replace(/\{(\d)\}/g, (m, i) => (args[i - 1] ?? m)) : t
  }
  return out
}

module.exports = { tableFor, coreKey }
