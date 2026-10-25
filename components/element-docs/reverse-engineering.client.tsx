"use client"

import { useEffect, useRef, useState, type ReactNode } from "react"
import { CircleHelp, FileText, FolderSearch, Globe, ImagePlus, Plus, Trash2, X } from "lucide-react"

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Spinner } from "@/components/ui/spinner"
import { H2 } from "@/components/ui/typography"
import { VoiceControl } from "@/components/form/voice-control.client"
import { TerminalDrawer } from "@/_tools/terminal-drawer/client/terminal-drawer.client"
import type { TerminalDrawerWords, TerminalKit } from "@/_tools/terminal-drawer/types/terminal-drawer"

// «ПРОЕКТИРОВАНИЕ ПРОДУКТА → РЕВЕРС-ИНЖИНИРИНГ» (539-3; страница переделана 556-9 и 594-6). Одна страница ядра для каждого элемента.
//
// 556-9, владелец 2026-10-23: «Представь все просто в формате карточек аккордеон», «Чтобы рассказать подробнее сделай просто ? …
// всплывающую подсказку», «Наверно нужна кнопка начать Reverse инжиниринг … берём за основу привью которые делит экран правый на две
// части и справа появляется инструмент: терминал куда автоматически подставляется необходимый текст». Отсюда карточки «Адрес сайта» ·
// «Страница N» (адрес, что важно — голосом тоже, скриншоты в хранилище узла) · «+ Добавить ещё страницу».
// 594-6, владелец 2026-10-25: «работать он будет как ядро, но разборы он должен хранить внутри каждого элемента так как если мы
// запускаем Claude Code Agent из соответствующей папки все работаю он идёт внутри этой папки и чувствуют себя в ней как дома». Поэтому
// «Начать реверс-инжиниринг» открывает справа терминал агента ЭТОГО элемента с задачей прохода разбора («Build process, study: …» —
// мост узнаёт проход по этим словам), а ниже — разборы элемента: папки его `study/` с заметками агента и сводкой журнала обязательств
// REA (дверь `/api/node/studies`). Решения главного агента, потока «решение записано» и карточки входа больше нет: окно входа на сайт
// открывает сам агент элемента (`npm run study -- login <сайт>`) и говорит об этом в терминале рядом.
// Всё читается при открытии страницы и при сворачивании ящика — таймеров и опроса нет (запрет незаказанного поведения 2026-09-25).

const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? ""

export type ReverseEngineeringWords = {
  site: { title: string; lead: string; placeholder: string; help: string }
  page: {
    /** «{n}» is replaced. */
    title: string
    lead: string
    addressPlaceholder: string
    notePlaceholder: string
    upload: string
    uploading: string
    uploadFailed: string
    removeShot: string
    remove: string
    help: string
    /** The link under the microphone when the node has no OpenAI key. */
    voiceKey: string
  }
  addPage: string
  start: string
  helpLabel: string
  /** The task for the element's agent in its study pass. «{target}» is replaced; the pages follow it line by line. 🔒 It begins with
   *  «Build process, study:» in every language — the bridge picks the pass by these words. */
  task: string
  taskPages: string
  /** «{n}», «{address}» are replaced. */
  taskPage: string
  taskNoAddress: string
  /** «{links}» is replaced. */
  taskShots: string
  /** The drawer with the element's agent. */
  drawerElement: TerminalDrawerWords
  /** 594-6: the studies of this element — its `study/` folders. */
  studies: {
    title: string
    loading: string
    failed: string
    empty: string
    /** «{files}», «{size}», «{date}» are replaced. */
    files: string
    bundle: string
    noBundle: string
    /** «{status}», «{total}», «{open}» are replaced. */
    ledger: string
    noLedger: string
  }
  tool: {
    title: string
    install: string
    installNote: string
    starting: string
    running: string
    check: string
    nodeOld: string
    failed: string
    retry: string
  }
}

/** 594-6: one study of the element as the door `/api/node/studies` gives it — counts and the agent's notes, nothing of the studied site. */
export type StudyRow = {
  folder: string
  files: number
  bytes: number
  /** ISO time of the newest file of the folder. */
  changed: string | null
  /** The first lines of the agent's `notes.md`. */
  notes: string | null
  /** A canonical evidence bundle exported by the agent (`bundle*.json`). */
  bundle: boolean
  /** REA's ledger of obligations (`ledger.json`); «unreadable» — the file is there and is not a ledger. */
  ledger: { status: string; total: number; requiredOpen: number; verified: number } | null
}

type Shot = { id: string; url: string; name: string }
type PageInput = { key: number; address: string; note: string; shots: Shot[] }

const fill = (text: string, values: Record<string, string>) => text.replace(/\{(\w+)\}/g, (all, k: string) => values[k] ?? all)

function Help({ text, label }: { text: string; label: string }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button type="button" variant="ghost" size="icon" className="shrink-0" aria-label={label} data-rea-help>
          <CircleHelp className="size-4" aria-hidden />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="max-w-xs text-sm">{text}</PopoverContent>
    </Popover>
  )
}

/** Задача агенту элемента: цель и страницы — по строке на страницу, скриншоты ссылками хранилища узла. */
function composeTask(w: ReverseEngineeringWords, target: string, pages: PageInput[]): string {
  const lines = [fill(w.task, { target })]
  const filled = pages.filter((p) => p.address.trim() || p.note.trim() || p.shots.length)
  if (filled.length) {
    lines.push(w.taskPages)
    filled.forEach((p, i) => {
      let line = fill(w.taskPage, { n: String(i + 1), address: p.address.trim() || w.taskNoAddress })
      if (p.note.trim()) line += ` — ${p.note.trim().replace(/\s+/g, " ")}`
      if (p.shots.length) line += `. ${fill(w.taskShots, { links: p.shots.map((s) => s.url).join(" ") })}`
      lines.push(line)
    })
  }
  return lines.join("\n")
}

function PageCard({
  page,
  n,
  lang,
  item,
  w,
  helpLabel,
  keyHref,
  mediaLink,
  onChange,
  onRemove,
}: {
  page: PageInput
  n: number
  lang: string
  item: string
  w: ReverseEngineeringWords["page"]
  helpLabel: string
  keyHref: string
  mediaLink: (id: string) => string
  onChange: (next: PageInput) => void
  onRemove: () => void
}) {
  const fileRef = useRef<HTMLInputElement | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(false)

  async function upload(files: FileList | null) {
    if (!files?.length) return
    setBusy(true)
    setError(false)
    const added: Shot[] = []
    for (const file of Array.from(files)) {
      try {
        const form = new FormData()
        form.append("file", file)
        form.append("title", file.name)
        const r = await fetch(`${BASE}/api/media/upload`, { method: "POST", body: form })
        const j = (await r.json().catch(() => null)) as { ok?: boolean; item?: { id: string; url: string } } | null
        if (j?.ok && j.item) added.push({ id: j.item.id, url: mediaLink(j.item.id), name: file.name })
        else setError(true)
      } catch {
        setError(true)
      }
    }
    if (added.length) onChange({ ...page, shots: [...page.shots, ...added] })
    setBusy(false)
    if (fileRef.current) fileRef.current.value = ""
  }

  return (
    <AccordionItem value={`page-${page.key}`} data-rea-page={n}>
      <AccordionTrigger>
        <span className="flex items-center gap-2">
          <FileText className="size-4 text-muted-foreground" aria-hidden />
          {fill(w.title, { n: String(n) })}
        </span>
      </AccordionTrigger>
      <AccordionContent>
        <div className="flex flex-col gap-3">
          <div className="flex items-start gap-1">
            <p className="flex-1 pt-2 text-sm text-foreground">{w.lead}</p>
            <Help text={w.help} label={helpLabel} />
          </div>
          <Input
            value={page.address}
            placeholder={w.addressPlaceholder}
            onChange={(e) => onChange({ ...page, address: e.target.value })}
            inputMode="url"
            autoComplete="off"
            spellCheck={false}
            data-rea-page-address
          />
          <VoiceControl
            id={`rea-page-${page.key}-note`}
            variant="textarea"
            rows={3}
            value={page.note}
            onChange={(note) => onChange({ ...page, note })}
            lang={lang}
            placeholder={w.notePlaceholder}
            apiUrl={`${BASE}/api/transcribe?item=${encodeURIComponent(item)}`}
            keyHint={{ href: keyHref, label: w.voiceKey }}
          />
          {page.shots.length > 0 && (
            <ul className="flex flex-wrap gap-2" data-rea-shots={page.shots.length}>
              {page.shots.map((s) => (
                <li key={s.id} className="relative">
                  {/* eslint-disable-next-line @next/next/no-img-element -- снимок из хранилища узла, размеры неизвестны заранее */}
                  <img src={`${BASE}/api/media/${encodeURIComponent(s.id)}/file`} alt={s.name} className="size-20 rounded-md border border-border object-cover" />
                  <Button
                    type="button"
                    variant="secondary"
                    size="icon"
                    className="absolute -top-2 -right-2 size-6 rounded-full"
                    aria-label={w.removeShot}
                    onClick={() => onChange({ ...page, shots: page.shots.filter((x) => x.id !== s.id) })}
                  >
                    <X className="size-3" aria-hidden />
                  </Button>
                </li>
              ))}
            </ul>
          )}
          <input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={(e) => void upload(e.target.files)} data-rea-shot-input />
          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" variant="outline" className="gap-1.5" disabled={busy} onClick={() => fileRef.current?.click()} data-rea-upload>
              {busy ? <Spinner /> : <ImagePlus className="size-4" aria-hidden />}
              {busy ? w.uploading : w.upload}
            </Button>
            <Button type="button" variant="ghost" className="gap-1.5 text-muted-foreground" onClick={onRemove} data-rea-page-remove>
              <Trash2 className="size-4" aria-hidden />
              {w.remove}
            </Button>
          </div>
          {error && <p className="text-sm text-destructive" role="alert">{w.uploadFailed}</p>}
        </div>
      </AccordionContent>
    </AccordionItem>
  )
}

// РАЗБОРЫ ЭТОГО ЭЛЕМЕНТА (594-6). Папки `study/` элемента — записи REA, заметки агента, журнал обязательств; дверь отдаёт только счёт,
// размер, дату, первые строки заметок и сводку журнала — ничего из чужого сайта. Читаются при открытии страницы и при сворачивании
// ящика с терминалом (агент мог сохранить разбор, пока ящик был открыт).
function Studies({ item, lang, w, refresh }: { item: string; lang: string; w: ReverseEngineeringWords["studies"]; refresh: number }) {
  const [rows, setRows] = useState<StudyRow[] | "loading" | "failed">("loading")

  useEffect(() => {
    void (async () => {
      try {
        const r = await fetch(`${BASE}/api/node/studies?item=${encodeURIComponent(item)}`, { cache: "no-store" })
        const j = (await r.json().catch(() => null)) as { ok?: boolean; studies?: StudyRow[] } | null
        setRows(j?.ok ? j.studies ?? [] : "failed")
      } catch {
        setRows("failed")
      }
    })()
  }, [item, refresh])

  // Размер — словами языка страницы («128 kB», «104 МБ»): единицы даёт Intl, а не словарь.
  const size = (bytes: number) => {
    const mb = bytes >= 1024 * 1024
    const value = mb ? bytes / (1024 * 1024) : Math.max(bytes / 1024, bytes ? 0.1 : 0)
    try {
      return new Intl.NumberFormat(lang, { style: "unit", unit: mb ? "megabyte" : "kilobyte", unitDisplay: "short", maximumFractionDigits: 1 }).format(value)
    } catch {
      return `${value.toFixed(1)} ${mb ? "MB" : "KB"}`
    }
  }

  let body: ReactNode
  if (rows === "loading") body = <p className="inline-flex items-center gap-2 text-sm text-muted-foreground"><Spinner /> {w.loading}</p>
  else if (rows === "failed") body = <p className="text-sm text-destructive" role="alert" data-rea-studies="failed">{w.failed}</p>
  else if (!rows.length) body = <p className="text-sm text-muted-foreground" data-rea-studies="empty">{w.empty}</p>
  else {
    body = (
      <Accordion type="multiple" className="rounded-lg border border-border px-4" data-rea-studies={rows.length}>
        {rows.map((s, i) => (
          <AccordionItem key={s.folder} value={s.folder} className={i === rows.length - 1 ? "border-b-0" : undefined} data-rea-study={s.folder}>
            <AccordionTrigger>
              <span className="flex min-w-0 flex-wrap items-center gap-2 text-left">
                <FolderSearch className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                <span className="break-all font-medium text-foreground">{s.folder}</span>
                {s.ledger && (
                  <Badge variant={s.ledger.requiredOpen > 0 ? "outline" : "secondary"} data-rea-ledger-status={s.ledger.status}>
                    {s.ledger.status}
                  </Badge>
                )}
              </span>
            </AccordionTrigger>
            <AccordionContent>
              <div className="flex flex-col gap-2 text-sm text-foreground">
                <p className="text-muted-foreground">
                  {fill(w.files, { files: String(s.files), size: size(s.bytes), date: s.changed ? s.changed.slice(0, 10) : "—" })}
                </p>
                <p data-rea-bundle={s.bundle ? "yes" : "no"}>{s.bundle ? w.bundle : w.noBundle}</p>
                <p data-rea-ledger={s.ledger ? `${s.ledger.total}/${s.ledger.requiredOpen}` : "none"}>
                  {s.ledger
                    ? fill(w.ledger, { status: s.ledger.status, total: String(s.ledger.total), open: String(s.ledger.requiredOpen) })
                    : w.noLedger}
                </p>
                {s.notes && (
                  <pre className="max-h-64 overflow-auto whitespace-pre-wrap rounded-md bg-muted p-3 text-xs leading-relaxed" data-rea-notes>{s.notes}</pre>
                )}
              </div>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    )
  }

  return (
    <section className="flex flex-col gap-3" data-rea-studies-section>
      <H2 variant="ui">{w.title}</H2>
      {body}
    </section>
  )
}

// ПРОГРАММА REA. Установлена — на странице её не видно; нет — карточка сверху, потому что без неё разбор не начнётся.
type Status = {
  installed: boolean
  version: string | null
  node: { version: string; ok: boolean }
  install: { running?: boolean; ok?: boolean; error?: string } | null
}

function ToolNotice({ t }: { t: ReverseEngineeringWords["tool"] }) {
  const [status, setStatus] = useState<Status | null>(null)
  const [busy, setBusy] = useState(false)

  async function read() {
    try {
      const r = await fetch(`${BASE}/api/node/rea`, { cache: "no-store" })
      const j = (await r.json().catch(() => null)) as ({ ok?: boolean } & Partial<Status>) | null
      setStatus(j?.ok ? (j as Status) : null)
    } catch {
      setStatus(null)
    }
  }
  useEffect(() => {
    void read()
  }, [])

  async function install() {
    setBusy(true)
    try {
      const r = await fetch(`${BASE}/api/node/rea`, { method: "POST", cache: "no-store" })
      const j = (await r.json().catch(() => null)) as Partial<Status> | null
      if (j && j.installed !== undefined) setStatus(j as Status)
    } catch {
      /* следующее открытие страницы скажет правду */
    }
    setBusy(false)
  }

  if (!status || status.installed) return null
  let body: ReactNode
  if (status.install?.running) {
    body = (
      <div className="flex flex-wrap items-center gap-3" data-rea-state="running">
        <p className="inline-flex items-center gap-2 text-sm text-foreground"><Spinner /> {t.running}</p>
        <Button type="button" variant="outline" size="sm" onClick={() => { setBusy(true); void read().finally(() => setBusy(false)) }} disabled={busy}>{t.check}</Button>
      </div>
    )
  } else if (!status.node.ok) {
    body = <p className="text-sm text-destructive" role="alert" data-rea-state="node-too-old">{fill(t.nodeOld, { version: status.node.version })}</p>
  } else {
    const failed = status.install && status.install.ok === false
    body = (
      <div className="flex flex-wrap items-center gap-3" data-rea-state={failed ? "failed" : "not-installed"}>
        <Button type="button" onClick={install} disabled={busy} data-rea-install>{busy ? t.starting : failed ? t.retry : t.install}</Button>
        <p className="text-sm text-muted-foreground">{failed ? fill(t.failed, { error: status.install?.error ?? "" }) : t.installNote}</p>
      </div>
    )
  }
  return (
    <section className="flex flex-col gap-3 rounded-lg border border-border bg-muted p-4" data-rea-tool-notice>
      <p className="text-sm font-medium text-foreground">{t.title}</p>
      {body}
    </section>
  )
}

export function ReverseEngineering({ item, lang, words, kit }: { item: string; lang: string; words: ReverseEngineeringWords; kit: TerminalKit }) {
  const nextKey = useRef(2)
  const [target, setTarget] = useState("")
  const [pages, setPages] = useState<PageInput[]>([{ key: 1, address: "", note: "", shots: [] }])
  const [open, setOpen] = useState<string[]>(["site"])
  const [drawer, setDrawer] = useState<{ n: number; text: string } | null>(null)
  const [refresh, setRefresh] = useState(0)
  // Ссылка на скриншот для агента — через ядро на этом компьютере (`nodeUrl` двери `/api/domain/state`): хранилище напрямую отвечает
  // 401 без ключа узла (замерено 556-9), а ядро отдаёт файл. Нет ответа — адрес этой страницы.
  const [nodeUrl, setNodeUrl] = useState<string | null>(null)
  useEffect(() => {
    fetch(`${BASE}/api/domain/state`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { nodeUrl?: string | null } | null) => setNodeUrl(d?.nodeUrl ? d.nodeUrl.replace(/\/+$/, "") : null))
      .catch(() => setNodeUrl(null))
  }, [])
  const mediaLink = (id: string) => `${nodeUrl ?? window.location.origin}${BASE}/api/media/${encodeURIComponent(id)}/file`

  function addPage() {
    const key = nextKey.current++
    setPages((p) => [...p, { key, address: "", note: "", shots: [] }])
    setOpen((o) => [...o, `page-${key}`])
  }

  // 594-6: задача уходит агенту ЭТОГО элемента — спящему первым поручением, работающему окном вставки (551-7).
  function start() {
    const value = target.trim()
    if (!value) return
    setDrawer((d) => ({ n: (d?.n ?? 0) + 1, text: composeTask(words, value, pages) }))
  }

  return (
    <div className="my-4 flex flex-col gap-4 lg:flex-row lg:items-start" data-reverse-engineering>
      <div className="flex min-w-0 max-w-3xl flex-1 flex-col gap-8">
        <ToolNotice t={words.tool} />
        <div className="flex flex-col gap-4" data-rea-form>
          <Accordion type="multiple" value={open} onValueChange={setOpen} className="rounded-lg border border-border px-4" data-rea-cards>
            <AccordionItem value="site" data-rea-site>
              <AccordionTrigger>
                <span className="flex items-center gap-2">
                  <Globe className="size-4 text-muted-foreground" aria-hidden />
                  {words.site.title}
                </span>
              </AccordionTrigger>
              <AccordionContent>
                <div className="flex flex-col gap-3">
                  <div className="flex items-start gap-1">
                    <p className="flex-1 pt-2 text-sm text-foreground">{words.site.lead}</p>
                    <Help text={words.site.help} label={words.helpLabel} />
                  </div>
                  <Input
                    value={target}
                    placeholder={words.site.placeholder}
                    onChange={(e) => setTarget(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") start() }}
                    inputMode="url"
                    autoComplete="off"
                    spellCheck={false}
                    data-rea-target
                  />
                </div>
              </AccordionContent>
            </AccordionItem>
            {pages.map((p, i) => (
              <PageCard
                key={p.key}
                page={p}
                n={i + 1}
                lang={lang}
                item={item}
                w={words.page}
                helpLabel={words.helpLabel}
                keyHref={kit.keyHref}
                mediaLink={mediaLink}
                onChange={(next) => setPages((all) => all.map((x) => (x.key === next.key ? next : x)))}
                onRemove={() => setPages((all) => all.filter((x) => x.key !== p.key))}
              />
            ))}
          </Accordion>
          <Button type="button" variant="outline" className="w-full justify-start gap-2 border-dashed" onClick={addPage} data-rea-add-page>
            <Plus className="size-4" aria-hidden />
            {words.addPage}
          </Button>
          <Button type="button" size="lg" className="self-start" disabled={!target.trim()} onClick={start} data-rea-start>
            {words.start}
          </Button>
        </div>
        <Studies item={item} lang={lang} w={words.studies} refresh={refresh} />
      </div>
      {drawer && (
        <TerminalDrawer
          key={drawer.n}
          service={item}
          lang={lang}
          words={words.drawerElement}
          kit={kit}
          text={drawer.text}
          start
          onCollapse={() => { setDrawer(null); setRefresh((n) => n + 1) }}
        />
      )}
    </div>
  )
}
