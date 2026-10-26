"use client"

import { useCallback, useEffect, useState } from "react"
import { ForbiddenWithExit } from "@/components/node-state/open-on-this-computer.client"
import { Check, ExternalLink, Lock, Send, TerminalSquare, TriangleAlert } from "lucide-react"
import { Button, buttonVariants } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Small } from "@/components/ui/typography"
import { Spinner } from "@/components/ui/spinner"
import type { TelegramChannelWords } from "../words/telegram-channel.i18n"
import { CopyRow, Step, StepPoints } from "@/components/auth/setup-ladder.client"

// КАНАЛ TELEGRAM → CLAUDE CODE: ЧЕТЫРЕ СТУПЕНИ, КАК В ПАМЯТИ (267-3).
//
// 🔒 ПОРЯДОК И ПОВЕДЕНИЕ — ОДИН В ОДИН С `fractera-memory-starter/app/[lang]/build/_components/build-channel.client.tsx`
// (слово владельца 2026-09-22: «сделай ровно точно также»): BotFather → токен → активация одним нажатием →
// работа. ✗ Первая редакция разошлась с ним на ступени 3: ссылку надо было «получить» отдельной кнопкой,
// ожидание начиналось сразу, а запуск канала был ещё одной ступенью. Владелец: «здесь был процесс который
// вызывал Telegram прямо в браузере и перебрасывал меня туда… почему ты проигнорировал».
// 🔒 КАК В ПАМЯТИ: ссылка с меткой берётся у узла, как только ступень открылась; большая кнопка — это ссылка,
// она перебрасывает в Telegram; после нажатия START узел впускает человека и присылает сообщение о состоянии.
// 🔒 РЕШЕНИЕ ВЛАДЕЛЬЦА 2026-09-22: бот работает в сессии терминала, запуск и остановка — только во вкладке
// «Терминал». Ступень 4 лишь показывает состояние карточкой: жёлтая — терминал неактивен, зелёная — всё, что
// человек пишет в Telegram, видно в терминале. Кнопок «Запустить/Остановить канал» здесь нет.
// 🔒 Ступени — общий модуль узла (`setup-ladder.client.tsx`), как у экранов Google и Resend.

const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? ""
// 🔒 ДВЕРИ И СОКЕТ — В МАРШРУТЕ СЛУЖБЫ (271): `/{lang}/architect/<служба>/agent-api/*` и `/pty/<служба>`.
const BOTFATHER = "https://t.me/BotFather"
const POLL_MS = 3000

type State = {
  configured: boolean
  tail: string | null
  botUsername: string | null
  allowed: number
  running: boolean
  terminalWithoutChannel: boolean
  suggestion: { name: string; username: string }
  // 547: пути разделов агента от узла — у рождённого элемента они под его адресом и build/.
  links?: { terminal: string; subscription: string }
}

function Locked({ text }: { text: string }) {
  return (
    <p className="mt-2 flex items-center gap-2 text-muted-foreground text-sm">
      <Lock className="size-4 shrink-0" aria-hidden />
      {text}
    </p>
  )
}

// 552-6: `slot` — ещё один бот элемента (`h2h` · `orders` · `work`, `_agent-kit/server/telegram-slots.cjs`): те же ступени 1–3, а
// ступень 4 без терминала — как с ботом работать, владелец решит потом. Без `slot` — бот H2A, как прежде.
export function TelegramChannel({ service, lang, words, slot }: { service: string; lang: string; words: TelegramChannelWords; slot?: string }) {
  const door = `${BASE}/${lang}/architect/${service}/agent-api/channel${slot ? `?slot=${slot}` : ""}`
  const [state, setState] = useState<State | null | "forbidden">(null)
  const [token, setToken] = useState("")
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [activationUrl, setActivationUrl] = useState("")
  const [clicked, setClicked] = useState(false)
  const [justActivated, setJustActivated] = useState(false)

  const load = useCallback(async () => {
    try {
      const res = await fetch(door, { cache: "no-store" })
      if (res.status === 401 || res.status === 403) return setState("forbidden")
      setState((await res.json()) as State)
    } catch {
      setError(words.errors.network)
    }
  }, [door, words.errors.network])

  useEffect(() => {
    load()
  }, [load])

  const post = useCallback(
    async (action: string, extra: Record<string, unknown> = {}) => {
      setBusy(action)
      setError(null)
      try {
        const res = await fetch(door, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ action, ...extra, ...(slot ? { slot } : {}) }),
        })
        const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string } & Record<string, unknown>
        if (!data.ok) setError(words.errors[data.error ?? ""] ?? words.errors.network)
        return data
      } catch {
        setError(words.errors.network)
        return { ok: false } as { ok: boolean } & Record<string, unknown>
      } finally {
        setBusy(null)
      }
    },
    [door, slot, words.errors],
  )

  const configured = state !== null && state !== "forbidden" && state.configured && !!state.botUsername
  const activated = state !== null && state !== "forbidden" && state.allowed > 0

  // ── АКТИВАЦИЯ: ссылка берётся сама, как только ступень открылась (как в памяти) ──
  useEffect(() => {
    if (!configured || activated || activationUrl) return
    void (async () => {
      const r = await fetch(door, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "activation-link", ...(slot ? { slot } : {}) }),
      }).catch(() => null)
      const j = (await r?.json().catch(() => null)) as { ok?: boolean; url?: string } | null
      if (j?.ok && j.url) setActivationUrl(j.url)
    })()
  }, [configured, activated, activationUrl, door, slot])

  // Адреса разделов — от адреса, на котором открыта страница: на своём домене это публичная ссылка, которую
  // человек откроет с телефона.
  // Узел хранит тексты системного сообщения: он отвечает боту и тогда, когда эта страница закрыта.
  useEffect(() => {
    // 552-6: тексты системного сообщения — только бота H2A; бот ячейки отвечает своей строкой (`telegram-slots.cjs`).
    if (!configured || slot) return
    const base = `${window.location.origin}${BASE}/${lang}`
    // `configured` уже сузил `state` до `State` (✗ 547: сравнение с "forbidden" здесь — ошибка типов, сборка упала).
    const links = state.links ?? { terminal: `/architect/${service}/terminal`, subscription: `/architect/${service}/claude-code` }
    const fill = (t: string) => t.replace("{subscription}", `${base}${links.subscription}`).replace("{terminal}", `${base}${links.terminal}`)
    void fetch(door, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        action: "messages",
        // 411: язык этой страницы — начальный язык человека в Telegram элемента.
        messages: { active: fill(words.msgActive), inactive: fill(words.msgInactive), noSubscription: fill(words.msgNoSubscription), lang },
      }),
    }).catch(() => null)
  }, [configured, door, slot, service, lang, words.msgActive, words.msgInactive, words.msgNoSubscription])

  // Допуск делает узел сам; страница каждые 3 с спрашивает состояние — и нажатие START, и запуск или
  // остановку терминала человек видит здесь без перезагрузки.
  const wasActivated = activated
  useEffect(() => {
    if (!configured) return
    const t = setInterval(() => void load(), POLL_MS)
    return () => clearInterval(t)
  }, [configured, load])
  useEffect(() => {
    if (clicked && wasActivated) setJustActivated(true)
  }, [clicked, wasActivated])

  // Открывшаяся ступень прокручивается в поле зрения — иначе «ничего не происходит» (урок памяти).
  const stage = activated ? 4 : configured ? 3 : 0
  useEffect(() => {
    if (!stage) return
    document.querySelector(`[data-telegram-channel] [data-step="${stage}"]`)?.scrollIntoView({ behavior: "smooth", block: "center" })
  }, [stage])

  const saveToken = async () => {
    const r = await post("token", { token: token.trim() })
    // 🛑 Секрет живёт в поле ровно до отправки — в любом исходе.
    setToken("")
    if (r.ok) load()
  }

  if (state === "forbidden") return <ForbiddenWithExit reason={words.forbidden} why={words.exitWhy} open={words.exitOpen} />
  if (state === null) return <p className="my-6 text-muted-foreground text-sm">{words.loading}</p>

  const terminalHref = `/${lang}${state.links?.terminal ?? `/architect/${service}/terminal`}`

  return (
    <div className="my-6 flex flex-col gap-3" data-telegram-channel data-running={state.running ? "1" : "0"}>
      <p className="text-muted-foreground text-sm">{words.intro}</p>

      <Step n={1} title={words.step1Title}>
        <p className="text-muted-foreground text-sm">
          {/* Команду человек набирает в Telegram дословно — поэтому она выделена фоном (слово владельца: «/newbot need select with bg»). */}
          {words.step1Text.split("{cmd}")[0]}
          <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-foreground text-xs">/newbot</code>
          {words.step1Text.split("{cmd}")[1]}
        </p>
        <StepPoints items={words.step1Points} />
        <CopyRow id="tg-name" label={words.nameLabel} value={state.suggestion.name} copy={words.copy} copied={words.copied} />
        <CopyRow id="tg-username" label={words.usernameLabel} value={state.suggestion.username} copy={words.copy} copied={words.copied} />
        <div className="mt-3">
          <a href={BOTFATHER} target="_blank" rel="noreferrer noopener" className={buttonVariants({ variant: "outline" })}>
            {words.openBotFather}
            <ExternalLink className="ml-2 size-4" aria-hidden />
          </a>
        </div>
      </Step>

      <Step n={2} title={words.step2Title}>
        <p className="text-muted-foreground text-sm">{words.step2Text}</p>
        {configured && (
          <p className="mt-2 text-foreground text-sm" data-tg-bot>
            {words.tokenSaved.replace("{username}", state.botUsername ?? "").replace("{tail}", state.tail ?? "")}
          </p>
        )}
        <div className="mt-3 flex flex-col gap-1">
          <Label htmlFor="tg-token">{words.tokenLabel}</Label>
          <Input
            id="tg-token"
            type="password"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            autoComplete="off"
            spellCheck={false}
            className="font-mono text-xs"
          />
          <Small className="text-muted-foreground">{words.tokenHint}</Small>
        </div>
        <div className="mt-3">
          <Button type="button" onClick={saveToken} disabled={busy !== null || !token.trim()}>
            {busy === "token" && <Spinner className="size-4" />}
            {busy === "token" ? words.saving : words.saveToken}
          </Button>
        </div>
      </Step>

      <Step n={3} title={words.step3Title}>
        <p className="text-muted-foreground text-sm">{words.step3Text}</p>
        {!configured ? (
          <Locked text={words.locked} />
        ) : activated ? (
          <p className="mt-2 flex items-center gap-2 text-foreground text-sm" role="status">
            <Check className="size-4 shrink-0" aria-hidden />
            {justActivated ? words.activated : words.allowedCount.replace("{n}", String(state.allowed))}
          </p>
        ) : (
          <div className="mt-3 flex flex-col gap-2">
            {activationUrl ? (
              // 🔒 БОЛЬШАЯ КНОПКА — ЭТО ССЫЛКА: она перебрасывает прямо в Telegram, как в памяти.
              <a
                href={activationUrl}
                target="_blank"
                rel="noreferrer"
                onClick={() => setClicked(true)}
                className={`${buttonVariants({ size: "lg" })} w-full`}
                data-activate
              >
                <Send className="size-5" aria-hidden />
                {words.activateBtn}
              </a>
            ) : (
              <p className="flex items-center gap-2 text-muted-foreground text-sm">
                <Spinner className="size-4" />
                {words.loading}
              </p>
            )}
            <p className="flex items-center gap-2 text-muted-foreground text-sm" data-activate-wait>
              {clicked && <Spinner className="size-4" />}
              {clicked ? words.activateWaiting : words.activateHint}
            </p>
          </div>
        )}
      </Step>

      <Step n={4} title={words.step4Title}>
        {!activated ? (
          <Locked text={words.locked} />
        ) : slot ? (
          <div className="flex flex-col gap-3" data-tg-slot={slot}>
            <p className="text-muted-foreground text-sm">{words.slotStep4Text}</p>
            {state.botUsername && (
              <div>
                <a href={`https://t.me/${state.botUsername}`} target="_blank" rel="noreferrer" className={buttonVariants({})} data-open-bot>
                  <Send className="size-4" aria-hidden />
                  {words.openChat} @{state.botUsername}
                </a>
              </div>
            )}
            <Small className="text-muted-foreground" data-allowed>
              {words.allowedCount.replace("{n}", String(state.allowed))}
            </Small>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <p className="text-muted-foreground text-sm">{words.step4Text}</p>

            {/* 🔒 СОСТОЯНИЕ — ОДНОЙ КАРТОЧКОЙ, КНОПКА ВЕДЁТ В ТЕРМИНАЛ (решение владельца 2026-09-22). */}
            <div
              className={
                state.running
                  ? "flex gap-2 rounded-md border border-tone-data/50 bg-tone-data/10 px-3 py-2 text-sm"
                  : "flex gap-2 rounded-md border border-warning/50 bg-warning/10 px-3 py-2 text-sm"
              }
              data-tg-state={state.running ? "active" : "inactive"}
              role="status"
            >
              {state.running ? (
                <Check className="mt-0.5 size-4 shrink-0 text-tone-data" aria-hidden />
              ) : (
                <TriangleAlert className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden />
              )}
              <div className="flex flex-col gap-2">
                <p>{state.running ? words.cardActive : state.terminalWithoutChannel ? words.cardWithoutChannel : words.cardInactive}</p>
                <div>
                  <a href={terminalHref} className={buttonVariants({ size: "sm", variant: "outline" })} data-open-terminal>
                    <TerminalSquare className="size-4" aria-hidden />
                    {words.openTerminal}
                  </a>
                </div>
              </div>
            </div>

            {state.botUsername && (
              <div>
                <a href={`https://t.me/${state.botUsername}`} target="_blank" rel="noreferrer" className={buttonVariants({})} data-open-bot>
                  <Send className="size-4" aria-hidden />
                  {words.openChat} @{state.botUsername}
                </a>
              </div>
            )}

            <Small className="text-muted-foreground" data-allowed>
              {words.allowedCount.replace("{n}", String(state.allowed))}
            </Small>
            <StepPoints items={words.notes} />
          </div>
        )}
      </Step>

      {error && (
        <p className="rounded-lg border border-destructive/40 px-4 py-3 text-destructive text-sm" role="status" data-tg-error>
          {error}
        </p>
      )}
    </div>
  )
}
