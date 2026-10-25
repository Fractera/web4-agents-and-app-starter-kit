// @api print the product quiz of a WEB4 ITEM as a PDF file
import { execFile } from "node:child_process"
import { randomBytes } from "node:crypto"
import { existsSync } from "node:fs"
import { mkdir, readFile, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { pathToFileURL } from "node:url"
import { promisify } from "node:util"
import { NextRequest, NextResponse } from "next/server"

import { requireRoles } from "@/lib/auth/require-roles"
import { idOfAddress } from "@/lib/web4-items/element-address"
import { elementDir } from "@/lib/web4-items/element-github"
import { readProductQuiz } from "@/lib/web4-items/product-quiz"
import { quizGit, quizPdfHtml, quizShots } from "@/lib/web4-items/product-quiz-pdf"

// «СКАЧАТЬ PDF» ПРОДУКТОВОГО КВИЗА (шаг 575). Владелец 2026-10-23: «должна быть версия дата если мы сохраняем её отдельной версии в GitHub
// то ещё и версия Git которая позволяет откатиться к этой версии позже»; «pdf must have screen shots». Страница для печати собирается из
// квиза, git элемента и экранов разборов его образцов (с 594-6 — снимки из папки разбора элемента `study/<папка>/`,
// `lib/web4-items/product-quiz-pdf.ts`), Chrome без окна печатает её в PDF.
// 🔒 Всё асинхронно (закон 325-6: дверь не держит цикл событий); окружение Chrome собирается, а не наследуется (закон 280-6).
// Кто вправе: архитектор/админ — квиз описывает работу на машине человека, как и дверь `/api/node/product-quiz`.
export const dynamic = "force-dynamic"
export const runtime = "nodejs"

const run = promisify(execFile)
const ROLES = ["architect", "admin"] as const

function chromePath(): string | null {
  if (process.env.CHROME_PATH) return process.env.CHROME_PATH
  const candidates = process.platform === "win32"
    ? [join(process.env.PROGRAMFILES || "C:/Program Files", "Google/Chrome/Application/chrome.exe"),
       join(process.env["PROGRAMFILES(X86)"] || "C:/Program Files (x86)", "Google/Chrome/Application/chrome.exe"),
       join(process.env.LOCALAPPDATA || "", "Google/Chrome/Application/chrome.exe")]
    : process.platform === "darwin"
      ? ["/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", "/Applications/Chromium.app/Contents/MacOS/Chromium"]
      : ["/usr/bin/google-chrome", "/usr/bin/google-chrome-stable", "/usr/bin/chromium", "/usr/bin/chromium-browser"]
  return candidates.find((p) => p && existsSync(p)) ?? null
}

export async function GET(req: NextRequest) {
  const denied = await requireRoles(req, ROLES)
  if (denied) return denied
  const address = (req.nextUrl.searchParams.get("item") ?? "").trim()
  const id = idOfAddress(address)
  const dir = id ? elementDir(id) : null
  if (!id || !dir) return NextResponse.json({ ok: false, error: "unknown element" }, { status: 404 })
  const { quiz } = readProductQuiz(id)
  if (!quiz) return NextResponse.json({ ok: false, error: "the element has no product quiz yet" }, { status: 404 })
  const chrome = chromePath()
  if (!chrome) return NextResponse.json({ ok: false, error: "no Chrome on this computer to print the PDF" }, { status: 503 })

  const asked = req.nextUrl.searchParams.get("lang")
  const lang = asked === "ru" || asked === "en" ? asked : quiz.language === "ru" ? "ru" : "en"
  const at = new Date()
  const [git, shots] = await Promise.all([quizGit(dir, id), quizShots(quiz, dir)])
  const name = address || id
  const html = quizPdfHtml({ item: id, name, lang, quiz, git, shots, at })

  const work = join(tmpdir(), `quiz-pdf-${randomBytes(6).toString("hex")}`)
  const htmlFile = join(work, "quiz.html")
  const pdfFile = join(work, "quiz.pdf")
  await mkdir(join(work, "profile"), { recursive: true })
  await writeFile(htmlFile, html, "utf8")
  const env = {} as NodeJS.ProcessEnv
  for (const [k, v] of Object.entries(process.env)) if (v !== undefined && !/^(__NEXT|NEXT_|AGI_|PORT$|HOSTNAME$|NODE_ENV$)/.test(k)) env[k] = v
  try {
    await run(chrome, ["--headless=new", "--disable-gpu", "--no-first-run", "--no-default-browser-check", "--disable-extensions",
      `--user-data-dir=${join(work, "profile")}`, "--no-pdf-header-footer", `--print-to-pdf=${pdfFile}`, pathToFileURL(htmlFile).href],
      { windowsHide: true, timeout: 90_000, env })
  } catch { /* Chrome may exit with a code after writing the file: the file decides below */ }
  if (!existsSync(pdfFile)) {
    void rm(work, { recursive: true, force: true }).catch(() => {})
    return NextResponse.json({ ok: false, error: "Chrome did not print the PDF" }, { status: 502 })
  }
  const pdf = await readFile(pdfFile)
  void rm(work, { recursive: true, force: true }).catch(() => {})
  const file = `${name}-product-quiz-${at.toISOString().slice(0, 10)}-${git.commit ? git.commit.slice(0, 7) : "unsaved"}.pdf`.replace(/[^0-9A-Za-z._-]/g, "-")
  return new NextResponse(new Uint8Array(pdf), {
    headers: { "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="${file}"`, "Cache-Control": "no-store" },
  })
}
