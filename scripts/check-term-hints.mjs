// СТОРОЖ: МЕТКИ ПОДСКАЗОК → ЗАПИСИ ЛИКБЕЗА (шаг 599-1).
//
// Владелец 2026-10-26: «добавить тултип и подсветить подсказки элемент, узел и так далее, все что у нас есть в глоссари … так как эта
// страница первого контакта и при это много новых слов». Слово с подсказкой пишется в словаре страницы меткой `[[форма|ключ]]`, а
// определение живёт один раз — в ликбезе (`lib/content/blocks/term.ts`). Две половины одного знания расходятся молча: метка с ключом,
// которого в ликбезе нет, показала бы простое слово без подсказки, и не упало бы ничто. Сторож ловит:
//   1. метку, чей ключ не найден в ликбезе того же языка (и в строках страницы, и внутри самих определений);
//   2. ключ ликбеза повторён, написан не так (a–z, 0–9, «-») или есть в одном языке и нет в другом;
//   3. слово, уточнение или определение ликбеза со знаками, которые рвут подсказку (`{`, `}`, `|`, `[`, `]`, `**`),
//      и ссылку «подробнее» не по форме `[подпись](адрес)`;
//   4. метку в файле, который её не раскрывает: на странице она встала бы скобками.
// Словари читаются компилятором TypeScript проекта (transpileModule), как в check-main-agent-menu: своя копия списка слов здесь была бы
// третьей половиной.

import { mkdtempSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, relative, sep } from 'node:path'
import { pathToFileURL } from 'node:url'
import ts from 'typescript'

const ROOT = process.cwd()
const tmp = mkdtempSync(join(tmpdir(), 'term-hints-'))

async function load(rel, name) {
  const src = readFileSync(join(ROOT, rel), 'utf8')
  const out = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText
  const file = join(tmp, `${name}.mjs`)
  writeFileSync(file, out)
  return import(pathToFileURL(file).href)
}

// Словари, которые раскрывают метки, — поимённо: новая страница с подсказками попадает под охрану вместе с решением, где её ликбез.
const DICTS = [
  {
    file: 'app/[lang]/(architectLayer)/_i18n/architect-home.i18n.ts',
    ui: 'architectHomeUi',
    langs: 'ARCHITECT_HOME_LANGS',
    terms: (u) => u.basics.items,
  },
]

// Файлы, чьи метки раскрывает не словарь, а страница, которая его импортирует (600-1: разделы «Как это работает» берут
// ликбез входа в своём `_components`). Их метки проверяются по ключам этого словаря, а не считаются «вне словаря».
const EXPANDED_BY = {
  'app/[lang]/(architectLayer)/architect/passport/how-it-works/_data/memory-sections.ts': 'app/[lang]/(architectLayer)/_i18n/architect-home.i18n.ts',
}

const term = await load('lib/content/blocks/term.ts', 'term')
const KEY = /^[a-z0-9-]+$/
const BREAKS = /[{}|[\]]|\*\*/
const MORE = /^\[[^\]]+\]\([^)]+\)$/

const errors = []
let labelCount = 0
let termCount = 0

/** Все строки словаря с путём до них — метки ищутся везде, а не в заранее названных полях. */
function strings(value, path, out = []) {
  if (typeof value === 'string') out.push([path, value])
  else if (Array.isArray(value)) value.forEach((v, i) => strings(v, `${path}[${i}]`, out))
  else if (value && typeof value === 'object') for (const [k, v] of Object.entries(value)) strings(v, path ? `${path}.${k}` : k, out)
  return out
}

const glossaryKeys = new Map()
for (const dict of DICTS) {
  const mod = await load(dict.file, `dict-${DICTS.indexOf(dict)}`)
  const langs = mod[dict.langs]
  if (!Array.isArray(langs) || !langs.length) {
    errors.push(`${dict.file}: нет списка языков ${dict.langs}`)
    continue
  }
  const keysOf = {}
  const union = glossaryKeys.get(dict.file) ?? new Set()
  glossaryKeys.set(dict.file, union)
  for (const lang of langs) {
    const ui = mod[dict.ui](lang)
    const items = dict.terms(ui)
    const keys = new Set()
    for (const t of items) {
      termCount++
      const where = `${dict.file} [${lang}] ликбез «${t.word}»`
      if (!KEY.test(t.key ?? '')) errors.push(`${where}: ключ «${t.key}» — только a–z, 0–9 и «-»`)
      if (keys.has(t.key)) errors.push(`${where}: ключ «${t.key}» повторён`)
      keys.add(t.key)
      for (const [field, value] of [['word', t.word], ['aside', t.aside]]) {
        if (value !== undefined && (!value.trim() || BREAKS.test(value))) errors.push(`${where}: ${field} пуст или несёт { } | [ ] ** — подсказка порвётся`)
      }
      if (!t.text?.trim() || BREAKS.test(term.labelsToForms(t.text))) errors.push(`${where}: определение пусто или несёт { } | [ ] ** вне меток — подсказка порвётся`)
      if (t.more !== undefined && !MORE.test(t.more)) errors.push(`${where}: «подробнее» не по форме [подпись](адрес)`)
    }
    keysOf[lang] = keys
    for (const k of keys) union.add(k)
    for (const [path, text] of strings(ui, '')) {
      for (const key of term.termLabelKeys(text)) {
        labelCount++
        if (!keys.has(key)) errors.push(`${dict.file} [${lang}] ${path}: метка с ключом «${key}» — такого слова в ликбезе нет`)
      }
    }
  }
  const base = keysOf[langs[0]]
  for (const lang of langs.slice(1)) {
    for (const k of base) if (!keysOf[lang].has(k)) errors.push(`${dict.file}: слово «${k}» есть в ${langs[0]}, нет в ${lang}`)
    for (const k of keysOf[lang]) if (!base.has(k)) errors.push(`${dict.file}: слово «${k}» есть в ${lang}, нет в ${langs[0]}`)
  }
}

// 5. Формы слов ликбеза для автопоиска (600-5): каждый ключ есть в ликбезе, форма не пуста и не рвёт метку.
const FORMS = {
  file: 'app/[lang]/(architectLayer)/_i18n/glossary-forms.ts',
  name: 'GLOSSARY_FORMS',
  dict: 'app/[lang]/(architectLayer)/_i18n/architect-home.i18n.ts',
}
{
  const mod = await load(FORMS.file, 'glossary-forms')
  const all = mod[FORMS.name]
  const known = glossaryKeys.get(FORMS.dict) ?? new Set()
  if (!all || typeof all !== 'object') errors.push(`${FORMS.file}: нет ${FORMS.name}`)
  else for (const [lang, map] of Object.entries(all)) {
    for (const [key, list] of Object.entries(map)) {
      if (!known.has(key)) errors.push(`${FORMS.file} [${lang}] ключ «${key}» — такого слова в ликбезе нет`)
      if (!Array.isArray(list) || list.length === 0) errors.push(`${FORMS.file} [${lang}] «${key}»: нет ни одной формы`)
      else for (const f of list) if (typeof f !== 'string' || !f.trim() || BREAKS.test(f)) errors.push(`${FORMS.file} [${lang}] «${key}»: форма «${f}» пуста или несёт { } | [ ] **`)
    }
  }
}

// 4. Метки вне словарей, которые их раскрывают.
const LABEL = /\[\[([^[\]|]+)\|([a-z0-9-]+)\]\]/g
const OWN = new Set(DICTS.map((d) => d.file.split('/').join(sep)))
const SKIP = new Set(['node_modules', '.next', '.git'])
function walk(dir) {
  for (const name of readdirSync(dir)) {
    if (SKIP.has(name)) continue
    const p = join(dir, name)
    if (statSync(p).isDirectory()) walk(p)
    else if (/\.(tsx?|mjs|json)$/.test(name)) {
      const rel = relative(ROOT, p)
      if (OWN.has(rel)) continue
      if (EXPANDED_BY[rel.split(sep).join('/')]) {
        const known = glossaryKeys.get(EXPANDED_BY[rel.split(sep).join('/')]) ?? new Set()
        for (const m of readFileSync(p, 'utf8').matchAll(LABEL)) {
          labelCount++
          if (!known.has(m[2])) errors.push(`${rel}: метка «${m[0]}» — такого слова в ликбезе входа нет`)
        }
        continue
      }
      for (const m of readFileSync(p, 'utf8').matchAll(LABEL)) errors.push(`${rel}: метка «${m[0]}» вне словаря, который её раскрывает — на странице встанут скобки`)
    }
  }
}
for (const dir of ['app', 'components', 'lib', 'sections', '_tools', 'config']) {
  try { walk(join(ROOT, dir)) } catch { /* нет папки — нечего смотреть */ }
}

for (const e of errors) console.log(`  ОШИБКА  ${e}`)
if (errors.length) {
  console.log(`===TERM_HINTS_FAILED=== ошибок: ${errors.length}`)
  process.exit(1)
}
console.log(`===TERM_HINTS_OK=== словарей: ${DICTS.length}, слов ликбеза: ${termCount}, меток: ${labelCount}`)
