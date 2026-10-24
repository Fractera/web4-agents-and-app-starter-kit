// @api woken element agent reports work done or closes its terminal
import { timingSafeEqual } from "node:crypto"
import { NextRequest, NextResponse } from "next/server"

// КОНЕЦ РАБОТЫ ПРОБУЖДЁННОГО АГЕНТА (шаг 409-5; владелец 2026-10-05: «предложение закрыть», «Ответ текстом»). POST `{ service }`
// с ключом узла (`X-Node-Key`) — человеку в Telegram элемента «Работа закончена. Закрыть терминал? Ответьте «закрыть»»; POST
// `{ service, close: true }` — агент получил «закрыть» и закрывает свой терминал (остановка через 1,5 с, после ответа двери).
// Бота нет — `{ ok:true, asked:0 }`, терминал не закрывается: закрывать без ответа человека нельзя. Исключение (592-3): сессию,
// которую включил главный агент (`data/node/woken-by-main.json`), у элемента без бота и без открытого терминала её «закончил»
// закрывает — `{ ok:true, closing:true, wokenByMain:true }`. Правило, как звать эту дверь, дописывается к первому тексту
// пробуждения (`_agent-kit/server/bridge.cjs` → `finishRule`).
export const dynamic = "force-dynamic"

const HEADERS = { "Cache-Control": "no-store" }

type Done = (service: string, opts: { close?: boolean; reviewed?: boolean }) => (Record<string, unknown> & { ok: boolean }) | Promise<Record<string, unknown> & { ok: boolean }>

function nodeKeyOk(given: string | null): boolean {
  const expected = process.env.SETTINGS_SECRET ?? ""
  if (!expected || !given) return false
  const a = Buffer.from(given)
  const b = Buffer.from(expected)
  return a.length === b.length && timingSafeEqual(a, b)
}

export async function POST(req: NextRequest) {
  if (!nodeKeyOk(req.headers.get("x-node-key"))) {
    return NextResponse.json({ ok: false, reason: "node key required (X-Node-Key)" }, { status: 401, headers: HEADERS })
  }
  let body: { service?: unknown; close?: unknown; reviewed?: unknown }
  try { body = await req.json() } catch {
    return NextResponse.json({ ok: false, reason: "invalid JSON" }, { status: 400, headers: HEADERS })
  }
  const service = typeof body.service === "string" ? body.service.trim() : ""
  if (!/^[a-z][a-z0-9-]{0,39}$/.test(service)) {
    return NextResponse.json({ ok: false, reason: "service must be an element id" }, { status: 400, headers: HEADERS })
  }
  const done = (globalThis as { __web4AgentDone?: Done }).__web4AgentDone
  if (typeof done !== "function") {
    return NextResponse.json({ ok: false, reason: "agent kits are not mounted in this process" }, { status: 503, headers: HEADERS })
  }
  // 410: `reviewed` — разбор в этой сессии уже был, вопрос «выключить?» придёт без предложения разбора.
  const out = await done(service, { close: body.close === true, reviewed: body.reviewed === true })
  console.log(`[agents/done] ${service} close=${body.close === true} → ${out.ok ? (out.closing ? "closing" : `asked ${out.asked}`) : out.reason}`)
  const status = out.ok ? 200 : out.reason === "no-agent-kit" ? 404 : 409
  return NextResponse.json(out, { status, headers: HEADERS })
}
