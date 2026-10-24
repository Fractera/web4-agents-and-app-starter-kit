#!/usr/bin/env node
// СЧЁТ БЛОКОВ УЗЛА (шаг 577-8, 2026-10-24) — `npm run blocks:usage [-- --usefulness]`.
//
// Где стоит каждый блок каталога «Блоков» и какие потребности остались без блока. Ядро читает папки всех элементов — граница элемента
// его не держит. Только чтение и только по запросу: таймеров, интерфейса и пересборки нет (план 577-8).
//
// Источники:
//   - страницы: `WEB4-ITEMS/*/*/app/[lang]/**/_data/en.json` и `_pages/**/en.json` (порядок блоков во всех языках один — сторож
//     `check-page-sequence`, поэтому считается en); блоки внутри контейнеров (`children`) тоже;
//   - копии блоков в элементе: `components/blocks/<блок>.tsx|.card.json` и `.blocks-lock.json` (отпечаток, записанный `blocks add`:
//     sha256 текста с LF, первые 16 знаков — та же функция, что в `scripts/blocks.mjs` элемента);
//   - каталог: `WEB4-ITEMS/user/blocks/registry.json` и карточки `registry/src/components/blocks/*.card.json` (версия), подборки
//     `registry/src/collections/*.json`;
//   - данные «Блоков»: `data/services/blocks/requests/*.json` (заявки), `find-journal.jsonl` (поиск), `verdicts.jsonl` (разборы 577-6,
//     разборы испорченных копий не считаются).
import { createHash } from 'node:crypto'
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(fileURLToPath(import.meta.url), '..', '..')
const ITEMS = join(ROOT, 'WEB4-ITEMS')
const BLOCKS = join(ITEMS, 'user', 'blocks')
const DATA = join(ROOT, 'data', 'services', 'blocks')
const USEFULNESS = process.argv.includes('--usefulness')
const read = (p) => readFileSync(p, 'utf8')
const json = (p, fallback = null) => { try { return JSON.parse(read(p)) } catch { return fallback } }
const lines = (p) => (existsSync(p) ? read(p).split('\n').filter(Boolean).map((l) => { try { return JSON.parse(l) } catch { return null } }).filter(Boolean) : [])
const sha = (s) => createHash('sha256').update(String(s).replace(/\r\n/g, '\n')).digest('hex').slice(0, 16)
const major = (v) => Number(String(v || '0').split('.')[0]) || 0
const rel = (p) => relative(ROOT, p).split(sep).join('/')

// ── Каталог ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
const registry = json(join(BLOCKS, 'registry.json'), { items: [] })
const CATALOG = new Map()
// 🛑 По имени, а не по `type`: `block-section-head` лежит в реестре другим типом, и отбор по `registry:block` объявлял самый
// частый блок узла «нет в каталоге» (✗ первый прогон 577-8).
for (const item of registry.items.filter((i) => i.name.startsWith('block-'))) {
  const card = json(join(BLOCKS, 'registry', 'src', 'components', 'blocks', `${item.name}.card.json`), {})
  CATALOG.set(item.name, { version: card.version || '?', status: card.status || '?', files: item.files.map((f) => ({ src: join(BLOCKS, f.path), target: f.target })) })
}

// ── Элементы и их страницы ───────────────────────────────────────────────────────────────────────────────────────────────────────
const elements = []
for (const zone of ['core', 'user']) {
  if (!existsSync(join(ITEMS, zone))) continue
  for (const name of readdirSync(join(ITEMS, zone))) {
    const dir = join(ITEMS, zone, name)
    if (statSync(dir).isDirectory() && existsSync(join(dir, 'app', '[lang]'))) elements.push({ name, dir })
  }
}

function pageDirs(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name)
    if (!statSync(p).isDirectory() || ['node_modules', '_widgets', '_components', '_libs'].includes(name)) continue
    if (existsSync(join(p, 'en.json'))) out.push(p)
    pageDirs(p, out)
  }
  return out
}

const use = new Map() // блок → { pages: Set, elements: Set, times }
const widgetHomes = []
let pageCount = 0
for (const el of elements) {
  el.pages = []
  for (const dir of pageDirs(join(el.dir, 'app', '[lang]'))) {
    const page = json(join(dir, 'en.json'))
    if (!Array.isArray(page?.blocks)) continue
    pageCount++
    const id = `${el.name}:${rel(dir).split('/').slice(4).join('/')}`
    const kinds = []
    const walk = (list) => list.forEach((b) => { if (typeof b?.kind === 'string') kinds.push(b.kind); if (Array.isArray(b?.children)) walk(b.children) })
    walk(page.blocks)
    if (Array.isArray(page.faq) ? page.faq.length : page.faq) if (!kinds.includes('block-faq')) kinds.push('block-faq')
    el.pages.push({ id, kinds })
    for (const k of kinds.filter((x) => x.startsWith('block-'))) {
      if (!use.has(k)) use.set(k, { pages: new Set(), elements: new Set(), times: 0 })
      const u = use.get(k)
      u.pages.add(id)
      u.elements.add(el.name)
      u.times++
    }
    // Главная публичной ветки, нарисованная виджетом: без единого блока ИЛИ `bare` — тогда рисуются только виджеты, а блоки в
    // данных остаются словами, которые виджет читает (✗ первый прогон 577-8 пропустил lagrix).
    if (rel(dir).endsWith('(publicLayer)/_data')) {
      const meta = json(join(dir, 'meta.json'), {})
      const noBlocks = !page.blocks.some((b) => typeof b?.kind === 'string' && b.kind.startsWith('block-'))
      if (meta.bare || noBlocks) widgetHomes.push(`${el.name} (${page.blocks.filter((b) => String(b?.kind).startsWith('widget-')).map((b) => b.kind).join(', ') || 'без виджета'}${meta.bare ? ', bare' : ''}${meta.bare && !noBlocks ? ' — блоки в данных не рисуются' : ''})`)
    }
  }
}

// ── Копии блоков в элементах: версия, отставание, правка руками ──────────────────────────────────────────────────────────────────
const copies = [] // { element, block, version, latest, state }
for (const el of elements) {
  const bdir = join(el.dir, 'components', 'blocks')
  if (!existsSync(bdir)) continue
  const lock = json(join(bdir, '.blocks-lock.json'), {})
  for (const f of readdirSync(bdir).filter((x) => /^block-.*\.card\.json$/.test(x))) {
    const block = f.replace('.card.json', '')
    const card = json(join(bdir, f), {})
    const cat = CATALOG.get(block)
    let state
    const mine = cat ? cat.files.map((x) => ({ target: x.target, local: join(el.dir, x.target), src: x.src })) : []
    if (!cat) state = 'нет в каталоге'
    else if (lock[block]) {
      const changed = mine.filter((x) => existsSync(x.local) && lock[block].files?.[x.target] && lock[block].files[x.target] !== sha(read(x.local)))
      state = changed.length ? `изменён руками: ${changed.map((x) => x.target.split('/').pop()).join(', ')}` : 'как поставлен'
    } else {
      const same = card.version === cat.version && mine.every((x) => existsSync(x.local) && existsSync(x.src) && sha(read(x.local)) === sha(read(x.src)))
      state = same ? 'без отпечатка, равен каталогу' : card.version === cat.version ? 'без отпечатка, отличается от каталога' : 'без отпечатка'
    }
    copies.push({ element: el.name, block, version: card.version || '?', latest: cat?.version || '—', state })
  }
}

// ── Печать ───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
console.log(`===BLOCKS_USAGE=== элементов: ${elements.length}, страниц: ${pageCount}, блоков в каталоге: ${CATALOG.size}`)
console.log('\n## Где стоит каждый блок')
const order = [...new Set([...CATALOG.keys(), ...use.keys()])].sort((a, b) => (use.get(b)?.pages.size || 0) - (use.get(a)?.pages.size || 0) || a.localeCompare(b))
for (const b of order) {
  const u = use.get(b)
  if (!u) continue
  const lag = copies.filter((c) => c.block === b && c.latest !== '—' && c.version !== c.latest).map((c) => `${c.element} ${c.version}→${c.latest}`)
  console.log(`${b.padEnd(26)} страниц ${String(u.pages.size).padStart(3)} · элементов ${String(u.elements.size).padStart(2)} (${[...u.elements].sort().join(', ')})${CATALOG.has(b) ? '' : ' · НЕТ В КАТАЛОГЕ'}${lag.length ? ` · отстаёт: ${lag.join(', ')}` : ''}`)
}
console.log('\n## Копии блоков в элементах')
for (const c of copies.sort((a, b) => a.element.localeCompare(b.element) || a.block.localeCompare(b.block))) {
  console.log(`${c.element.padEnd(10)} ${c.block.padEnd(24)} ${c.version.padEnd(6)} каталог ${c.latest.padEnd(6)} ${c.state}`)
}
const breaking = copies.filter((c) => c.latest !== '—' && major(c.latest) > major(c.version))
console.log('\n## Смена старшей версии — что сломает обновление')
if (!breaking.length) console.log('нет: ни один стоящий блок не отстаёт на старшую версию')
for (const c of breaking) {
  const pages = elements.find((e) => e.name === c.element).pages.filter((p) => p.kinds.includes(c.block)).map((p) => p.id)
  console.log(`${c.element} ${c.block} ${c.version}→${c.latest}: ${pages.join(', ') || 'на страницах не стоит'}`)
}
console.log('\n## Блоки каталога, которые не стоят нигде')
console.log([...CATALOG.keys()].filter((b) => !use.has(b)).join(', ') || 'нет')
console.log('\n## Главные, нарисованные виджетом')
console.log(widgetHomes.join('\n') || 'нет')

const requests = existsSync(join(DATA, 'requests')) ? readdirSync(join(DATA, 'requests')).filter((f) => f.endsWith('.json')).map((f) => json(join(DATA, 'requests', f))).filter(Boolean) : []
const byStage = new Map()
for (const r of requests) { if (!byStage.has(r.stage)) byStage.set(r.stage, []); byStage.get(r.stage).push(`${r.id} (${r.from?.element ?? '?'}: ${String(r.need).slice(0, 50)})`) }
console.log('\n## Заявки по стадиям')
for (const [stage, list] of byStage) console.log(`${stage} — ${list.length}: ${list.join('; ')}`)
if (!requests.length) console.log('заявок нет')
const colDir = join(BLOCKS, 'registry', 'src', 'collections')
console.log('\n## Подборки проектов')
for (const f of existsSync(colDir) ? readdirSync(colDir).filter((x) => x.endsWith('.json')) : []) {
  const c = json(join(colDir, f), {})
  console.log(`${c.id}: ${(c.blocks || []).length} блок(ов) — ${(c.blocks || []).map((b) => (typeof b === 'string' ? b : b.name || b.block)).join(', ')}`)
}

const finds = lines(join(DATA, 'find-journal.jsonl'))
const misses = finds.filter((f) => !f.total)
console.log(`\n## Промахи поиска (журнал find: ${finds.length} запрос(ов), без результата ${misses.length})`)
const bySection = new Map()
for (const m of misses) { const k = m.category || m.role || 'без раздела'; if (!bySection.has(k)) bySection.set(k, []); bySection.get(k).push(`«${m.q}» (${m.element})`) }
for (const [k, list] of bySection) console.log(`${k}: ${list.join('; ')}`)
if (!misses.length) console.log('промахов нет')

if (USEFULNESS) {
  const verdicts = lines(join(DATA, 'verdicts.jsonl')).filter((v) => !v.copy)
  console.log('\n## Полезность: страниц · элементов · первым в поиске / найден · вердикты хорошо / переставить / заменить')
  for (const b of [...CATALOG.keys()].sort()) {
    const u = use.get(b)
    const first = finds.filter((f) => f.found?.[0] === b).length
    const found = finds.filter((f) => f.found?.includes(b)).length
    const fine = verdicts.filter((v) => v.fine?.includes(b)).length
    const move = verdicts.filter((v) => v.move?.includes(b)).length
    const replace = verdicts.filter((v) => v.replace?.some((r) => r.from === b)).length
    console.log(`${b.padEnd(26)} ${String(u?.pages.size || 0).padStart(3)} · ${String(u?.elements.size || 0).padStart(2)} · ${first}/${found} · ${fine}/${move}/${replace}`)
  }
}
