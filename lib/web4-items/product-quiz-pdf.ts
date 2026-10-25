// PDF OF THE PRODUCT QUIZ (node step 575). The owner 2026-10-23: «Для продуктов квиз добавь кнопку скачать PDF, должна быть версия дата
// если мы сохраняем её отдельной версии в GitHub то ещё и версия Git которая позволяет откатиться к этой версии позже или просто найти её
// снова»; «and pdf must have screen shots».
// One HTML page for printing, built on the server from the quiz (`readProductQuiz`), the element's git and the screens of its references'
// studies. 594-6: the screens are the image files the element's agent saved in the study folder a reference names
// (`references.products[].study` → `study/<folder>/`, REA's `capture-web-screenshot` among them); before 594 they came from the reports of
// the element `reverse`, which is gone. Screens are embedded as data URLs, so the printing browser needs no network. The door
// `GET /api/node/product-quiz/pdf` prints this page with Chrome without a window.
import { execFile } from "node:child_process"
import { existsSync, readFileSync } from "node:fs"
import { readdir, readFile, stat } from "node:fs/promises"
import { join } from "node:path"
import { promisify } from "node:util"

import type { ProductQuiz } from "@/lib/web4-items/product-quiz"

const run = promisify(execFile)
const FOLDER = /^[0-9A-Za-z][0-9A-Za-z._-]{0,120}$/
const IMAGE: Record<string, string> = { ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp" }
/** A screen larger than this is skipped: the PDF is printed in one go, and one full-page capture of a long site can be tens of MB. */
const MAX_SCREEN_BYTES = 4 * 1024 * 1024

export type QuizGit = {
  commit: string | null
  date: string | null
  dirty: boolean
  remote: string | null
  pushed: boolean
}

async function git(dir: string, args: string[]): Promise<string> {
  try {
    const { stdout } = await run("git", ["-C", dir, ...args], { windowsHide: true, timeout: 15_000 })
    return stdout.trim()
  } catch {
    return ""
  }
}

/** The commit where the quiz changed last, whether it is on GitHub, uncommitted edits. GitHub: the node's own upload of the element
 *  (`data/services/<id>/github/state.json`: `repo`, `lastCommit` — the button «Building → GitHub», 374) — the quiz commit is there when
 *  it is an ancestor of the last upload; an element cloned from a remote (built-in) — its remote-tracking branches as git last saw them. */
export async function quizGit(dir: string, id: string): Promise<QuizGit> {
  const last = await git(dir, ["log", "-1", "--format=%H|%cI", "--", "development-docs/product"])
  const [commit, date] = last ? last.split("|") : [null, null]
  const dirty = (await git(dir, ["status", "--porcelain", "--", "development-docs/product"])) !== ""
  let stored: { repo?: string; lastCommit?: string } = {}
  try { stored = JSON.parse(readFileSync(join(process.cwd(), "data", "services", id, "github", "state.json"), "utf8")) } catch { /* not uploaded by the node */ }
  const url = await git(dir, ["remote", "get-url", "origin"])
  const m = url.match(/github\.com[/:]([^/]+)\/([^/.]+?)(?:\.git)?$/)
  const repo = stored.repo && /^[A-Za-z0-9-]+\/[A-Za-z0-9._-]+$/.test(stored.repo) ? stored.repo : m ? `${m[1]}/${m[2]}` : null
  const remote = repo ? `https://github.com/${repo}` : null
  let pushed = false
  if (commit && stored.lastCommit && /^[0-9a-f]{7,40}$/.test(stored.lastCommit)) {
    try { await run("git", ["-C", dir, "merge-base", "--is-ancestor", commit, stored.lastCommit], { windowsHide: true, timeout: 15_000 }); pushed = true } catch { /* not an ancestor */ }
  }
  if (commit && !pushed) pushed = (await git(dir, ["branch", "-r", "--contains", commit])) !== ""
  return { commit: commit || null, date: date || null, dirty, remote, pushed }
}

export type QuizShot = { product: string; folder: string; name: string; data: string }

/** Screens of the references' studies: the image files of each study folder a reference names (`references.products[].study`), in
 *  name order, embedded as data URLs. `dir` is the element's folder; the folder name comes from the quiz and is checked before use. */
export async function quizShots(quiz: ProductQuiz, dir: string, max = 24): Promise<QuizShot[]> {
  const out: QuizShot[] = []
  for (const p of quiz.references?.products ?? []) {
    const folder = String(p.study ?? "").trim()
    if (!FOLDER.test(folder) || folder.includes("..")) continue
    const root = join(dir, "study", folder)
    if (!existsSync(root)) continue
    let files: { name: string; parentPath?: string; path?: string; isFile(): boolean }[] = []
    try {
      files = await readdir(root, { recursive: true, withFileTypes: true })
    } catch {
      continue
    }
    const images = files
      .filter((f) => f.isFile() && IMAGE[f.name.slice(f.name.lastIndexOf(".")).toLowerCase()])
      .map((f) => join(f.parentPath ?? f.path ?? root, f.name))
      .sort()
    for (const file of images) {
      if (out.length >= max) return out
      try {
        if ((await stat(file)).size > MAX_SCREEN_BYTES) continue
        const type = IMAGE[file.slice(file.lastIndexOf(".")).toLowerCase()]
        const name = file.slice(root.length + 1).replace(/\\/g, "/")
        out.push({ product: p.name || p.url || folder, folder, name, data: `data:${type};base64,${(await readFile(file)).toString("base64")}` })
      } catch { /* a missing screen is skipped; the others still print */ }
    }
  }
  return out
}

const esc = (s: unknown) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;")

export type QuizPdfWords = {
  title: string
  element: string
  exported: string
  changed: string
  commit: string
  onGithub: string
  notPushed: string
  notSaved: string
  dirty: string
  restore: string
  vision: string
  actors: string
  modules: string
  stages: string
  references: string
  openQuestions: string
  notNow: string
  decisions: string
  screens: string
  screensNote: string
  draft: string
  confirmed: string
}

const WORDS: Record<"en" | "ru", QuizPdfWords> = {
  en: {
    title: "Product quiz", element: "Element", exported: "Exported", changed: "Quiz last changed", commit: "Git commit of the quiz",
    onGithub: "on GitHub", notPushed: "not on GitHub yet: send the element to GitHub to keep this version", notSaved: "not saved in git",
    dirty: "There are unsaved edits after this commit", restore: "Return to this version", vision: "Vision", actors: "Who uses it",
    modules: "Modules", stages: "Stages", references: "Products like this one", openQuestions: "Open questions", notNow: "Not now",
    decisions: "Decisions", screens: "Screens of the studied products",
    screensNote: "Screens of a studied product, only to understand how it works. Not for copying its design.",
    draft: "draft", confirmed: "confirmed",
  },
  ru: {
    title: "Продуктовый квиз", element: "Элемент", exported: "Выгружено", changed: "Квиз последний раз менялся", commit: "Git-коммит квиза",
    onGithub: "есть на GitHub", notPushed: "ещё не на GitHub: отправьте элемент в GitHub, чтобы сохранить эту версию", notSaved: "не сохранено в git",
    dirty: "После этого коммита есть несохранённые правки", restore: "Вернуться к этой версии", vision: "Замысел", actors: "Кто пользуется",
    modules: "Модули", stages: "Этапы", references: "Похожие продукты", openQuestions: "Открытые вопросы", notNow: "Не сейчас",
    decisions: "Решения", screens: "Экраны разобранных продуктов",
    screensNote: "Экран образца, только для понимания устройства — не для копирования оформления.",
    draft: "черновик", confirmed: "подтверждено",
  },
}

export function quizPdfWords(lang: string): QuizPdfWords {
  return lang === "ru" ? WORDS.ru : WORDS.en
}

/** The page for printing: a header with the version, then the quiz, then the screens. Plain HTML and CSS, nothing from the site's shell. */
export function quizPdfHtml(args: { item: string; name: string; lang: string; quiz: ProductQuiz; git: QuizGit; shots: QuizShot[]; at: Date }): string {
  const { item, name, quiz, git: g, shots, at } = args
  const w = quizPdfWords(args.lang)
  const day = (iso: string | null) => (iso ? iso.slice(0, 10) : "—")
  const badge = (s: string) => `<span class="badge ${s === "confirmed" ? "ok" : ""}">${esc(s === "confirmed" ? w.confirmed : w.draft)}</span>`
  const list = (title: string, rows: string[]) => (rows.length ? `<h2>${esc(title)}</h2><ul>${rows.join("")}</ul>` : "")
  const gitBlock = g.commit
    ? `<p><b>${esc(w.commit)}:</b> <code>${esc(g.commit)}</code> · ${g.pushed && g.remote
        ? `${esc(w.onGithub)}: <a href="${esc(`${g.remote}/tree/${g.commit}/development-docs/product`)}">${esc(`${g.remote}/tree/${g.commit.slice(0, 12)}/development-docs/product`)}</a>`
        : `<span class="warn">${esc(w.notPushed)}</span>`}</p>
       <p><b>${esc(w.restore)}:</b> <code>git checkout ${esc(g.commit)} -- development-docs/product</code></p>
       ${g.dirty ? `<p class="warn">${esc(w.dirty)}</p>` : ""}`
    : `<p class="bad"><b>${esc(w.commit)}:</b> ${esc(w.notSaved)}</p>`
  const modules = quiz.modules.map((m) => `<h3>${esc(m.title)}</h3>${m.text ? `<p>${esc(m.text)}</p>` : ""}<ul>${m.items
    .map((i) => `<li><b>${esc(i.id)}</b> ${esc(i.title)} ${badge(i.status)}${i.text ? `<br><span class="muted">${esc(i.text)}</span>` : ""}</li>`).join("")}</ul>`).join("")
  const stages = quiz.stages.map((s) => `<li><b>${esc(w.stages.slice(0, -1) || "Stage")} ${s.n}. ${esc(s.name)}</b> ${badge(s.status)}<br>${esc(s.works)}${s.ready ? `<br><span class="muted">${esc(s.ready)}</span>` : ""}</li>`)
  const refs = (quiz.references?.products ?? []).map((p) => `<li><b>${esc(p.name)}</b> ${esc(p.url)}${p.study ? ` · <code>study/${esc(p.study)}</code>` : ""}</li>`)
  const shotsBlock = shots.length
    ? `<h2 class="page">${esc(w.screens)}</h2><p class="muted">${esc(w.screensNote)}</p>${shots.map((s) =>
        `<figure><img src="${s.data}" alt="${esc(s.name)}"><figcaption>${esc(s.product)} · ${esc(s.name)}</figcaption></figure>`).join("")}`
    : ""
  return `<!doctype html><html lang="${esc(args.lang)}"><head><meta charset="utf-8"><title>${esc(`${name} · ${w.title}`)}</title><style>
  @page { size: A4; margin: 16mm 14mm; }
  body { font: 11pt/1.45 "Segoe UI", system-ui, -apple-system, sans-serif; color: #111; }
  h1 { font-size: 20pt; margin: 0 0 4pt; } h2 { font-size: 14pt; margin: 18pt 0 6pt; } h3 { font-size: 12pt; margin: 12pt 0 4pt; }
  .head { border: 1px solid #ccc; border-radius: 6pt; padding: 8pt 10pt; margin: 8pt 0 12pt; } .head p { margin: 2pt 0; }
  code { font: 9.5pt Consolas, monospace; background: #f3f3f3; padding: 0 2pt; } a { color: #1a4fd6; word-break: break-all; }
  .warn { color: #a15c00; } .bad { color: #b00020; } .muted { color: #555; } ul { padding-left: 16pt; } li { margin: 3pt 0; }
  .badge { font-size: 8.5pt; border: 1px solid #999; border-radius: 8pt; padding: 0 5pt; color: #444; } .badge.ok { border-color: #2e7d32; color: #2e7d32; }
  .page { break-before: page; } figure { margin: 0 0 12pt; break-inside: avoid; } figure img { max-width: 100%; max-height: 230mm; border: 1px solid #ddd; }
  figcaption { font-size: 9pt; color: #555; margin-top: 3pt; }
</style></head><body>
<h1>${esc(w.title)}</h1>
<div class="head">
  <p><b>${esc(w.element)}:</b> ${esc(name)} (<code>${esc(item)}</code>)</p>
  <p><b>${esc(w.exported)}:</b> ${esc(at.toISOString().replace("T", " ").slice(0, 16))} UTC · <b>${esc(w.changed)}:</b> ${esc(day(g.date))}</p>
  ${gitBlock}
</div>
${quiz.vision.text ? `<h2>${esc(w.vision)}</h2><p>${esc(quiz.vision.text)} ${badge(quiz.vision.status)}</p>` : ""}
${list(w.actors, quiz.actors.map((a) => `<li><b>${esc(a.name)}</b>${a.text ? ` — ${esc(a.text)}` : ""}</li>`))}
${quiz.modules.length ? `<h2>${esc(w.modules)}</h2>${modules}` : ""}
${list(w.stages, stages)}
${list(w.references, refs)}
${list(w.openQuestions, quiz.openQuestions.map((q) => `<li>${esc(q.text)}</li>`))}
${list(w.notNow, quiz.notNow.map((n) => `<li>${esc(n.text)}</li>`))}
${list(w.decisions, quiz.decisions.map((d) => `<li><b>${esc(d.date)}</b> ${esc(d.gist || d.said)}</li>`))}
${shotsBlock}
</body></html>`
}
