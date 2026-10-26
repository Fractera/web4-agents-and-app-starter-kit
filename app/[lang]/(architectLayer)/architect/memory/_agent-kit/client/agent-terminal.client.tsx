"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { AlertTriangle, ChevronDown, ClipboardPaste, Eraser, Moon, Play, Square } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ForbiddenWithExit } from "@/components/node-state/open-on-this-computer.client"
import type { AppDialogUi } from "@/components/dialog/app-dialog.i18n"
import { bracketedPaste, cleanPaste, pasteFromSearch } from "./terminal-paste.mjs"
import { TerminalPasteDialog } from "@/_tools/terminal-paste/client/terminal-paste-dialog.client"
import type { AgentTerminalWords } from "../words/agent-terminal.i18n"
import { createMouseFilter, MOUSE_OFF } from "./mouse-filter.mjs"
import { type XtermHandle, XtermTerminal } from "./xterm-terminal.client"

// ТЕРМИНАЛ АГЕНТА УЗЛА: СПИТ ДО ЗАПУСКА, ЖИВЁТ ПРИ УХОДЕ, ОСТАНАВЛИВАЕТСЯ КНОПКОЙ (267-1).
//
// Перенос `fractera-memory-starter/app/[lang]/build/_components/build-terminal.client.tsx`.
// 🔒 СОН ПРОВЕРЯЕТСЯ ДВЕРЬЮ СОСТОЯНИЯ ДО ЛЮБОГО СОКЕТА: спит — серая карточка и ничего не открыто.
// 🔒 ЖИВУЧЕСТЬ — СВОЙСТВО СЕРВЕРА, А НЕ ОСТРОВКА: уход закрывает сокет, сессия остаётся и при возврате
// отдаёт накопленный экран.
// 🔒 ПАПКА АГЕНТА ПРИХОДИТ ИЗ ДВЕРИ, А НЕ ИЗ РАЗМЕТКИ: страница предрендерена, путь — факт о машине.

const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? ""
// 🔒 ДВЕРИ И СОКЕТ — В МАРШРУТЕ СЛУЖБЫ (271): `/{lang}/architect/<служба>/agent-api/*` и `/pty/<служба>`.

type State = "checking" | "sleeping" | "connecting" | "running" | "stopped" | "offline" | "forbidden"

// 336-4/5: `initialPaste` — готовый текст задачи (окно задачи блока в Preview): кладётся в окно вставки, окно НЕ открывается
// само — его открывает «Вставить». `keyHref` — поле ключа OpenAI для голоса в окне вставки (элемент — его вкладка, служба — ядра).
// `compact` — узкий терминал (ящик рядом с Preview): «Очистить» и «Остановить» — только значок, имя в подсказке; «Вставить»
// сохраняет значок и текст (слово владельца 2026-09-29).
// 552-4б: `mode="work"` — сессия рабочего процесса элемента («Рабочий процесс → Терминал»): дверь состояния `?mode=work`, ключ
// сессии и сокета — из её ответа (`<id>--work`, `lib/agent-kit/modes.cjs`), а не собирается здесь второй раз.
// 556-9: `startTask` — задача кнопкой «Начать …» на странице ядра (ящик `_tools/terminal-drawer`): то же, что ссылка `?paste=` (551-7) —
// спящему терминалу она уходит первым поручением, работающему — окном вставки, отправляет человек.
export function AgentTerminal({ service, lang, words, dialogUi, initialPaste, keyHref, compact = false, mode, startTask }: { service: string; lang: string; words: AgentTerminalWords; dialogUi: AppDialogUi; initialPaste?: string; keyHref?: string; compact?: boolean; mode?: "work"; startTask?: string }) {
  const api = `${BASE}/${lang}/architect/${service}/agent-api`
  const sessionUrl = `${api}/session${mode === "work" ? "?mode=work" : ""}`
  const keyRef = useRef(service)
  const [noModes, setNoModes] = useState(false)
  const [state, setState] = useState<State>("checking")
  const [note, setNote] = useState("")
  const [folder, setFolder] = useState<string | null | undefined>(undefined)
  const termRef = useRef<XtermHandle>(null)
  const wsRef = useRef<WebSocket | null>(null)
  const sizeRef = useRef({ cols: 120, rows: 32 })
  const mouseRef = useRef(createMouseFilter())
  // Закрытие, которое сделали мы сами, не должно читаться как обрыв связи.
  const quietCloseRef = useRef(false)
  // 316: окно вставки. Текст приходит кнопкой «Вставить» или ссылкой `?paste=` (адрес блока из подсветки Preview);
  // в работающий терминал он уходит ТОЛЬКО кнопкой человека в окне (спящему — вместе с запуском, 551-7 ниже).
  const [pasteOpen, setPasteOpen] = useState(false)
  const [pasteText, setPasteText] = useState(initialPaste ?? "")

  useEffect(() => { if (initialPaste) setPasteText(initialPaste) }, [initialPaste])

  // Владелец 2026-10-06: окно с поручением, открытое ссылкой, само будит агента — как вопрос в Telegram; иначе кнопки
  // «Вставить» серые, пока человек не найдёт кнопку запуска.
  // 551-7 (владелец 2026-10-20: «если терминал не активен автоматически при таком переходе активировать терминал и подтверждается
  // папка в которой находится агент и потом запускается этот процесс»): СПЯЩЕМУ терминалу задача уходит мосту вместе с запуском —
  // первым поручением агента, и вопрос доверия папке мост отвечает сам. Работающему — как прежде: окно вставки, кнопка человека.
  const taskForStartRef = useRef<string | null>(startTask ?? null)
  // Задача ушла с запуском, а сессия ещё не подтвердилась: отказ запуска (код 1008) возвращает её в окно вставки — не теряется.
  const taskPendingRef = useRef<string | null>(null)
  const [taskAtStart, setTaskAtStart] = useState(false)

  useEffect(() => {
    const incoming = pasteFromSearch(window.location.search)
    if (incoming === null) return
    taskForStartRef.current = incoming
    // Параметр убирается сразу: перезагрузка страницы не откроет окно второй раз.
    const url = new URL(window.location.href)
    url.searchParams.delete("paste")
    window.history.replaceState(null, "", url.pathname + url.search + url.hash)
  }, [])

  // Владелец 2026-10-06: курсор — в конце поручения, на новой строке: надиктованное дописывается под ним, а не перед ним.
  // Пока окно открыто, терминал фокус не забирает (иначе окно дёргается и курсор уходит).
  const pasteOpenRef = useRef(false)
  useEffect(() => {
    pasteOpenRef.current = pasteOpen
    if (!pasteOpen) return
    const t = window.setTimeout(() => {
      const el = document.getElementById("terminal-paste-text") as HTMLTextAreaElement | null
      if (!el) return
      el.focus()
      el.setSelectionRange(el.value.length, el.value.length)
      el.scrollTop = el.scrollHeight
    }, 80)
    return () => window.clearTimeout(t)
  }, [pasteOpen])

  const send = useCallback((payload: unknown) => {
    const ws = wsRef.current
    if (ws && ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(payload))
  }, [])

  const connect = useCallback(
    async (wantStart: boolean, task?: string) => {
      setState("connecting")
      setNote("")
      setTaskAtStart(false)
      let ticket = ""
      try {
        const res = await fetch(`${api}/ticket`, { method: "POST" })
        if (res.status === 401 || res.status === 403) {
          setState("forbidden")
          return
        }
        ticket = ((await res.json()) as { ticket?: string }).ticket ?? ""
      } catch {
        setState("offline")
        return
      }
      const scheme = window.location.protocol === "https:" ? "wss" : "ws"
      const ws = new WebSocket(`${scheme}://${window.location.host}${BASE}/pty/${keyRef.current}`)
      wsRef.current = ws
      quietCloseRef.current = false

      ws.onopen = () => {
        // 🛑 `init` ПЕРВЫМ ДЕЙСТВИЕМ: любое исключение до него съело бы его целиком, и мост закрыл бы
        // молчащее соединение — человек увидел бы чёрный экран (оплачено у чата, 157-3).
        ws.send(JSON.stringify({ mode: "agent", start: wantStart, ticket, type: "init", ...(task ? { task } : {}) }))
        if (task) {
          taskPendingRef.current = task
          setTaskAtStart(true)
        }
        ws.send(JSON.stringify({ type: "resize", ...sizeRef.current }))
        mouseRef.current = createMouseFilter()
        setState("running")
        termRef.current?.reset()
        termRef.current?.write(MOUSE_OFF)
        if (!pasteOpenRef.current) termRef.current?.focus()
      }
      ws.onmessage = (event) => {
        const chunk = typeof event.data === "string" ? event.data : new TextDecoder().decode(event.data)
        termRef.current?.write(mouseRef.current(chunk))
      }
      ws.onclose = (event) => {
        if (wsRef.current === ws) wsRef.current = null
        if (quietCloseRef.current) return
        const lost = taskPendingRef.current
        taskPendingRef.current = null
        if (lost !== null && event.code === 1008) {
          setTaskAtStart(false)
          setPasteText(lost)
          setPasteOpen(true)
          // Агент успел запуститься другим путём (пробуждение): подключиться к нему, задача ждёт в окне вставки.
          if (event.reason === "already-running") {
            void connect(false)
            return
          }
        }
        if (event.reason === "not-running") {
          setState("sleeping")
        } else if (event.reason === "stopped") {
          setState("stopped")
          setNote(words.stopped)
        } else if (event.reason === "exited") {
          setState("stopped")
          setNote(words.exited)
        } else {
          setState("offline")
          setNote(event.reason === "no-agent-dir" ? words.noFolder : words.offline)
        }
      }
    },
    [api, service, words.exited, words.noFolder, words.offline, words.stopped],
  )

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch(sessionUrl, { cache: "no-store" })
        if (cancelled) return
        if (res.status === 401 || res.status === 403) {
          setState("forbidden")
          return
        }
        const body = (await res.json()) as { running?: boolean; agentDir?: string | null; service?: string; reason?: string }
        if (cancelled) return
        if (body.reason === "no-modes") {
          setNoModes(true)
          return
        }
        if (body.service) keyRef.current = body.service
        setFolder(body.agentDir ?? null)
        const task = taskForStartRef.current
        taskForStartRef.current = null
        if (body.running) {
          await connect(false)
          // 551-7: работающему терминалу задача — окном вставки, отправляет человек.
          if (task !== null) {
            setPasteText(task)
            setPasteOpen(true)
          }
        } else if (task !== null) await connect(true, task)
        else setState("sleeping")
      } catch {
        if (!cancelled) setState("offline")
      }
    })()
    return () => {
      cancelled = true
      // Уход со страницы: закрываем только сокет — сессия на сервере продолжает работать.
      quietCloseRef.current = true
      wsRef.current?.close()
    }
  }, [connect, sessionUrl])

  const handleStop = useCallback(async () => {
    quietCloseRef.current = true
    try {
      await fetch(sessionUrl, {
        body: JSON.stringify({ action: "stop", ...(mode === "work" ? { mode } : {}) }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      })
    } catch {
      /* следующий заход на страницу скажет правду */
    }
    wsRef.current?.close()
    setState("stopped")
    setNote(words.stopped)
  }, [words.stopped, sessionUrl, mode])

  const handleClear = useCallback(() => {
    termRef.current?.reset()
    termRef.current?.focus()
  }, [])

  const handleData = useCallback((data: string) => send({ data, type: "stdin" }), [send])
  const handleResize = useCallback(
    (size: { cols: number; rows: number }) => {
      sizeRef.current = size
      send({ type: "resize", ...size })
    },
    [send],
  )

  const insertPaste = useCallback(
    (sendIt: boolean) => {
      const text = cleanPaste(pasteText)
      if (!text) return
      send({ data: bracketedPaste(text, sendIt), type: "stdin" })
      setPasteOpen(false)
      setPasteText("")
      termRef.current?.focus()
    },
    [pasteText, send],
  )

  if (state === "forbidden") {
    return <ForbiddenWithExit reason={words.forbidden} why={words.exitWhy} open={words.exitOpen} />
  }
  if (noModes) return <p className="my-6 text-sm text-muted-foreground" data-agent-terminal data-state="no-modes">{words.noModes}</p>

  const live = state === "running" || state === "connecting"

  return (
    <div className="my-6 flex flex-col gap-3" data-agent-terminal data-state={state}>
      <p className="text-sm">
        {words.folderLabel}{" "}
        {folder ? (
          <code className="break-all rounded bg-muted px-2 py-0.5 font-mono text-xs" data-agent-folder={folder}>
            {folder}
          </code>
        ) : folder === null ? (
          <span className="text-muted-foreground">{words.noFolder}</span>
        ) : (
          <span className="text-muted-foreground">…</span>
        )}
      </p>

      <p className="text-muted-foreground text-xs" data-agent-first-run>{words.firstRun}</p>

      {/* 🛑 ПРЕДУПРЕЖДЕНИЕ — ДО ТЕРМИНАЛА И СВЁРНУТЫМ, как в мастерской памяти: заголовок виден всегда,
          текст по раскрытию. `<details>` браузера — без лишнего островка. */}
      <details className="group rounded-lg border border-destructive/50 bg-destructive/5" data-agent-warning>
        <summary className="flex cursor-pointer list-none items-center gap-2 p-3 font-medium text-sm [&::-webkit-details-marker]:hidden">
          <AlertTriangle className="size-4 shrink-0" aria-hidden />
          <span className="flex-1">{words.warnTitle}</span>
          <ChevronDown className="size-4 shrink-0 transition-transform group-open:rotate-180" aria-hidden />
        </summary>
        <div className="px-4 pb-4 text-sm">
          <p>{words.warnBody}</p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-muted-foreground">
            {words.warnPoints.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
        </div>
      </details>

      {!live && (
        <div className="flex flex-col gap-3 rounded-lg border border-border border-dashed bg-muted/40 p-5 text-muted-foreground">
          <div className="flex items-center gap-2 font-medium text-foreground">
            <Moon className="size-4" aria-hidden />
            {state === "checking" ? "…" : words.sleepingTitle}
          </div>
          <p className="text-sm">{words.sleepingBody}</p>
          {note && <p className="text-sm">{note}</p>}
          <div>
            <Button disabled={state === "checking" || folder === null} onClick={() => connect(true)} type="button" data-agent-start>
              <Play className="size-4" aria-hidden />
              {words.start}
            </Button>
          </div>
        </div>
      )}

      {live && (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-2 rounded-md bg-muted px-2 py-1 text-xs">
              <span className="size-2 rounded-full bg-primary" aria-hidden />
              {state === "connecting" ? words.starting : words.running}
            </span>
            <span className="text-muted-foreground text-xs">{words.keepsRunning}</span>
            <div className="ml-auto flex gap-2">
              <Button onClick={() => setPasteOpen(true)} size="sm" type="button" variant="outline" data-agent-paste>
                <ClipboardPaste className="size-4" aria-hidden />
                {words.paste}
              </Button>
              <Button onClick={handleClear} size="sm" type="button" variant="outline" aria-label={words.clear} title={compact ? words.clear : undefined}>
                <Eraser className="size-4" aria-hidden />
                {!compact && words.clear}
              </Button>
              <Button onClick={handleStop} size="sm" type="button" variant="destructive" aria-label={words.stop} title={compact ? words.stop : undefined} data-agent-stop>
                <Square className="size-4" aria-hidden />
                {!compact && words.stop}
              </Button>
            </div>
          </div>
          {taskAtStart && <p className="text-muted-foreground text-xs" data-agent-task-at-start>{words.taskAtStart}</p>}
          <div className="h-[70dvh] min-h-[420px] overflow-hidden rounded-lg bg-[#0b0b0c] p-2">
            <XtermTerminal onData={handleData} onResize={handleResize} ref={termRef} autoFocus={!pasteOpen} />
          </div>
        </>
      )}

      <TerminalPasteDialog
        open={pasteOpen}
        onOpenChange={setPasteOpen}
        text={pasteText}
        onTextChange={setPasteText}
        live={live}
        lang={lang}
        words={words}
        dialogUi={dialogUi}
        voiceApiUrl={`${BASE}/api/transcribe?item=${encodeURIComponent(service)}`}
        keyHref={keyHref}
        onInsert={insertPaste}
      />
    </div>
  )
}
