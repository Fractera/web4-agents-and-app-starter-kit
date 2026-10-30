// СТОРОЖ ИНСТРУКЦИИ ЯДРА (федеральный шаг 612, 2026-10-30): `npm run check:instruction`, стоит в `prebuild`.
//
// Владелец, дословно: «запретить какие-либо изменения … чтобы не проверялись какие-нибудь надгробие или ещё какая-нибудь другая хрень …
// чтобы нормальные нашей инструкции никогда не превратилась бы в мусорку в процессе работы … ниже мы можем добавить дополнительную область
// который должно быть ограничена в 150 строк … по принципу if else maximum 25 слов». ✗ Прежняя инструкция ядра выросла до 4 028 строк
// истории шагов и надгробий.
// Что проверяет:
//   · печать: всё от начала `CLAUDE.md` до строки `Entries:` раздела 9 совпадает с отпечатком `lib/main-agent/instruction.seal`;
//   · раздел 9 «Evolution» — не больше 150 строк; каждая запись — одна строка `- If …`, не больше 25 слов;
//   · во всём файле нет надгробий (🪦) и зачёркиваний (~~).
// 🔒 `--seal` переписывает отпечаток. Его запускают только после слова владельца, изменившего разделы 1–8 (источник — опись шага 608 в
// /code); агент по своей инициативе печать не переписывает.
// Порча для негативного контроля: `--file <путь>` — проверить другой файл.

import { createHash } from 'node:crypto'
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const args = process.argv.slice(2)
const arg = (k) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : null }
const SEAL = join(ROOT, 'lib', 'main-agent', 'instruction.seal')
const MAX_LINES = 150
const MAX_WORDS = 25

const text = readFileSync(arg('--file') ?? join(ROOT, 'CLAUDE.md'), 'utf8').replace(/\r\n/g, '\n')
const lines = text.split('\n')
const problems = []
const sec9 = lines.findIndex((l) => l.startsWith('## 9. Evolution'))
const entriesAt = lines.findIndex((l, i) => i > sec9 && l.trim() === 'Entries:')
if (sec9 < 0 || entriesAt < 0) problems.push('нет раздела «## 9. Evolution» со строкой «Entries:»')
const fixed = entriesAt >= 0 ? lines.slice(0, entriesAt + 1).join('\n') : text
const hash = createHash('sha256').update(fixed).digest('hex')

if (args.includes('--seal')) {
  if (problems.length) { console.log(`===INSTRUCTION_FAIL=== ${problems[0]}`); process.exit(1) }
  writeFileSync(SEAL, `${hash}\n`, 'utf8')
  console.log(`===INSTRUCTION_SEALED=== разделы 1–8 и правила раздела 9: ${fixed.length} знаков, печать ${hash.slice(0, 12)}`)
  process.exit(0)
}

const sealed = existsSync(SEAL) ? readFileSync(SEAL, 'utf8').trim() : ''
if (!sealed) problems.push('нет печати lib/main-agent/instruction.seal')
else if (sealed !== hash) problems.push('разделы 1–8 или правила раздела 9 изменены без печати: их меняет только владелец (опись шага 608, затем --seal)')
if (sec9 >= 0 && lines.length - sec9 > MAX_LINES) problems.push(`раздел 9 — ${lines.length - sec9} строк, предел ${MAX_LINES}`)
for (const [i, l] of lines.entries()) {
  if (i <= entriesAt || !l.trim()) continue
  if (!/^- If /.test(l)) problems.push(`строка ${i + 1} раздела 9 — не запись «- If …»: ${l.slice(0, 60)}`)
  const words = l.replace(/^- /, '').split(/\s+/).filter((w) => /[\p{L}\p{N}]/u.test(w)).length
  if (words > MAX_WORDS) problems.push(`строка ${i + 1}: ${words} слов, предел ${MAX_WORDS}`)
}
for (const [i, l] of lines.entries()) if (/🪦|~~/.test(l)) problems.push(`строка ${i + 1}: надгробие или зачёркивание — устаревшее удаляется, история в git`)

const entries = entriesAt >= 0 ? lines.slice(entriesAt + 1).filter((l) => l.trim()).length : 0
if (problems.length) {
  for (const p of problems) console.log('✗ ' + p)
  console.log('===INSTRUCTION_FAIL===')
  process.exit(1)
}
console.log(`===INSTRUCTION_OK=== печать совпала, раздел 9: ${sec9 >= 0 ? lines.length - sec9 : 0} строк из ${MAX_LINES}, записей ${entries}`)
