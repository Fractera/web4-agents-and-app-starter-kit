// @api the person's yes to the folder trust question of an element agent
import { timingSafeEqual } from "node:crypto"
import { NextRequest, NextResponse } from "next/server"

// ДОВЕРИЕ ПАПКЕ — ОТВЕТ ЧЕЛОВЕКА (шаг 604; владелец 2026-10-26: «Достаточно будет просто отправить запрос … вопрос задается один раз
// в случае подтверждения больше не повторяется пользователи говорить да хоккей подтверждаю и всё»). POST `{ service }` с ключом узла
// (`X-Node-Key`) — агент элемента стоит на вопросе Claude Code «Is this a project you trust?», человек согласился в чате главного
// агента, и мост нажимает «Yes, I trust this folder», как человек в терминале. Зовёт её главный агент (`npm run trust -- <id>`) только
// после согласия человека. Вопроса на экране нет — `{ ok:false, reason:"not-waiting" }`; сессии нет — `"no-session"`.
export const dynamic = "force-dynamic"

const HEADERS = { "Cache-Control": "no-store" }

type Trust = (key: string) => (Record<string, unknown> & { ok: boolean }) | Promise<Record<string, unknown> & { ok: boolean }>

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
  let body: { service?: unknown }
  try { body = await req.json() } catch {
    return NextResponse.json({ ok: false, reason: "invalid JSON" }, { status: 400, headers: HEADERS })
  }
  const service = typeof body.service === "string" ? body.service.trim() : ""
  // Ключ сессии: id элемента или `<id>--work` (сессия рабочего процесса, 552-4).
  if (!/^[a-z][a-z0-9-]{0,39}$/.test(service)) {
    return NextResponse.json({ ok: false, reason: "service must be an element id" }, { status: 400, headers: HEADERS })
  }
  const trust = (globalThis as { __web4AgentTrust?: Trust }).__web4AgentTrust
  if (typeof trust !== "function") {
    return NextResponse.json({ ok: false, reason: "agent kits are not mounted in this process" }, { status: 503, headers: HEADERS })
  }
  const out = await trust(service)
  console.log(`[agents/trust] ${service} → ${out.ok ? "trusted" : out.reason}`)
  return NextResponse.json(out, { status: out.ok ? 200 : out.reason === "no-agent-kit" ? 404 : 409, headers: HEADERS })
}
