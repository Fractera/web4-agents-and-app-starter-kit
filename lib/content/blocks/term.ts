// ПОДСКАЗКА К СЛОВУ СЛОВАРЯ ВНУТРИ ТЕКСТА (шаг 599-1).
//
// Владелец 2026-10-26: «добавить тултип и подсветить подсказки элемент, узел и так далее, все что у нас есть в глоссари … так как эта
// страница первого контакта и при это много новых слов».
//
// 🔒 ДВЕ ЗАПИСИ ОДНОГО ЗНАНИЯ, У КАЖДОЙ СВОЁ МЕСТО.
// • МЕТКА `[[форма|ключ]]` — в словаре страницы: слово в нужном падеже и ключ записи ликбеза. Определения в метке нет: у него один
//   источник, сам ликбез. Страница раскрывает метки функцией `resolveTermLabels`, а сторож `check-term-hints` роняет сборку на ключе,
//   которого в ликбезе нет, — иначе подсказка молча превратилась бы в простое слово.
// • ЗНАК `{{форма|слово|определение}}` — то, что получает разбор строки (`inline.tsx`): выделенное слово и подсказка. Знак работает в
//   любом блоке; машинная копия страницы, поиск по таблице и структурированные данные получают из него только форму (`termPlain`).
//
// 🛑 Внутри знака нет `{`, `}` и `|` — это границы его частей; определение с ними порвало бы знак. Сторож проверяет ликбез на эти знаки.

/** Слово ликбеза для подсказки: как оно пишется и что значит. */
export type TermDefinition = { word: string; text: string }

const LABEL = /\[\[([^[\]|]+)\|([a-z0-9-]+)\]\]/g
const TOKEN = /\{\{([^{}|]+)\|([^{}|]+)\|([^{}|]+)\}\}/g

/** Источник выражения знака: разбор строки ставит его третьим видом после жирного и ссылки. */
export const TERM_TOKEN_SOURCE = TOKEN.source

export function termToken(form: string, def: TermDefinition): string {
  return `{{${form}|${def.word}|${def.text}}}`
}

/** Метки → знаки с определением из ликбеза. Незнакомый ключ оставляет форму: сборку раньше уронит сторож. */
export function resolveTermLabels(text: string, terms: Record<string, TermDefinition>): string {
  return text.replace(LABEL, (_, form: string, key: string) => (terms[key] ? termToken(form, terms[key]) : form))
}

/** Метки → форма. Определение внутри подсказки подсказок не несёт. */
export function labelsToForms(text: string): string {
  return text.replace(LABEL, '$1')
}

/** Знаки → форма: для машинной копии страницы, поиска и структурированных данных. */
export function termPlain(text: string): string {
  return text.replace(TOKEN, '$1')
}

/** Ключи всех меток строки — для сторожа. */
export function termLabelKeys(text: string): string[] {
  return [...text.matchAll(LABEL)].map((m) => m[2])
}

// 600-5: куски строки, внутри которых слово не размечается — готовая метка, знак, жирный (разбор строки не видит знак внутри
// `**…**`) и ссылка `[подпись](адрес)`.
const PROTECTED = /\[\[[^\]]*\]\]|\{\{[^{}]*\}\}|\*\*[^*]+\*\*|\[[^\]]+\]\([^)]+\)/g
const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/**
 * Каждое вхождение слова ликбеза → метка `[[форма|ключ]]` (шаг 600-5: «каждый раз когда встречается слова из этого глоссария
 * подсвечивай их»). `forms` — ключ записи ликбеза → формы слова. Длинная форма побеждает короткую («нативный элемент» раньше
 * «элемента»); граница слова — буква или цифра Юникода, поэтому «элементарно» и «узелок» не задеваются. Готовые метки, знаки, жирный
 * и ссылки не трогаются. Регистр формы в тексте сохраняется.
 */
export function labelGlossaryWords(text: string, forms: Record<string, string[]>): string {
  const byForm = new Map<string, string>()
  for (const [key, list] of Object.entries(forms)) for (const f of list) byForm.set(f.toLowerCase(), key)
  if (byForm.size === 0) return text
  const alts = [...byForm.keys()].sort((a, b) => b.length - a.length).map(escapeRe).join('|')
  // Дефис — тоже часть слова: иначе «узлами» в «супер-узлами» нашлось бы как отдельный «узел» с чужой подсказкой.
  const word = new RegExp(`(?<![\\p{L}\\p{N}-])(?:${alts})(?![\\p{L}\\p{N}-])`, 'giu')
  const label = (free: string) => free.replace(word, (m) => `[[${m}|${byForm.get(m.toLowerCase())}]]`)
  let out = ''
  let last = 0
  for (const m of text.matchAll(PROTECTED)) {
    out += label(text.slice(last, m.index)) + m[0]
    last = (m.index ?? 0) + m[0].length
  }
  return out + label(text.slice(last))
}
