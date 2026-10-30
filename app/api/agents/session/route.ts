// @api clear an agent session's context or switch its model, after the agent's current turn
import { timingSafeEqual } from "node:crypto"
import { NextRequest, NextResponse } from "next/server"

// КОМАНДЫ СЕССИИ АГЕНТА (шаг 620; владелец 2026-10-30: «нужна команда очистки контекста … нужна команда для переключения на модель
// Opus … Sonnet … haiku»). POST `{ service, action: "clear" }` или `{ service, action: "model", model: "opus" | "sonnet" | "haiku" }` с
// ключом узла (`X-Node-Key`). Зовёт её главный агент командой `npm run session` по слову человека. Дверь только ставит действие:
// мост выполняет его после конца хода, в котором агент ответил человеку (`_agent-kit/server/bridge.cjs` → `sessionCommand`).
// Заполнение контекста дверь не считает — его читает сама команда из журнала сессии.
export const dynamic = "force-dynamic"

const HEADERS = { "Cache-Control": "no-store" }

type SessionCommand = (service: string, opts: { action?: string; model?: string }) => Record<string, unknown> & { ok: boolean }

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
  let body: { service?: unknown; action?: unknown; model?: unknown }
  try { body = await req.json() } catch {
    return NextResponse.json({ ok: false, reason: "invalid JSON" }, { status: 400, headers: HEADERS })
  }
  const service = typeof body.service === "string" ? body.service.trim() : ""
  if (!/^[a-z][a-z0-9-]{0,39}$/.test(service)) {
    return NextResponse.json({ ok: false, reason: "service must be an element id" }, { status: 400, headers: HEADERS })
  }
  const action = typeof body.action === "string" ? body.action : ""
  const model = typeof body.model === "string" ? body.model : undefined
  const command = (globalThis as { __web4AgentSession?: SessionCommand }).__web4AgentSession
  if (typeof command !== "function") {
    return NextResponse.json({ ok: false, reason: "agent kits are not mounted in this process" }, { status: 503, headers: HEADERS })
  }
  const out = command(service, { action, model })
  console.log(`[agents/session] ${service} ${action}${model ? ` ${model}` : ""} → ${out.ok ? `scheduled ${out.scheduled}` : out.reason}`)
  const status = out.ok ? 200 : out.reason === "no-agent-kit" ? 404 : out.reason === "no-session" ? 409 : 400
  return NextResponse.json(out, { status, headers: HEADERS })
}
