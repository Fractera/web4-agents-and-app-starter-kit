// @api keep the capability requests of the node elements
import { timingSafeEqual } from "node:crypto"
import { NextRequest, NextResponse } from "next/server"
import { requireRoles } from "@/lib/auth/require-roles"
import { createNeed, listNeeds, readNeed } from "@/lib/web4-items/needs.mjs"

// ЗАПРОСЫ ВОЗМОЖНОСТИ (шаг 589-2): POST — элемент своей командой `npm run need` с ключом узла (`X-Node-Key`) кладёт запрос «мне нужно
// то, чего у меня нет»; запись — `data/node/needs/<id>.json`, без модели. GET — запросы одного элемента (`?from=`) или один (`?id=`):
// узел (ключ) или архитектор. Будит главного агента не дверь, а команда элемента — тем же путём, что `ask-core`.

export const dynamic = "force-dynamic"

const HEADERS = { "Cache-Control": "no-store" }

function nodeKeyOk(given: string | null): boolean {
  const expected = process.env.SETTINGS_SECRET ?? ""
  if (!expected || !given) return false
  const a = Buffer.from(given)
  const b = Buffer.from(expected)
  return a.length === b.length && timingSafeEqual(a, b)
}

export async function POST(req: NextRequest) {
  if (!nodeKeyOk(req.headers.get("x-node-key"))) {
    return NextResponse.json({ ok: false, error: "node key required (X-Node-Key)" }, { status: 401, headers: HEADERS })
  }
  const body = (await req.json().catch(() => null)) as { from?: unknown; need?: unknown; use?: unknown } | null
  try {
    const need = createNeed(process.cwd(), { from: body?.from, need: body?.need, use: body?.use })
    return NextResponse.json({ ok: true, need }, { headers: HEADERS })
  } catch (e) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : String(e) }, { status: 400, headers: HEADERS })
  }
}

export async function GET(req: NextRequest) {
  if (!nodeKeyOk(req.headers.get("x-node-key"))) {
    const denied = await requireRoles(req, ["architect"])
    if (denied) return denied
  }
  const id = req.nextUrl.searchParams.get("id")
  if (id) {
    const need = readNeed(process.cwd(), id)
    return need
      ? NextResponse.json({ ok: true, need }, { headers: HEADERS })
      : NextResponse.json({ ok: false, error: "no such need" }, { status: 404, headers: HEADERS })
  }
  const from = req.nextUrl.searchParams.get("from")
  return NextResponse.json({ ok: true, needs: listNeeds(process.cwd(), { from: from || null }) }, { headers: HEADERS })
}
