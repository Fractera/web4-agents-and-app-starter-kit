// ПЕРЕНОС ПАПКИ ЭЛЕМЕНТА ПО ЕГО АДРЕСУ (узел, шаг 343): `node scripts/element-move.mjs <id>`.
//
// Слово владельца 2026-09-30: «при создании нового WEB4 ITEM для него создается рандом суб домен as cuid и затем мы можем его
// переименовать … но проблема остается в файловой системе» → выбор «Папка = адрес». Папка `WEB4-ITEMS/<kind>/<…>` получает имя
// адреса (`data/services/<id>/address.json`; нет адреса — id). id остаётся внутри: процесс pm2 `fractera-svc-<id>`, данные
// `data/services/<id>`, реестр. Путь к папке читают через `lib/web4-items/paths.cjs` — он сам находит перенесённую папку.
//
// Порядок: отказ, если идёт развёртывание или предпросмотр элемента → pm2 stop сервера и его сторожа (иначе Windows не даёт
// переименовать папку, в которой работает процесс) → rename → абсолютные пути в `.env.local` и `.install-stamp.json` →
// история Claude Code `~/.claude/projects/<путь>` (агент элемента продолжает свои разговоры) → pm2 delete + start (pm2 хранит
// рабочую папку процесса) → save → ждать ответа сервера. Не удалось переименовать — всё назад и слово человеку.
// 🛑 Открытый терминал агента элемента держит папку (его рабочая папка) — перенос откажет с просьбой закрыть терминал.
// Состояние — `data/services/<id>/move.json`, журнал — `logs/move-<id>.log`.

import { spawnSync } from 'node:child_process'
import { existsSync, readFileSync, readdirSync, renameSync, writeFileSync, appendFileSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { homedir } from 'node:os'
import paths from '../lib/web4-items/paths.cjs'
import elementProps from '../lib/web4-items/element-props.cjs'
import deployLock from '../lib/deploy/deploy-lock.cjs'
import elementPower from '../lib/web4-items/element-power.cjs'
import { addressOf } from '../lib/web4-items/address-file.mjs'

const ROOT = join(paths.ITEMS_DIR, '..')
const IS_WIN = process.platform === 'win32'
const pm2 = IS_WIN ? 'pm2.cmd' : 'pm2'
const id = process.argv[2]
const readJson = (f) => { try { return JSON.parse(readFileSync(f, 'utf8')) } catch { return null } }
const LOG = join(ROOT, 'logs', `move-${id}.log`)
const STATE = join(ROOT, 'data', 'services', id ?? '_', 'move.json')
const say = (m) => { const line = `${new Date().toISOString()} ${m}`; console.log(line); try { appendFileSync(LOG, line + '\n') } catch { /* журнал не главное */ } }
const save = (s) => { try { mkdirSync(join(ROOT, 'data', 'services', id), { recursive: true }); writeFileSync(STATE, JSON.stringify({ ...s, at: new Date().toISOString() }, null, 2) + '\n') } catch { /* состояние не главное */ } }
// 🛑 Чистое окружение для pm2: перенос зовёт дверь ядра (сервер Next), и без чистки элемент получил бы `__NEXT_PROCESSED_ENV` ядра
// и не прочитал бы свой `.env.local` (✗ найдено 2026-09-30 на «Принять», тот же механизм).
const cleanEnv = Object.fromEntries(Object.entries(process.env).filter(([k]) => !(k.startsWith('__NEXT') || k.startsWith('NEXT_') || k.startsWith('WEB4_') || k === 'PORT' || k === 'HOSTNAME' || k === 'NODE_ENV')))
const run = (args) => spawnSync(pm2, args, { cwd: ROOT, encoding: 'utf8', shell: IS_WIN, windowsHide: true, env: cleanEnv })
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const alive = (pid) => { try { process.kill(pid, 0); return true } catch (e) { return e?.code === 'EPERM' } }

const entry = (readJson(paths.REGISTRY_FILE)?.services ?? []).find((s) => s.id === id)
if (!entry) { console.error('usage: element-move.mjs <id> — id из реестра'); process.exit(2) }
const base = join(paths.ITEMS_DIR, entry.kind === 'user' ? 'user' : 'core')
const target = join(base, addressOf(id, ROOT))

// Где элемент лежит сейчас: та папка, чей паспорт называет этот id (id-папка или прежний адрес); паспорта нет нигде — папка по id.
// 605 (владелец 2026-10-30: блоки — нативный элемент, а лежат в WEB4-ITEMS\user\blocks; «may be need only replace ?»): папку ищем в
// обеих зонах — смена `kind` записи реестра переносит элемент между `user/` и `core/` этой же процедурой; цель — по `kind`.
const dirsOf = (b) => { try { return readdirSync(b, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => join(b, d.name)) } catch { return [] } }
const dirs = [...dirsOf(base), ...dirsOf(join(paths.ITEMS_DIR, entry.kind === 'user' ? 'core' : 'user'))]
const source = dirs.find((d) => elementProps.elementIdOf(d) === id) // 417: обе раскладки
  ?? dirs.find((d) => d === join(base, id) && existsSync(join(d, '.install-stamp.json')))

function fail(reason, word) {
  say(`ОТКАЗ: ${reason}`)
  save({ state: 'failed', reason, word, from: source, to: target })
  console.log('===MOVE_FAILED===')
  process.exit(1)
}

if (!source) fail('no-folder', 'папка элемента не найдена')
if (source === target) { say(`уже на месте: ${target}`); save({ state: 'done', from: source, to: target }); console.log('===MOVE_OK==='); process.exit(0) }
if (existsSync(target)) fail('target-exists', `папка ${target} уже существует`)
if (deployLock.isRunning()) fail('deploy-running', 'идёт развёртывание — перенос после него')
const preview = readJson(join(ROOT, 'data', 'services', id, 'preview.json'))
if (preview && (preview.state === 'ready' || (preview.state === 'building' && alive(preview.pid)))) fail('preview-open', 'открыт предпросмотр элемента — примите или отклоните его')

save({ state: 'moving', from: source, to: target })
say(`перенос ${source} → ${target}`)
const names = [`fractera-svc-${id}-watch`, `fractera-svc-${id}`]
const wasOnline = new Set(
  (() => { try { return JSON.parse(run(['jlist']).stdout || '[]') } catch { return [] } })()
    .filter((p) => names.includes(p.name) && p.pm2_env?.status === 'online').map((p) => p.name),
)
for (const n of names) run(['stop', n])
await sleep(1500)

let moved = false
let lastErr = ''
for (let i = 0; i < 5 && !moved; i++) {
  try { renameSync(source, target); moved = true } catch (e) { lastErr = e?.code ?? String(e); await sleep(1500) }
}
if (!moved) {
  for (const n of [...names].reverse()) if (wasOnline.has(n)) run(['start', n])
  fail(`rename-${lastErr}`, 'папку держит другой процесс — закройте терминал агента этого элемента и повторите переименование')
}
say('папка перенесена')

// Абсолютные пути прежней папки — в обоих написаниях (обратные и прямые косые).
const variants = (p) => [p, p.split('\\').join('/'), p.split('\\').join('\\\\')]
// ✗ 343, замерено на roman-2: собранный сервер читает СВОЮ копию окружения `<сборка>/standalone/.env.local` — с прежними путями
// он через 5 с после запуска записал оформление в `WEB4-ITEMS/user/<id>/DESIGN-CONFIG` и воскресил старую папку.
const builds = readdirSync(target, { withFileTypes: true }).filter((d) => d.isDirectory() && d.name.startsWith('.next'))
  .flatMap((d) => ['.env.local', '.env'].map((f) => join(d.name, 'standalone', f)))
for (const f of ['.env.local', '.install-stamp.json', ...builds]) {
  const file = join(target, f)
  if (!existsSync(file)) continue
  let s = readFileSync(file, 'utf8')
  const before = s
  const from = variants(source)
  const to = variants(target)
  from.forEach((v, i) => { s = s.split(v).join(to[i]) })
  if (s !== before) { writeFileSync(file, s); say(`пути обновлены: ${f}`) }
}

// История разговоров агента элемента: Claude Code хранит её по рабочей папке.
const enc = (p) => p.replace(/[:\\/]/g, '-')
const projects = join(homedir(), '.claude', 'projects')
const hOld = join(projects, enc(source))
const hNew = join(projects, enc(target))
if (existsSync(hOld) && !existsSync(hNew)) {
  try { renameSync(hOld, hNew); say('история агента перенесена') } catch (e) { say(`история агента не перенесена: ${e?.code ?? e}`) }
}

for (const n of names) run(['delete', n])
// 567: выключенный элемент после переноса не поднимается — его нет в ecosystem.
const offNow = elementPower.isOffById(id, ROOT)
if (offNow) say(`«${id}» выключен — после переноса не запускаю`)
for (const n of offNow ? [] : [`fractera-svc-${id}`, `fractera-svc-${id}-watch`]) {
  if (wasOnline.size === 0 || wasOnline.has(n)) {
    const r = run(['start', 'ecosystem.config.cjs', '--only', n])
    say(`pm2 start ${n}: ${r.status === 0 ? 'ok' : (r.stderr || r.stdout).trim().slice(-200)}`)
  }
}
run(['save'])

const port = readJson(join(target, '.install-stamp.json'))?.port
let up = false
for (let i = 0; i < 60 && port && !up; i++) {
  try { const r = await fetch(`http://127.0.0.1:${port}/api/health`, { signal: AbortSignal.timeout(3000) }); up = r.ok } catch { /* ещё встаёт */ }
  if (!up) await sleep(1000)
}
say(up ? `сервер отвечает на ${port}` : `сервер не ответил на ${port} за 60 с`)
save({ state: up ? 'done' : 'started-no-answer', from: source, to: target, port })
// 548: граница агента элемента — инструкция ядра не грузится, выход за папку только с ответа человека.
spawnSync(process.execPath, [join(ROOT, 'scripts', 'element-isolate.mjs')], { cwd: ROOT, windowsHide: true, stdio: 'inherit' })
console.log(up ? '===MOVE_OK===' : '===MOVE_NO_ANSWER===')
process.exit(up ? 0 : 1)
