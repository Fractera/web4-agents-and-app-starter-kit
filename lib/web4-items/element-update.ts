import "server-only"
import { spawnSync } from "node:child_process"
import { existsSync, readFileSync } from "node:fs"
import { join } from "node:path"
import paths from "@/lib/web4-items/paths.cjs"

// ОБНОВЛЕНИЕ ОБЯЗАТЕЛЬНОГО ЭЛЕМЕНТА С НОВОГО ТЕГА FRACTERA (шаг 374-7). Слово владельца 2026-10-02: элементы ядра «пользователь их
// меняет … прогрессирует ровно точно также как и любой другой WEB4 ITEMS»; конфликт слияния — «fix with ai agent».
//
// 🔒 ЭЛЕМЕНТ БЕЗ СВОЕЙ РАБОТЫ (нет коммитов вне тегов Fractera) обновляет установщик переходом на тег — как прежде; здесь только
// говорится «обновится при развёртывании». Элемент со своей работой получает тег СЛИЯНИЕМ в свою историю: правки человека
// остаются, тег вливается. Конфликт — слияние оставляется открытым (файлы с метками конфликта), задача уходит агенту элемента в
// окно вставки его терминала; работающая сборка не задета (она в своей папке сборки). Сборка новой версии — «Развернуть».

const ROOT = process.cwd()

function git(dir: string, args: string[]) {
  const r = spawnSync("git", ["-C", dir, "-c", "credential.helper=", ...args], {
    encoding: "utf8", windowsHide: true, timeout: 300_000, env: { ...process.env, GIT_TERMINAL_PROMPT: "0" },
  })
  return { rc: r.status ?? 1, out: `${r.stdout ?? ""}${r.stderr ?? ""}` }
}

type Entry = { id: string; kind?: string; version?: string; born?: unknown }

function entryOf(id: string): Entry | null {
  try { return ((JSON.parse(readFileSync(paths.REGISTRY_FILE, "utf8")) as { services?: Entry[] }).services ?? []).find((e) => e.id === id) ?? null }
  catch { return null }
}

export type UpdateState = { id: string; target: string | null; base: string | null; ownWork: boolean; available: boolean; merging: boolean }

/** Что с обновлением элемента: на каком теге он основан, какой требует реестр, есть ли своя работа, не идёт ли слияние. */
export function updateState(id: string): UpdateState | null {
  const e = entryOf(id)
  if (!e || e.born || !e.version) return null
  const dir = paths.entryDir(e)
  if (!existsSync(join(dir, ".git"))) return null
  const ownWork = Number(git(dir, ["rev-list", "--count", "HEAD", "--not", "--tags"]).out.trim() || "0") > 0
  const base = git(dir, ["describe", "--tags", "--abbrev=0", "HEAD"]).out.trim() || null
  const merging = existsSync(join(dir, ".git", "MERGE_HEAD"))
  return { id, target: e.version, base, ownWork, available: !!base && base !== e.version, merging }
}

export type UpdateResult =
  | { ok: true; mode: "merged"; commit: string }
  | { ok: true; mode: "on-deploy" | "up-to-date" }
  | { ok: false; error: "conflict"; files: string[]; task: string }
  | { ok: false; error: string }

/** «Обновить»: влить тег реестра в историю элемента со своей работой. */
export function updateElement(id: string): UpdateResult {
  const e = entryOf(id)
  const st = updateState(id)
  if (!e || !st) return { ok: false, error: "not-updatable" }
  if (st.merging) return { ok: false, error: "merge-in-progress" }
  if (!st.available) return { ok: true, mode: "up-to-date" }
  if (!st.ownWork) return { ok: true, mode: "on-deploy" }
  const dir = paths.entryDir(e)
  const fractera = git(dir, ["remote", "get-url", "upstream"]).rc === 0 ? "upstream" : "origin"
  if (git(dir, ["fetch", "--quiet", "--tags", fractera]).rc !== 0) return { ok: false, error: "fetch-failed" }
  if (git(dir, ["rev-parse", "--is-shallow-repository"]).out.trim() === "true" && git(dir, ["fetch", "--quiet", "--unshallow", fractera]).rc !== 0) {
    return { ok: false, error: "fetch-failed" }
  }
  // След сборки (tsconfig.json, next-env.d.ts) — не правка человека: вернуть, иначе слияние откажет из-за него.
  const buildOwned = git(dir, ["ls-files", "-m"]).out.split(/\r?\n/).map((l) => l.trim()).filter((f) => /(^|\/)(tsconfig\.json|next-env\.d\.ts)$/.test(f))
  if (buildOwned.length) git(dir, ["checkout", "--quiet", "--", ...buildOwned])
  if (git(dir, ["status", "--porcelain", "--untracked-files=no"]).out.trim()) return { ok: false, error: "dirty" }
  const m = git(dir, ["-c", "user.name=Fractera node", "-c", "user.email=node@fractera.local", "merge", "--no-edit", "-m", `update to ${e.version} (Fractera)`, `tags/${e.version}`])
  if (m.rc === 0) return { ok: true, mode: "merged", commit: git(dir, ["rev-parse", "--short", "HEAD"]).out.trim() }
  const files = git(dir, ["diff", "--name-only", "--diff-filter=U"]).out.split(/\r?\n/).filter(Boolean)
  if (files.length === 0) {
    git(dir, ["merge", "--abort"])
    return { ok: false, error: "merge-failed" }
  }
  const task = [
    `Fractera released ${e.version} of this WEB4 ITEM, and merging it into your history stopped on conflicts in ${files.length} file(s):`,
    ...files.map((f) => `- ${f}`),
    "The merge is left open in this folder. Resolve every conflict keeping the owner's changes and taking Fractera's fixes, run the element's checks, then commit the merge (git commit --no-edit). Tell the person what you kept from each side; the new version goes live with «Deploy».",
  ].join("\n")
  return { ok: false, error: "conflict", files, task }
}

/** Адрес терминала элемента для окна вставки: у служб ядра — их id, у рождённого — `<адрес>/build` (356). 606: и у любого элемента без своей
 *  страницы `architect/<id>/terminal` (root с шага 606) — его терминал в дереве элемента. */
export function terminalServiceOf(id: string): string {
  const e = entryOf(id)
  const ownTerminal = existsSync(join(ROOT, "app", "[lang]", "(architectLayer)", "architect", id, "terminal"))
  if (e?.born || (e && !ownTerminal)) {
    try { return `${(JSON.parse(readFileSync(join(ROOT, "data", "services", id, "address.json"), "utf8")) as { address?: string }).address || id}/build` }
    catch { return `${id}/build` }
  }
  return id
}
