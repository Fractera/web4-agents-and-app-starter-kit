import "server-only"
import { spawnSync } from "node:child_process"
import { readFileSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import paths from "@/lib/web4-items/paths.cjs"
import { entryForRegistry } from "@/lib/a2a/node-registry"
import elementProps from "@/lib/web4-items/element-props.cjs"

// ОПИСАНИЕ ВОЗМОЖНОСТЕЙ WEB4 ЭЛЕМЕНТА → ЗАПИСЬ В ЯДРЕ (325-2). Решение владельца 2026-09-27: описание пишет «Агент элемента».
//
// 🔒 ПИШЕТ АГЕНТ, ЗАБИРАЕТ ЧЕЛОВЕК. Агент элемента (Claude Code в его папке) по заданию из терминала пишет тексты паспорта
// (`OWN-SERVICE-PROPS/OWN-SERVICE-PROPS.json`: `shortDescription` и соседние) и навыки визитки (`A2A-CARD.json`); ядро читает их через
// `readElementProps` (`summary` = `shortDescription`, `provides` = навыки визитки). 🪦 Прежняя раскладка — поля `summary` и `provides` в
// корневом файле паспорта; задача, велевшая их писать, оставляла честный текст агента мимо реестра (проба Stripe, 551-5). «Забрать в
// ядро» зовёт `takeDescription`, и только она меняет запись реестра. Само ядро паспорт не читает — таймеров и слежки за файлом нет.
// 🔒 ФОРМА ПРОВЕРЯЕТСЯ ДО ЗАПИСИ: пустой `provides`, шаблонный или рождённый (325-1) `summary` — отказ словом, реестр не
// тронут. Так в ядро не попадает описание, которого агент не писал.
// 🔒 В РЕЕСТРЕ ОПИСАНИЕ ЗАМЕНЯЕТ `provides` РОЖДЕНИЯ (`element-site`) и получает `described` — когда и с какого коммита
// элемента взято. Реестр — рабочий файл узла (как у рождения и удаления), в git ядра записи рождённых не попадают.

// 329 (слово владельца 2026-09-28): «есть собственное описание и есть общий файл в ядре, который тоже должен быть обновлён …
// процедура должна проходить через Claude Code, который вызывает навык внутри WEB4 ITEM; навык ещё не разработан». Задание
// называет будущий навык `describe-element` (есть — агент следует ему) и кончается командой элемента `npm run describe:publish`:
// она отдаёт паспорт в ядро той же дверью, что и кнопка «Забрать в ядро» (кнопка остаётся запасной).
// 590-5: описание — работа прохода текстов (humanizer живёт только там, модель — Sonnet по закону 570): задание открывается его словом,
// и мост рождает сессию этого прохода. У элемента шаблона до 590-5 слово тоже законно: проход текстов там — та же строительная сессия.
export const TASK = [
  "Build process, texts: describe this WEB4 element for the node's core.",
  "Follow the skill describe-element of this folder; the passport texts are written by the skill passport-description.",
  "Write only what the code of this folder does today: name, shortDescription, longDescription, accepts and returns in OWN-SERVICE-PROPS/OWN-SERVICE-PROPS.json, and the skills of OWN-SERVICE-PROPS/A2A-CARD.json. The passport has no fields summary or provides: never add them.",
  "Run the texts through humanizer, then npm run check:passport until it is clean.",
  "Show me the texts and wait for my yes; then commit and run: npm run describe:publish — it hands the description to the node's core. If it prints DESCRIBE_FAILED, fix what it names and run it again.",
  "Finish by printing the short description and the line the command printed.",
].join("\n")

const TEMPLATE_SUMMARY = /^The template of a node element/i
const BIRTH_SUMMARY = /^WEB4 element \S+, born from /i
const CAPABILITY = /^[a-z0-9][a-z0-9-]{1,47}$/
// 333-3: НАВЫК ДИЗАЙНА ЭЛЕМЕНТА — короткое имя (`impeccable`, `design-taste-frontend`, `blocks`). Слово владельца: «в коллекции
// собственной информации о себе мы теперь всегда передаем название навыка дизайна … глобальный реестр … должен получать этот
// навык». Поле необязательное; имя вне библиотеки `WEB4-ITEMS-REGISTRY/design-skills.json` — не ошибка (элемент мог прийти извне),
// проверяется только форма.
const DESIGN_SKILL = /^[a-z0-9][a-z0-9-]{0,39}$/

export type Description = { summary: string; provides: string[]; at: string; commit: string | null }
export type TakeError = "passport-unreadable" | "summary-missing" | "summary-not-written" | "provides-missing" | "provides-bad-shape" | "design-skill-bad-shape" | "registry-failed"

type Entry = { id: string; kind?: string; born?: unknown; summary?: string; provides?: string[]; designSkill?: string; described?: { at: string; commit: string | null } }
type Registry = { services: Entry[] }

const readRegistry = (): Registry => JSON.parse(readFileSync(paths.REGISTRY_FILE, "utf8")) as Registry

/** Описание, уже забранное в ядро (`null` — ещё не забиралось: `provides` рождения описанием не считается). */
export function registryDescription(id: string): Description | null {
  try {
    const e = readRegistry().services.find((s) => s.id === id)
    if (!e?.described || typeof e.summary !== "string") return null
    return { summary: e.summary, provides: e.provides ?? [], at: e.described.at, commit: e.described.commit }
  } catch { return null }
}

/** Прочитать паспорт элемента и проверить форму описания. */
export function passportDescription(id: string): { ok: true; summary: string; provides: string[]; designSkill?: string } | { ok: false; error: TakeError } {
  let props: { summary?: unknown; provides?: unknown; designSkill?: unknown }
  try {
    props = elementProps.readElementProps(paths.itemDir(id, "user")) // 417: обе раскладки
  } catch { return { ok: false, error: "passport-unreadable" } }
  const summary = typeof props.summary === "string" ? props.summary.trim() : ""
  if (summary.length < 20) return { ok: false, error: "summary-missing" }
  if (TEMPLATE_SUMMARY.test(summary) || BIRTH_SUMMARY.test(summary)) return { ok: false, error: "summary-not-written" }
  if (!Array.isArray(props.provides) || props.provides.length === 0) return { ok: false, error: "provides-missing" }
  const provides = props.provides.map((p) => (typeof p === "string" ? p.trim() : ""))
  if (provides.length > 20 || provides.some((p) => !CAPABILITY.test(p)) || new Set(provides).size !== provides.length) {
    return { ok: false, error: "provides-bad-shape" }
  }
  let designSkill: string | undefined
  if (props.designSkill !== undefined) {
    designSkill = typeof props.designSkill === "string" ? props.designSkill.trim() : ""
    if (!DESIGN_SKILL.test(designSkill)) return { ok: false, error: "design-skill-bad-shape" }
  }
  return { ok: true, summary: summary.slice(0, 800), provides, designSkill }
}

/** «Забрать в ядро»: паспорт → запись реестра. Отказ — реестр не тронут. */
export function takeDescription(id: string): { ok: true; description: Description } | { ok: false; error: TakeError } {
  const read = passportDescription(id)
  if (!read.ok) return read
  const head = spawnSync("git", ["-C", paths.itemDir(id, "user"), "rev-parse", "--short", "HEAD"], { encoding: "utf8", windowsHide: true, timeout: 10_000 })
  const commit = head.status === 0 ? head.stdout.trim() || null : null
  const at = new Date().toISOString()
  try {
    const reg = readRegistry()
    const e = reg.services.find((s) => s.id === id)
    if (!e) return { ok: false, error: "registry-failed" }
    e.summary = read.summary
    e.provides = read.provides
    if (read.designSkill) e.designSkill = read.designSkill
    e.described = { at, commit }
    // 406-6: запись A2A (уровень 1) из визитки элемента с отпечатком — ядро по ней отвечает «кто умеет и где»; нет визитки — нет записи.
    const a2a = entryForRegistry(id, "user")
    if (a2a) (e as unknown as { a2a?: unknown }).a2a = a2a
    else delete (e as unknown as { a2a?: unknown }).a2a
    writeFileSync(paths.REGISTRY_FILE, JSON.stringify(reg, null, 2) + "\n", "utf8")
  } catch { return { ok: false, error: "registry-failed" } }
  return { ok: true, description: { summary: read.summary, provides: read.provides, at, commit } }
}
