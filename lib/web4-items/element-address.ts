import "server-only"
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import paths from "@/lib/web4-items/paths.cjs"
import { listDrafts, RESERVED_NAMES } from "@/lib/web4-items/drafts"
import { builtInDraft, builtInIds } from "@/lib/web4-items/built-in-elements"
import { isElementAddress } from "@/lib/web4-items/dns-label.mjs"
import { addressOf } from "@/lib/web4-items/address-file.mjs"
import { ARCHITECT_PATHS } from "@/app/[lang]/(architectLayer)/_lib/architect-menu"

// АДРЕС WEB4 ЭЛЕМЕНТА В ЯДРЕ ПРИ НЕИЗМЕННОМ id (325-3). Решения владельца 2026-09-27: «Адрес, id неизменен» и «Только ядро» —
// поддомен в интернете не трогается (временное решение, будет перенесено).
//
// 🔒 id НЕ МЕНЯЕТСЯ НИКОГДА: реестр, pm2, данные, двери агента, терминал — всё по id. 343: ПАПКА — по адресу (слово владельца
// 2026-09-30 «Папка = адрес»): дверь зовёт `scripts/element-move.mjs`, путь находит `paths.cjs`. Адрес — слой над ним: имя в меню и
// путь страниц `/<lang>/<адрес>`; прежний путь `/<lang>/<id>` переадресует на новый (страница элемента).
// 🔒 АДРЕС ЛЕЖИТ У САМОГО ЭЛЕМЕНТА — `data/services/<id>/address.json`: удаление элемента (325-5) стирает эту папку, и адрес
// освобождается без отдельного шага. Нет файла — адрес равен id.
// 🔒 СВОБОДНО = не занято ничем, что ядро отдаёт по тому же пути: разделом слоя (папка с точным именем важнее — Next отдал бы
// раздел, а не элемент), id или адресом другого элемента или черновика, записью реестра, служебным путём.

// 325-7: форма имени — метка DNS по RFC 1035/1123/5891 и политика узла (`dns-label.mjs`, сторож `check-dns-label`).
// Запретные имена — общий список с черновиками плюс пути ядра, которые не являются разделами.
const CORE_PATHS = ["architect", "api", "login", "register", "guest-login", "logout", "account"]

const DATA = join(process.cwd(), "data", "services")
const fileOf = (id: string) => join(DATA, id, "address.json")

export type AddressCheck = { ok: true } | { ok: false; reason: "bad-shape" | "taken"; suggestions: string[] }

// 325-8: чтение адреса — одно место на ядро и установщик (`address-file.mjs`).
export { addressOf }

function registryIds(): string[] {
  try {
    return (JSON.parse(readFileSync(paths.REGISTRY_FILE, "utf8")) as { services: Array<{ id: string }> }).services.map((s) => s.id)
  } catch { return [] }
}

/** id элемента или черновика по сегменту пути: адресом или самим id. Не найден — null. */
export function idOfAddress(segment: string): string | null {
  // 557: и встроенные элементы — у них дерево элемента, адрес = id (смена адреса им закрыта). 606: и root — кастомный элемент реестра без
  // черновика (`builtInDraft`); ✗ без него `/ru/root/build/terminal` отвечал 404 на собранном ядре, хотя меню вело туда.
  const ids = [...listDrafts().map((d) => d.id), ...builtInIds(), ...(builtInDraft("root") ? ["root"] : [])]
  return ids.find((id) => addressOf(id) === segment) ?? (ids.includes(segment) ? segment : null)
}

function taken(name: string, forId: string): boolean {
  if (name === forId) return false
  if (RESERVED_NAMES.has(name) || CORE_PATHS.includes(name)) return true
  if (ARCHITECT_PATHS.some((p) => p.split("/")[2] === name)) return true
  if (registryIds().includes(name)) return true
  return listDrafts().some((d) => d.id === name || (d.id !== forId && addressOf(d.id) === name))
}

const wellFormed = (name: string) => isElementAddress(name)

/** Свободно ли имя для элемента `forId`; занято — до трёх свободных вариантов рядом. */
export function checkAddress(name: string, forId: string): AddressCheck {
  if (!wellFormed(name)) return { ok: false, reason: "bad-shape", suggestions: [] }
  if (!taken(name, forId)) return { ok: true }
  const suggestions: string[] = []
  const base = name.slice(0, 20)
  for (let n = 2; n < 100 && suggestions.length < 3; n++) {
    const s = `${base}-${n}`
    if (wellFormed(s) && !taken(s, forId)) suggestions.push(s)
  }
  return { ok: false, reason: "taken", suggestions }
}

/** Записать адрес (равный id — снять свой адрес). Проверка — внутри, повторно. */
export function setAddress(id: string, name: string): AddressCheck & { previous?: string } {
  const check = checkAddress(name, id)
  if (!check.ok) return check
  const previous = addressOf(id)
  if (name === id) {
    rmSync(fileOf(id), { force: true })
  } else {
    if (!existsSync(join(DATA, id))) mkdirSync(join(DATA, id), { recursive: true })
    writeFileSync(fileOf(id), JSON.stringify({ address: name, at: new Date().toISOString(), previous }, null, 2) + "\n", "utf8")
  }
  return { ok: true, previous }
}
