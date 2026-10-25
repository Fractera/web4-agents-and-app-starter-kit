// @api list an element's studies with notes and ledger counts
import { existsSync } from "node:fs"
import { readdir, readFile, stat } from "node:fs/promises"
import { join } from "node:path"
import { NextRequest, NextResponse } from "next/server"

import type { StudyRow } from "@/components/element-docs/reverse-engineering.client"
import { requireRoles } from "@/lib/auth/require-roles"
import { getService } from "@/lib/microservices/registry"
import { idOfAddress } from "@/lib/web4-items/element-address"
import { elementDir } from "@/lib/web4-items/element-github"

// STUDIES OF ONE ELEMENT FOR «Product design → Reverse engineering» (node step 594-6). The owner of the node, 2026-10-25: «разборы он
// должен хранить внутри каждого элемента». A study is the element's folder `study/<YYYY-MM-DD>-<site>/`, out of git: REA's records, the
// agent's investigation notes `notes.md`, the ledger of obligations `ledger.json` (REA's own output, `npm run ledger`).
// 🔒 Nothing of the studied product leaves through this door: names, sizes, dates, the first lines of the agent's own notes and the
//    ledger's counts — never a record of REA, a captured page or a script (the laws of the study pass: someone else's code lives there).
// 🔒 The folder is fixed (`study/` of the element), never taken from the request; the roles are the quiz's (`/api/node/product-quiz`).
// 🔒 Everything is read asynchronously (law 325-6: a door of the core never holds its event loop) and only when the page asks.
export const dynamic = "force-dynamic"

const ROLES = ["architect", "admin"] as const
const HEADERS = { "Cache-Control": "no-store" }
/** A study of a large site holds about a hundred files (TinyLaunch: 121); the walk stops here instead of reading a runaway folder. */
const MAX_FILES = 2000
const NOTES_LINES = 12
const NOTES_CHARS = 2000

async function walk(dir: string): Promise<{ files: number; bytes: number; changed: number }> {
  let files = 0
  let bytes = 0
  let changed = 0
  let entries: { name: string; parentPath?: string; path?: string; isFile(): boolean }[] = []
  try {
    entries = await readdir(dir, { recursive: true, withFileTypes: true })
  } catch {
    return { files, bytes, changed }
  }
  for (const e of entries) {
    if (!e.isFile()) continue
    if (files >= MAX_FILES) break
    files++
    try {
      const s = await stat(join(e.parentPath ?? e.path ?? dir, e.name))
      bytes += s.size
      changed = Math.max(changed, s.mtimeMs)
    } catch { /* gone between the listing and the stat: counted, no size */ }
  }
  return { files, bytes, changed }
}

async function notesOf(dir: string): Promise<string | null> {
  try {
    const text = await readFile(join(dir, "notes.md"), "utf8")
    const lines = text.replace(/\r\n?/g, "\n").split("\n")
    const head = lines.slice(0, NOTES_LINES).join("\n").trim()
    return head ? head.slice(0, NOTES_CHARS) : null
  } catch {
    return null
  }
}

// REA's ledger, read as the element's guard `check:product` reads it (594-4): `normalized_result` or the bare result. A file that is
// not a ledger is named («unreadable»), never shown as «no ledger yet».
async function ledgerOf(dir: string): Promise<StudyRow["ledger"]> {
  const file = join(dir, "ledger.json")
  if (!existsSync(file)) return null
  try {
    const raw = JSON.parse(await readFile(file, "utf8")) as Record<string, unknown>
    const n = (raw.normalized_result ?? raw) as { status?: unknown; summary?: Record<string, unknown>; obligations?: unknown }
    if (!Array.isArray(n.obligations)) return { status: "unreadable", total: 0, requiredOpen: 0, verified: 0 }
    const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : 0)
    return {
      status: typeof n.status === "string" ? n.status : "unknown",
      total: num(n.summary?.total) || n.obligations.length,
      requiredOpen: num(n.summary?.required_open),
      verified: num(n.summary?.verified),
    }
  } catch {
    return { status: "unreadable", total: 0, requiredOpen: 0, verified: 0 }
  }
}

// ✗ 594-6, найдено прибором после пересборки: root живёт в своей статической папке — он не черновик и не встроенный, и `idOfAddress`
// его не знает («unknown element»). Элемент реестра спрашивается своим id, имя проверяется по форме до того, как стать путём (так же,
// как в `/api/node/reach`).
function elementOf(raw: string | null): string | null {
  const segment = (raw ?? "").trim()
  return idOfAddress(segment) ?? (/^[a-z][a-z0-9-]{0,31}$/.test(segment) && getService(segment) ? segment : null)
}

export async function GET(req: NextRequest) {
  const denied = await requireRoles(req, ROLES)
  if (denied) return denied
  const id = elementOf(req.nextUrl.searchParams.get("item"))
  const dir = id ? elementDir(id) : null
  if (!id || !dir) return NextResponse.json({ ok: false, error: "unknown element" }, { status: 404, headers: HEADERS })
  const root = join(dir, "study")
  if (!existsSync(root)) return NextResponse.json({ ok: true, studies: [] }, { headers: HEADERS })
  let folders: string[] = []
  try {
    folders = (await readdir(root, { withFileTypes: true })).filter((d) => d.isDirectory()).map((d) => d.name)
  } catch {
    return NextResponse.json({ ok: false, error: "the study folder is unreadable" }, { status: 500, headers: HEADERS })
  }
  const studies: StudyRow[] = []
  for (const folder of folders.sort().reverse()) {
    const at = join(root, folder)
    const [sum, notes, ledger, top] = await Promise.all([walk(at), notesOf(at), ledgerOf(at), readdir(at).catch(() => [] as string[])])
    studies.push({
      folder,
      files: sum.files,
      bytes: sum.bytes,
      changed: sum.changed ? new Date(sum.changed).toISOString() : null,
      notes,
      bundle: top.some((name) => /^bundle.*\.json$/i.test(name)),
      ledger,
    })
  }
  return NextResponse.json({ ok: true, studies }, { headers: HEADERS })
}
