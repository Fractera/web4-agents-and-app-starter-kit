// ЗАПИСЬ ВЕРДИКТА РАЗБОРА (шаг 577-6, 2026-10-24) — `agi-code/data/services/blocks/verdicts.jsonl`, строка на вердикт.
//
//   node verdict.mjs add --element reverse --page en --grade 2 --by model:claude-opus-5-5 \
//        [--replace "block-a>block-b"]… [--move block-x]… [--fine block-y]… [--note "…"]
//   node verdict.mjs add … --by owner                    # вердикт владельца пишется РЯДОМ с вердиктом модели
//   node verdict.mjs add … --copy <имя>                   # разбор ИСПОРЧЕННОЙ копии (проверка аналитика) — в сравнении не участвует
//   node verdict.mjs list [--element reverse]            # последние вердикты и совпадение модели с владельцем по странице
//
// Три степени владельца (577-main): 1 — «не соответствует стандартам — заменить X → Y»; 2 — «лучше, но не на своих местах —
// переставить X и Z»; 3 — «выглядит замечательно». Степень 1 требует хотя бы одной замены, 2 — хотя бы одной перестановки.
// Страница пишется без косой (`en`, `ru/docs`): Git Bash переписывает `/en` в путь Windows.
import { appendFileSync, existsSync, mkdirSync, readFileSync } from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const here = path.dirname(fileURLToPath(import.meta.url))
const argv = process.argv.slice(2)
const all = (name) => argv.flatMap((a, i) => (a === name ? [argv[i + 1]] : []))
const opt = (name) => all(name)[0] ?? null
// In the core since federal step 621-5: the skill folder is <core>/.claude/skills/review-page, three levels below the core.
const FILE = path.resolve(opt("--file") || path.join(here, "..", "..", "..", "data", "services", "blocks", "verdicts.jsonl"))
const fail = (msg) => { console.log(`===VERDICT_FAIL=== ${msg}`); process.exit(1) }

if (argv[0] === "add") {
  const element = opt("--element")
  const page = opt("--page")
  const grade = Number(opt("--grade"))
  const by = opt("--by")
  if (!element || !page || !by) fail("add needs --element, --page and --by (model:<id> or owner)")
  if (/^[A-Za-z]:[\\/]/.test(page)) fail(`the shell rewrote the page into a path (${page}) — pass it without the slash`)
  if (![1, 2, 3].includes(grade)) fail("--grade is 1, 2 or 3")
  if (by !== "owner" && !by.startsWith("model:")) fail("--by is owner or model:<id>")
  const replace = all("--replace").map((r) => { const [from, to] = r.split(">"); if (!from || !to) fail(`--replace is "from>to": ${r}`); return { from, to } })
  const move = all("--move")
  const fine = all("--fine")
  if (grade === 1 && !replace.length) fail("grade 1 names what to replace: --replace \"block-a>block-b\"")
  if (grade === 2 && !move.length) fail("grade 2 names what to move: --move block-x")
  const row = { at: new Date().toISOString(), element, page: page.replace(/^\//, ""), grade, by, replace, move, fine, note: opt("--note") || "", ...(opt("--copy") ? { copy: opt("--copy") } : {}) }
  mkdirSync(path.dirname(FILE), { recursive: true })
  appendFileSync(FILE, JSON.stringify(row) + "\n")
  console.log(`===VERDICT_OK=== ${element} ${row.page}: grade ${grade} by ${by} → ${FILE}`)
} else if (argv[0] === "list") {
  const rows = existsSync(FILE) ? readFileSync(FILE, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l)) : []
  const only = opt("--element")
  const keep = rows.filter((r) => !only || r.element === only)
  for (const r of keep.slice(-20)) console.log(`${r.at.slice(0, 16)} ${r.element}/${r.page}${r.copy ? ` [copy: ${r.copy}]` : ""} grade ${r.grade} by ${r.by}${r.replace.length ? ` · replace ${r.replace.map((x) => `${x.from}→${x.to}`).join(", ")}` : ""}${r.move.length ? ` · move ${r.move.join(", ")}` : ""}${r.note ? ` · ${r.note}` : ""}`)
  // Совпадение: последний вердикт модели и последний владельца по одной странице.
  const pages = [...new Set(keep.map((r) => `${r.element}/${r.page}`))]
  let both = 0
  let same = 0
  for (const p of pages) {
    const of = keep.filter((r) => `${r.element}/${r.page}` === p && !r.copy)
    const model = of.filter((r) => r.by.startsWith("model:")).at(-1)
    const owner = of.filter((r) => r.by === "owner").at(-1)
    if (!model || !owner) continue
    both++
    if (model.grade === owner.grade) same++
    console.log(`match ${p}: model ${model.grade} · owner ${owner.grade}${model.grade === owner.grade ? " — same" : " — differs"}`)
  }
  console.log(`===VERDICTS=== ${keep.length} verdict(s); pages judged by both: ${both}, same grade: ${same}`)
} else {
  fail("commands: add · list")
}
