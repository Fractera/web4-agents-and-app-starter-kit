// УСТАНОВКА REA В ЯДРО (узел, шаг 539-2): `node scripts/rea-install.mjs` из корня узла.
//
// Зовёт дверь `POST /api/node/rea` через `scripts/spawn-free.mjs` (вне дерева процессов ядра: пересборка ядра не оборвёт
// установку), можно и руками. Ставит закреплённую версию `rea-agents` в `data/tools/rea/` — и только туда.
//
// 🛑 `rea-agents setup` НЕ ЗОВЁТСЯ НИКОГДА: он прописывает REA в `~/.claude.json` и `~/.claude/skills` — всем агентам машины
// сразу (закон «рабочая папка — личность агента»).
// 🛑 `--ignore-scripts`: сорок зависимостей не исполняют своих сценариев установки на машине человека; если пакету без них
// не жить, это покажет проверка `--version` в конце, а не догадка.
// 🛑 npm зовётся с `cwd` папки и БЕЗ путей в аргументах: на Windows `npm.cmd` идёт через оболочку (иначе EINVAL), и путь с
// пробелом (`C:\Users\John Smith\…`) разорвал бы строку. Аргументы — константы.
// 🛑 Окружение без `__NEXT_*`: процесс, порождённый из сервера Next, иначе несёт его переменные (ANTI-PATTERNS, 351).

import { spawnSync } from 'node:child_process'
import { closeSync, existsSync, mkdirSync, openSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

import tool from '../lib/web4-items/rea-tool.cjs'

const isWindows = process.platform === 'win32'
const now = () => new Date().toISOString()

if (!tool.nodeOk()) {
  // Ни одного файла в `data/tools/rea/` — отказ называется на странице по версии Node, а не по записи.
  console.error(`REA ${tool.VERSION} needs Node ^22.23.4 || ^24.22.1 || >=26.12.1; this node runs ${process.versions.node}.`)
  process.exit(3)
}

const prev = tool.readInstall()
if (prev && prev.running) {
  console.error('REA install is already running.')
  process.exit(4)
}
if (tool.installedVersion() === tool.VERSION && existsSync(tool.ENTRY)) {
  console.log(`REA ${tool.VERSION} is already installed in ${tool.DIR}.`)
  process.exit(0)
}

mkdirSync(tool.DIR, { recursive: true })
const manifest = join(tool.DIR, 'package.json')
if (!existsSync(manifest)) writeFileSync(manifest, JSON.stringify({ name: 'fractera-rea-tool', private: true }, null, 2) + '\n')

const startedAt = now()
tool.writeState({ running: true, pid: process.pid, startedAt, version: tool.VERSION })

const env = Object.fromEntries(Object.entries(process.env).filter(([k]) => !k.startsWith('__NEXT')))
const out = openSync(tool.LOG, 'w')
const npm = spawnSync(isWindows ? 'npm.cmd' : 'npm', ['install', `rea-agents@${tool.VERSION}`, '--no-audit', '--no-fund', '--ignore-scripts'], {
  cwd: tool.DIR,
  env,
  stdio: ['ignore', out, out],
  shell: isWindows,
  windowsHide: true,
  timeout: 15 * 60_000,
})
closeSync(out)

let check = null
if (npm.status === 0 && existsSync(tool.ENTRY)) {
  check = spawnSync(process.execPath, [tool.ENTRY, '--version'], { cwd: tool.DIR, env, encoding: 'utf8', windowsHide: true, timeout: 120_000 })
}
const version = tool.installedVersion()
const ok = npm.status === 0 && version === tool.VERSION && check?.status === 0
const logTail = (() => {
  try { return readFileSync(tool.LOG, 'utf8').trim().split(/\r?\n/).slice(-12) } catch { return [] }
})()

tool.writeState({
  running: false,
  pid: process.pid,
  startedAt,
  finishedAt: now(),
  version,
  ok,
  ...(ok ? { reports: (check.stdout || '').trim().split(/\r?\n/)[0] } : { error: npm.status !== 0 ? `npm-exit-${npm.status ?? npm.signal}` : 'no-version', logTail }),
})
console.log(ok ? `===REA_INSTALL_OK=== ${version}` : `===REA_INSTALL_FAILED=== npm ${npm.status} version ${version}`)
process.exit(ok ? 0 : 1)
