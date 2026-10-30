// ПРИБОР РАЗБОРА СТРАНИЦЫ (шаг 577-6, 2026-10-24) — снимки и сторож без модели, 0 токенов.
//
//   node shots.mjs --element <папка элемента> [--page /en] [--page /ru] [--out <папка>]
//   node shots.mjs --url http://127.0.0.1:<порт> [--page /en] [--out <папка>]
//
// Что делает:
//   1. --element: отдаёт УСТАНОВЛЕННУЮ сборку элемента (самая свежая `.next*/standalone/server.js`) своим сервером на запасном
//      порту 127.0.0.1 и останавливает его в конце — так же прогревает сборку установщик узла. Выключенный элемент не включается.
//      --url: берёт работающий сайт как есть.
//   2. Безголовый Chrome (протокол отладки, без библиотек — как check-navigation.mjs навыка lagrix-answer-pages): ширина 1440 и
//      500 px, окно 900 px; страница прокручивается до низа (ленивые картинки), затем нарезается по экранам:
//      <out>/<страница>-<ширина>-<NN>.png.
//   3. Печатает карту «экран → блоки» по `[data-block]` (адрес блока; вид — из `_data/<язык>.json`, если дан --element).
//   4. --element: печатает дословно вывод `scripts/check-page-blocks.mjs` элемента (сторож 577-5) — та же страница, 0 токенов.
//   --eval <файл.js>: выполнить скрипт в странице перед снимками (испорченная копия для проверки разбора; сторож её не видит).
// 🛑 Поданная сборка при старте подписывается на сигналы CONFIG и «Дизайна» своим временным адресом — как прогрев установщика;
// подписка элемента вернётся к его порту при следующем запуске элемента.
// Итог — ===SHOTS_OK=== <число снимков> или ===SHOTS_FAIL=== (код 1).
import { spawn, spawnSync } from "node:child_process"
import { existsSync, mkdirSync, openSync, mkdtempSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import path from "node:path"
import net from "node:net"

const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe"
const WIDTHS = [1440, 500]
const HEIGHT = 900
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const argv = process.argv.slice(2)
const opt = (name) => { const i = argv.indexOf(name); return i >= 0 ? argv[i + 1] : null }
// 🛑 Git Bash переписывает `/en` в `C:/Program Files/Git/en` (✗ 577-1 и 577-6: битый адрес, сборка «не отвечала»). Страница
// принимается и без косой (`en`, `ru/docs`); переписанный путь — отказ сразу.
const pages = argv.flatMap((a, i) => (a === "--page" ? [argv[i + 1]] : [])).map((p) => {
  if (/^[A-Za-z]:[\\/]/.test(p)) { console.log(`===SHOTS_FAIL=== the shell rewrote the page into a path (${p}) — pass it without the slash: --page en`); process.exit(1) }
  return p.startsWith("/") ? p : `/${p}`
})
if (!pages.length) pages.push("/en")
const element = opt("--element")
let base = opt("--url")
const out = path.resolve(opt("--out") || path.join(tmpdir(), `review-page-${Date.now()}`))
mkdirSync(out, { recursive: true })
if (!element && !base) { console.log("===SHOTS_FAIL=== give --element <folder> or --url <base>"); process.exit(1) }

// 🛑 Не `listen(0)`: Windows даёт порт из 49152+ — этот диапазон ОС раздаёт исходящим соединениям, и слушатель там не отвечал
// (✗ 577-6: сервер «Ready», fetch ждал 2 минуты). Порт — из блока продукта 24680–25679 сверху вниз, как прогрев установщика.
const tryPort = (p) => new Promise((ok) => { const s = net.createServer(); s.once("error", () => ok(false)); s.listen(p, "127.0.0.1", () => s.close(() => ok(true))) })
async function freePort() {
  for (let p = 25679; p >= 25500; p--) if (await tryPort(p)) return p
  throw new Error("no free port in 25500–25679")
}

/** bid → вид блока по данным страницы (вложенные — через children). */
function kindsOf(dir, page) {
  const map = new Map()
  const lang = page.split("/")[1] || "en"
  const rest = page.split("/").slice(2).filter(Boolean)
  const candidates = [path.join(dir, "app", "[lang]", "(publicLayer)", ...(rest.length ? ["_pages", ...rest] : ["_data"]), `${lang}.json`)]
  for (const f of candidates) {
    if (!existsSync(f)) continue
    const walk = (list) => (list || []).forEach((b) => { if (b?.bid) map.set(b.bid, b.kind); walk(b?.children) })
    walk(JSON.parse(readFileSync(f, "utf8")).blocks)
  }
  return map
}

let server = null
async function serveElement(dir) {
  const builds = readdirSync(dir).filter((d) => /^\.next/.test(d) && existsSync(path.join(dir, d, "standalone", "server.js")))
    .sort((a, b) => statSync(path.join(dir, b)).mtimeMs - statSync(path.join(dir, a)).mtimeMs)
  if (!builds.length) throw new Error("no installed build (.next*/standalone/server.js) — the element was never built")
  const port = await freePort()
  const logFd = openSync(path.join(out, "server.log"), "a")
  server = spawn(process.execPath, [path.join(builds[0], "standalone", "server.js")], {
    cwd: dir, windowsHide: true, stdio: ["ignore", logFd, logFd], env: { ...process.env, PORT: String(port), HOSTNAME: "127.0.0.1", NODE_ENV: "production" },
  })
  const url = `http://127.0.0.1:${port}`
  for (let t = Date.now(); Date.now() - t < 120000; await sleep(1000)) {
    try { if ((await fetch(url + pages[0], { signal: AbortSignal.timeout(15000) })).status < 500) { console.log(`served ${builds[0]} on ${url}`); return url } } catch { /* ещё не слушает */ }
  }
  throw new Error("the build did not answer in 2 minutes")
}

async function cdp(port) {
  let t
  for (let i = 0; i < 40 && !t; i++) { await sleep(250); try { t = await (await fetch(`http://127.0.0.1:${port}/json/new?about:blank`, { method: "PUT" })).json() } catch { /* Chrome ещё стартует */ } }
  if (!t) throw new Error("Chrome did not open its debugging port")
  const ws = new WebSocket(t.webSocketDebuggerUrl)
  await new Promise((r) => ws.addEventListener("open", r))
  let id = 0
  const waiting = new Map()
  const events = []
  ws.addEventListener("message", (m) => { const d = JSON.parse(m.data); if (d.id && waiting.has(d.id)) { waiting.get(d.id)(d); waiting.delete(d.id) } else if (d.method) events.push(d.method) })
  const send = (method, params = {}) => new Promise((ok, no) => { const i = ++id; waiting.set(i, (d) => (d.error ? no(new Error(`${method}: ${d.error.message}`)) : ok(d.result))); ws.send(JSON.stringify({ id: i, method, params })) })
  return { ws, send, events }
}

const evalJs = async (send, expression) => (await send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true })).result.value

let chrome = null
let shots = 0
try {
  if (element) base = await serveElement(path.resolve(element))
  const port = 9900 + Math.floor(Math.random() * 500)
  chrome = spawn(CHROME, ["--headless=new", `--remote-debugging-port=${port}`, `--user-data-dir=${mkdtempSync(path.join(tmpdir(), "shots-"))}`,
    "--hide-scrollbars", "--no-first-run", "about:blank"], { windowsHide: true, stdio: "ignore" })
  const { ws, send } = await cdp(port)
  await send("Page.enable")
  for (const page of pages) {
    const kinds = element ? kindsOf(path.resolve(element), page) : new Map()
    const slug = page.replace(/^\/|\/$/g, "").replace(/\//g, "_") || "home"
    for (const width of WIDTHS) {
      await send("Emulation.setDeviceMetricsOverride", { width, height: HEIGHT, deviceScaleFactor: 1, mobile: width < 768 })
      await send("Page.navigate", { url: base + page })
      for (let i = 0; i < 60 && (await evalJs(send, "document.readyState")) !== "complete"; i++) await sleep(250)
      await evalJs(send, "document.fonts.ready.then(() => true)")
      // --eval <файл.js>: испорченная КОПИЯ для проверки разбора — скрипт переставляет блоки в браузере, данные и сборка не тронуты.
      if (opt("--eval")) await evalJs(send, readFileSync(opt("--eval"), "utf8"))
      // Плавная прокрутка страницы (`scroll-smooth`) иначе не доводит окно до места (✗ 523-2).
      await evalJs(send, `(async () => { document.documentElement.style.scrollBehavior = 'auto';
        for (let y = 0; y < document.documentElement.scrollHeight; y += ${HEIGHT}) { window.scrollTo(0, y); await new Promise(r => setTimeout(r, 120)) }
        window.scrollTo(0, 0); await new Promise(r => setTimeout(r, 400)); return true })()`)
      const full = await evalJs(send, "Math.ceil(document.documentElement.scrollHeight)")
      const known = JSON.stringify([...kinds.keys()])
      const boxes = await evalJs(send, `[...document.querySelectorAll('main [data-block]')].filter(el => ${known}.length ? ${known}.includes(el.getAttribute('data-block')) : !el.parentElement.closest('main [data-block]')).map(el => {
          let r = el.getBoundingClientRect()
          if (!r.height) { const rs = [...el.children].map(c => c.getBoundingClientRect()).filter(x => x.height); if (rs.length) r = { top: Math.min(...rs.map(x => x.top)), bottom: Math.max(...rs.map(x => x.bottom)) } }
          return { bid: el.getAttribute('data-block'), top: Math.round(r.top + scrollY), bottom: Math.round(r.bottom + scrollY) }
        }).filter(b => b.bottom > b.top)`)
      const screens = Math.max(1, Math.ceil(full / HEIGHT))
      for (let n = 0; n < screens; n++) {
        const shot = await send("Page.captureScreenshot", { format: "png", captureBeyondViewport: true, clip: { x: 0, y: n * HEIGHT, width, height: Math.min(HEIGHT, full - n * HEIGHT), scale: 1 } })
        const file = path.join(out, `${slug}-${width}-${String(n + 1).padStart(2, "0")}.png`)
        writeFileSync(file, Buffer.from(shot.data, "base64"))
        shots++
        const on = boxes.filter((b) => b.top < (n + 1) * HEIGHT && b.bottom > n * HEIGHT).map((b) => (kinds.has(b.bid) ? `${kinds.get(b.bid)}·${b.bid}` : b.bid))
        console.log(`${page} ${width}px screen ${n + 1}/${screens}: ${on.join(", ") || "(no block address)"} → ${file}`)
      }
    }
  }
  ws.close()
  if (element) {
    const g = spawnSync(process.execPath, ["scripts/check-page-blocks.mjs"], { cwd: path.resolve(element), encoding: "utf8", windowsHide: true })
    console.log(`--- guard check:page-blocks (RC ${g.status}) ---\n${(g.stdout + g.stderr).trim()}`)
  }
  console.log(`===SHOTS_OK=== ${shots} screenshots in ${out}`)
} catch (e) {
  console.log(`===SHOTS_FAIL=== ${e.message}`)
  process.exitCode = 1
} finally {
  try { chrome?.kill() } catch { /* вышел */ }
  try { server?.kill() } catch { /* вышел */ }
}
