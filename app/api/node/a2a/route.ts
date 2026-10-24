// @api find which node element can do a job and where
import { timingSafeEqual } from "node:crypto"
import { NextRequest, NextResponse } from "next/server"
import { requireRoles } from "@/lib/auth/require-roles"
import { findEntries, nodeEntries } from "@/lib/a2a/node-registry"
import { telegramConnected } from "@/lib/a2a/telegram-relay"

// ДВЕРЬ «НАЙТИ / ПОЛУЧИТЬ» РЕЕСТРА A2A УЗЛА (шаг 406-6). Ядро — центр обнаружения; вызов соседа идёт напрямую по адресу из
// ответа. `?q=<слова или способность>` — до 10 записей (уровень 1) по убыванию совпадения; `?address=<адрес>` — одна запись;
// без параметров — все. Кто вправе: элемент узла с ключом узла (`X-Node-Key`) или архитектор/админ.
// Состояние записи: fresh — реестр совпадает с визиткой; drift — визитка изменилась, а describe:publish не звали;
// unpublished — визитка есть, в реестре её нет; no-card — в реестре есть, визитки больше нет.
// `telegram` — подключён ли бот элемента (токен и допущенный), измеряется по его папке при запросе (408-5): реестр и визитка
// элемента читают одну и ту же папку, поэтому не расходятся.
export const dynamic = "force-dynamic"

function nodeKeyOk(given: string | null): boolean {
  const expected = process.env.SETTINGS_SECRET ?? ""
  if (!expected || !given) return false
  const a = Buffer.from(given)
  const b = Buffer.from(expected)
  return a.length === b.length && timingSafeEqual(a, b)
}

const withTelegram = <T extends { id: string }>(e: T) => ({ ...e, telegram: telegramConnected(e.id) })

export async function GET(req: NextRequest) {
  if (!nodeKeyOk(req.headers.get("x-node-key"))) {
    const denied = await requireRoles(req, ["architect", "admin"])
    if (denied) return denied
  }
  const q = req.nextUrl.searchParams.get("q")?.trim() ?? ""
  const address = req.nextUrl.searchParams.get("address")?.trim() ?? ""
  const limit = Number(req.nextUrl.searchParams.get("limit") ?? 10) || 10
  const headers = { "Cache-Control": "no-store" }
  if (address) {
    const e = nodeEntries().find((x) => x.address === address || x.id === address)
    return e ? NextResponse.json({ ok: true, entry: withTelegram(e) }, { headers }) : NextResponse.json({ ok: false, error: "not-found" }, { status: 404, headers })
  }
  if (q) {
    // 589-3: `off=1` — и выключенные элементы с навыками из визитки на диске (state "off"); так ищет только главный агент узла.
    const found = findEntries(q, limit, { withOff: req.nextUrl.searchParams.get("off") === "1" })
    // Не нашлось в узле ≠ не существует. 548-9 (владелец 2026-10-19): дальше — f2f, поиск целого элемента в сети Lagrix (пока
    // имитация), затем продуктовый квиз; у нативного элемента f2f нет — сразу квиз или новый элемент через главного агента.
    // 548-6 (2026-10-20): реестр написан по-английски — запрос без латиницы не находит ничего, даже когда элемент есть («вход на
    // сайт» не нашёл auth). Такому запросу — не сеть, а повтор английскими словами.
    const next = "next: a custom element searches the Lagrix network for a whole element (npm run f2f -- find <words>); then the product quiz (skill product-quiz), or ask the core's main agent for a new element"
    const outside = found.length ? null : /[a-z]/i.test(q) ? `not found in this node; ${next}` : `nothing found for these words: the node's registry is written in English — search again with English words (for example «sign in», «remove background»); if English finds nothing too — ${next}`
    return NextResponse.json({ ok: true, entries: found.map(withTelegram), outside }, { headers })
  }
  return NextResponse.json({ ok: true, entries: nodeEntries().map(withTelegram) }, { headers })
}
