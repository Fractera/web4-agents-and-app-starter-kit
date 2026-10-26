// @api set up the memory agent Telegram bot and read its state
import { NextRequest, NextResponse } from "next/server"

import { requireRoles } from "@/lib/auth/require-roles"
import { isTemporaryPublicAddress } from "@/lib/auth/temporary-address"
import { activationLink, channelState, isService, saveMessages, saveToken, startIdlePoller } from "../../_agent-kit/server/telegram.cjs"
import { isBornItem } from "../../_agent-kit/server/workspace.cjs"
import * as slots from "../../_agent-kit/server/telegram-slots.cjs"
import { writePassportField } from "@/lib/web4-items/passport-file"

// БОТ TELEGRAM АГЕНТА СЛУЖБЫ (267-3; в маршруте службы — 271).
// 🔒 ДВЕРЬ КОПИИ КОМПЛЕКТА АГЕНТА (271): шаблон `kits/_agent-kit/api/*/route.ts.tpl`, установщик подставил
// имя службы вместо `memory`. Живёт в маршруте службы — удалили папку службы, ушла и дверь.
// 🔒 ОБЩАЯ КОПИЯ ДЛЯ РОЖДЁННЫХ (326): метка `__BORN__` — имя элемента из адреса, только рождённого, иначе 404.
//
// 🔒 ТОКЕН НАРУЖУ НЕ ВОЗВРАЩАЕТСЯ НИКОГДА — только четыре последних знака, по ним человек узнаёт свой.
// 🛑 ТЕ ЖЕ ЗАМКИ, ЧТО У ТЕРМИНАЛА: роль архитектора и отказ на временном адресе.
// 🔒 ЗАПУСКА И ОСТАНОВКИ ЗДЕСЬ НЕТ: бот работает в сессии терминала службы, её запускают и останавливают
// только на странице «Терминал». Допуск по ссылке делает узел сам (`startIdlePoller`).
export const dynamic = "force-dynamic"

const INSTALLED: string = "memory"
const ROLES = ["architect", "admin"] as const
const noStore = { headers: { "Cache-Control": "no-store" } }
// Параметры маршрута — словарь строк: у обычной копии там только `lang`, у общей — ещё и `item` (так их принимает Next).
type Ctx = { params: Promise<Record<string, string>> }

/** Имя службы этой двери: подставленное установщиком, а у общей копии — из адреса, только рождённого элемента. */
async function serviceOf(ctx: Ctx): Promise<string | null> {
  if (INSTALLED !== "__BORN__") return INSTALLED
  const id = (await ctx.params)?.item ?? ""
  return isBornItem(id) ? id : null
}

async function guard(req: NextRequest) {
  if (isTemporaryPublicAddress(req)) return NextResponse.json({ ok: false, error: "temporary-address" }, { status: 403 })
  return requireRoles(req, ROLES)
}

const unknown = () => NextResponse.json({ ok: false, error: "unknown-service" }, { status: 404 })

// 552-6 (владелец 2026-10-20: «поднимем четыре телеграмма»; «remember about saving info to own service props»): `slot` — ещё один бот
// элемента с группами навыков (`h2h` · `orders` · `work`, `telegram-slots.cjs`); без него — бот H2A, как прежде. После сохранения
// токена боты элемента (без токенов) уходят в его паспорт полем `telegramBots`.
const badSlot = () => NextResponse.json({ ok: false, error: "unknown-slot" }, { status: 400 })

async function savePassport(service: string) {
  if (!slots.grouped(service)) return
  // В паспорт — только то, что не меняется само: ручка и имя; число допущенных живое, его отдаёт дверь ядра `/api/agents/telegram`.
  const bots = Object.fromEntries(Object.entries(slots.bots(service)).map(([slot, b]) => [slot, { username: b.username, name: b.name }]))
  await writePassportField(service, "telegramBots", bots).catch(() => false)
}

export async function GET(req: NextRequest, ctx: Ctx) {
  const denied = await guard(req)
  if (denied) return denied
  const service = await serviceOf(ctx)
  if (!service || !isService(service)) return unknown()
  const slot = req.nextUrl.searchParams.get("slot")
  if (slot) return slots.isExtra(slot) && slots.grouped(service) ? NextResponse.json({ ok: true, ...slots.state(service, slot) }, noStore) : badSlot()
  return NextResponse.json({ ok: true, ...channelState(service) }, noStore)
}

export async function POST(req: NextRequest, ctx: Ctx) {
  const denied = await guard(req)
  if (denied) return denied
  const service = await serviceOf(ctx)
  if (!service || !isService(service)) return unknown()
  const body = (await req.json().catch(() => null)) as { action?: string; token?: string; messages?: unknown; slot?: string } | null
  if (body?.slot) {
    const slot = body.slot
    if (!slots.isExtra(slot) || !slots.grouped(service)) return badSlot()
    if (body.action === "token") {
      const saved = await slots.saveToken(service, slot, body.token)
      if ((saved as { ok?: boolean })?.ok) await savePassport(service)
      return NextResponse.json(saved, noStore)
    }
    if (body.action === "activation-link") return NextResponse.json(slots.activationLink(service, slot), noStore)
    return NextResponse.json({ ok: false, error: "unknown-action" }, { status: 400 })
  }
  switch (body?.action) {
    case "token": {
      const saved = await saveToken(service, body.token)
      // 326: у общей копии опрос бота элемента, рождённого после старта узла, начинается здесь — по действию человека
      // (сохранил токен). Повторный вызов безвреден: опрос один на службу.
      if (INSTALLED === "__BORN__" && (saved as { ok?: boolean })?.ok) startIdlePoller(service)
      if ((saved as { ok?: boolean })?.ok) await savePassport(service)
      return NextResponse.json(saved, noStore)
    }
    case "activation-link":
      return NextResponse.json(activationLink(service), noStore)
    case "messages":
      return NextResponse.json(saveMessages(service, body.messages), noStore)
    default:
      return NextResponse.json({ ok: false, error: "unknown-action" }, { status: 400 })
  }
}
