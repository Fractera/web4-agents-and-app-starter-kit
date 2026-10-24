import "server-only"
import { existsSync, readFileSync } from "node:fs"
import { join } from "node:path"
import paths from "@/lib/web4-items/paths.cjs"
import { listServices, serviceUrl } from "@/lib/microservices/registry"
import { fingerprintOf, messengersOf, passportProblems, registryEntryOf } from "@/lib/a2a/passport.mjs"
import { addressOf } from "@/lib/web4-items/address-file.mjs"
import elementProps from "@/lib/web4-items/element-props.cjs"
import power from "@/lib/web4-items/element-power.cjs"

// РЕЕСТР A2A УЗЛА — ЯДРО КАК ЦЕНТР ОБНАРУЖЕНИЯ (шаг 406-6; владелец 2026-10-05: «центр … это будет ядро»; вызов — напрямую,
// ядро подсказывает адрес). Запись элемента (уровень 1) выводится из его визитки и пишется в реестр при `describe:publish`
// вместе с отпечатком; живая визитка с другим отпечатком = «расходится». Поиск — по словам и тегам, до 10 записей; полная
// визитка — по адресу `/.well-known/agent-card.json` самого элемента.

type Entry = {
  address: string; name: string; description: string
  skills: { id: string; tags: string[] }[]
  hasCatalog: boolean; visibility: string; fingerprint: string; card: string | null
  // 472: H2A · H2H · A2A — какие способы связи есть у элемента; в выдаче всегда из живого паспорта (отпечаток считает только визитку).
  messengers?: { h2a: boolean; h2h: boolean; a2a: boolean }
}
// "role" — службы без визитки A2A (auth, data, config, design …): в поиске её представляет одна роль в узле (548-6).
// "off" — выключенный элемент с визиткой на диске (589-3): только в поиске главного агента, `off` — причина по-английски.
export type NodeEntry = Entry & { id: string; url: string | null; state: "fresh" | "drift" | "unpublished" | "no-card" | "role" | "off"; off?: string }

type Props = { id?: string; summary?: string; a2a?: { card?: unknown } }

function elementFolder(id: string, kind: string): string {
  return paths.itemDir(id, kind)
}

/** Визитка элемента с диска или null. */
export function readPassport(id: string, kind: string): Props | null {
  // 417: старый корневой файл или новая раскладка (визитка собирается из паспорта и A2A-CARD.json).
  return elementProps.readElementProps(elementFolder(id, kind)) as Props | null
}

/** Запись уровня 1 из визитки для реестра; null — визитки нет или она не проходит стандарт. */
export function entryForRegistry(id: string, kind: string): Entry | null {
  const p = readPassport(id, kind)
  if (!p?.a2a?.card) return null
  const { problems } = passportProblems(p) as { problems: string[] }
  if (problems.length) return null
  const url = serviceUrl(id)
  return registryEntryOf(p, { address: addressOf(id), cardUrl: url ? `${url}/.well-known/agent-card.json` : null }) as Entry
}

/** Все элементы узла с их записями и состоянием свежести. */
export function nodeEntries(): NodeEntry[] {
  const out: NodeEntry[] = []
  for (const s of listServices() as unknown as { id: string; kind?: string; a2a?: Entry; off?: unknown }[]) {
    // 567: выключенный элемент соседям не предлагается — его порт молчит намеренно.
    if (power.isOff(s)) continue
    const kind = s.kind === "user" ? "user" : "core"
    const live = readPassport(s.id, kind)
    const url = serviceUrl(s.id)
    const stored = s.a2a ?? null
    if (!live?.a2a?.card) {
      if (stored) out.push({ ...stored, id: s.id, url, state: "no-card" })
      continue
    }
    const fp = fingerprintOf(live) as string
    const fresh = entryForRegistry(s.id, kind)
    if (!stored) { if (fresh) out.push({ ...fresh, id: s.id, url, state: "unpublished" }); continue }
    out.push({ ...stored, messengers: messengersOf(live) as Entry["messengers"], id: s.id, url, state: stored.fingerprint === fp ? "fresh" : "drift" })
  }
  return out
}

// 548-9: служебные слова не ищутся. ✗ Замерено 2026-10-19: «remove background from product photos» нашло три элемента, которые
// этого не умеют, — «from» совпало с «born from …» их описаний, а подстрока совпадала внутри чужих слов. Агент, получивший
// ложного кандидата, идёт договариваться с ним вместо f2f и квиза.
const STOP = new Set(["the", "and", "for", "from", "with", "that", "this", "into", "your", "you", "our", "its", "are", "can", "will",
  "need", "needs", "want", "make", "get", "all", "any", "some", "who", "what", "how", "please", "element", "elements",
  "для", "что", "как", "это", "мне", "нам", "его", "её", "или", "без", "при", "над", "под", "чтобы", "нужно", "надо", "хочу",
  "который", "которая", "которые", "элемент", "элемента", "элементы"])
// 548-6 (2026-10-20): начало слова совпадает, только если покрывает его почти целиком — «sign» не совпадает с «signals» (config и
// design всплывали на «sign in» тем же счётом, что auth); части слова через дефис ищутся и по отдельности («sign-in» → «sign»).
const wordsOf = (t: string) => t.toLowerCase().split(/[^\p{L}\p{N}-]+/u).flatMap((w) => (w.includes("-") ? [w, ...w.split("-")] : [w])).filter((w) => w.length > 2 && !STOP.has(w))
const near = (a: string, b: string) => {
  if (a === b) return true
  const [s, l] = a.length <= b.length ? [a, b] : [b, a]
  return s.length > 3 && l.startsWith(s) && s.length / l.length >= 0.7
}

// 548-6, повторная проверка (2026-10-20, замерено командой главного агента `npm run find`): «sign in» вернул graph, lagrix,
// template и native-template и не вернул auth; «design colours» не вернул design. Две причины: службы узла без визитки A2A
// (auth, data, config, design) в поиск не попадали вовсе, а навыки, которые стартер даёт каждому рождённому элементу
// (current-user, follow-settings, site-shell …), совпадали с любым запросом о входе или оформлении — они есть у всех и ничего не
// отличают. Теперь роль элемента в узле — часть поиска и весит больше описания; служба без визитки ищется по своей роли
// (`state: "role"`); навык, который есть не меньше чем у трёх элементов и у половины всех с визиткой, не считается (у маленького
// узла общий навык ещё может совпасть — роль и описание всё равно решают).
function nodeRoles(): Record<string, string> {
  // Те же два файла, что читает сводка проектов (`lib/web4-items/dashboard-rows.ts`): умолчания служб в git и назначенные на узле.
  const read = (p: string) => { try { return JSON.parse(readFileSync(p, "utf8")) as Record<string, unknown> } catch { return {} } }
  const all = { ...read(join(process.cwd(), "WEB4-ITEMS-REGISTRY", "roles.json")), ...read(join(process.cwd(), "data", "node", "roles.json")) }
  return Object.fromEntries(Object.entries(all).filter(([k, v]) => !k.startsWith("_") && typeof v === "string" && v.trim()).map(([k, v]) => [k, String(v).trim()]))
}

// 589-3 (✗ живой прогон 2026-10-24 18:52Z): элемент reverse попросил «list the recorded Stripe payments», и главный агент ответил «нет,
// строить в stripe» — у выключенного stripe поиск показал только роль, без навыков, хотя его визитка называет stripe-payments и дверь.
// Закон 567 («архитектура должна понимать что они есть но они выключены»): соседям выключенный элемент не предлагается, а главному
// агенту он нужен со своими навыками — иначе «нет» ложное, и узел строит дубль. Поэтому `withOff` — только для главного агента.
/** Визитки выключенных элементов с диска (состояние "off" и причина). */
function offEntries(): NodeEntry[] {
  const out: NodeEntry[] = []
  for (const s of listServices() as unknown as { id: string; kind?: string }[]) {
    const off = power.offOf(s)
    if (!off) continue
    const entry = entryForRegistry(s.id, s.kind === "user" ? "user" : "core")
    if (entry) out.push({ ...entry, id: s.id, url: serviceUrl(s.id), state: "off", off: power.reasonIn(off, "en") })
  }
  return out
}

/** Найти: до `limit` записей, где совпали значимые слова запроса (теги навыков и роль в узле весят больше слов описания). */
export function findEntries(query: string, limit = 10, { withOff = false }: { withOff?: boolean } = {}): (NodeEntry & { score: number })[] {
  const words = [...new Set(wordsOf(query))]
  if (!words.length) return []
  const roles = nodeRoles()
  const carded = withOff ? [...nodeEntries(), ...offEntries()] : nodeEntries()
  const seen = new Set(carded.map((e) => e.id))
  const roleOnly: NodeEntry[] = (listServices() as unknown as { id: string }[])
    .filter((s) => !seen.has(s.id) && roles[s.id])
    .map((s) => ({ address: addressOf(s.id), name: s.id, description: roles[s.id], skills: [], hasCatalog: false, visibility: "node", fingerprint: "", card: null, id: s.id, url: serviceUrl(s.id), state: "role" as const }))
  const count = new Map<string, number>()
  for (const e of carded) for (const id of new Set(e.skills.map((s) => s.id))) count.set(id, (count.get(id) ?? 0) + 1)
  const common = (id: string) => (count.get(id) ?? 0) >= 3 && (count.get(id) ?? 0) * 2 >= carded.length
  return [...carded, ...roleOnly]
    .map((e) => {
      const tags = [...new Set(e.skills.filter((s) => !common(s.id)).flatMap((s) => [s.id, ...s.id.split("-"), ...s.tags, ...s.tags.flatMap((t) => t.split("-"))]).map((t) => t.toLowerCase()))]
      const role = wordsOf(roles[e.id] ?? "")
      const text = wordsOf(`${e.name} ${e.description}`)
      const score = words.reduce((n, w) => n + (tags.includes(w) ? 3 : tags.some((t) => near(t, w)) ? 1 : 0) + (role.some((t) => near(t, w)) ? 2 : 0) + (text.some((t) => near(t, w)) ? 1 : 0), 0)
      return { ...e, ...(roles[e.id] ? { role: roles[e.id] } : {}), score }
    })
    .filter((e) => e.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, Math.max(1, Math.min(limit, 10)))
}
