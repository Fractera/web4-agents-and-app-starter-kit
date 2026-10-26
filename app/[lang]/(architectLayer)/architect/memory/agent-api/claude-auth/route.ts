// @api tell the memory agent page whether this machine has a Claude subscription
import { NextRequest, NextResponse } from "next/server"

import { requireRoles } from "@/lib/auth/require-roles"
import { isTemporaryPublicAddress } from "@/lib/auth/temporary-address"
import { claudeAuthState } from "../../_agent-kit/server/claude-cli.cjs"

// СОСТОЯНИЕ ПОДПИСКИ CLAUDE CODE (267-2). Подписка одна на машину — у всех служб ответ одинаковый.
// 🔒 ДВЕРЬ КОПИИ КОМПЛЕКТА АГЕНТА (271): шаблон `kits/_agent-kit/api/*/route.ts.tpl`, установщик подставил
// имя службы вместо `memory`. Живёт в маршруте службы — удалили папку службы, ушла и дверь.
//
// 🔒 ОТВЕЧАЕТ САМ `claude auth status`, А НЕ НАША ПАМЯТЬ О ТОМ, ЧТО ЧЕЛОВЕК ВХОДИЛ: вход живёт в папке
// `~/.claude` машины и меняется без нашего ведома (выход в другом терминале, истёкший токен).
// 🛑 Почта учётной записи — сведения о владельце: дверь закрыта ролью архитектора и отказывает на
// временном адресе, как двери терминала.
export const dynamic = "force-dynamic"

const ROLES = ["architect", "admin"] as const

export async function GET(req: NextRequest) {
  if (isTemporaryPublicAddress(req)) return NextResponse.json({ ok: false, reason: "temporary-address" }, { status: 403 })
  const denied = await requireRoles(req, ROLES)
  if (denied) return denied
  return NextResponse.json({ ok: true, ...claudeAuthState() }, { headers: { "Cache-Control": "no-store" } })
}
