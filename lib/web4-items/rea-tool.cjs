// REA В ЯДРЕ — ОДНА КОПИЯ НА УЗЕЛ (узел, шаг 539-2).
//
// Владелец 2026-10-19: «строим» — на вариант «одна копия REA в ядре вне git, по кнопке, без MCP по умолчанию, элемент зовёт
// программу из ядра». REA (`morluto/rea`, npm `rea-agents`, MIT) — инструмент обратной разработки; разбор — в федеральном
// отчёте шага 538.
//
// 🔒 ПРОГРАММА, А НЕ СЛУЖБА. Пакет лежит в `data/tools/rea/` (вне git) и сам ничего не запускает: агент элемента зовёт его
// через свой терминал по задаче человека, команда отрабатывает и выходит. Ни одного `.mcp.json`, `~/.claude.json`,
// `~/.claude/skills` этот модуль и установщик не трогают — `rea-agents setup` прописал бы REA всем агентам машины.
//
// 🔒 ВЕРСИЯ ЗАКРЕПЛЕНА. `@latest` менял бы инструмент у человека без его ведома; новая версия — правкой `VERSION`.
//
// 🔒 ЖИВ ЛИ УСТАНОВЩИК — ИЗМЕРЯЕТСЯ ПРИ ЧТЕНИИ (тот же приём, что замок развёртывания 337-1): запись несёт `pid`,
// мёртвый процесс исправляется на «прервано» тем, кто спросил. Таймеров нет.

const { existsSync, mkdirSync, readFileSync, writeFileSync } = require('node:fs')
const { join } = require('node:path')

const VERSION = '6.8.0'
// 🛑 `process.cwd()`, а не `__dirname`: в собранном сервере Next `__dirname` указывает внутрь сборки (замерено 337).
const DIR = join(process.cwd(), 'data', 'tools', 'rea')
const PKG = join(DIR, 'node_modules', 'rea-agents', 'package.json')
const ENTRY = join(DIR, 'node_modules', 'rea-agents', 'scripts', 'rea.mjs')
const STATE = join(DIR, 'install.json')
const LOG = join(DIR, 'install.log')

/** `engines` пакета 6.8.0: `^22.23.4 || ^24.22.1 || >=26.12.1` (594-2; у 6.7.0 было `^22.19.0 || ^24.11.0 || >=26.0.0`). */
function nodeOk(version = process.versions.node) {
  const [major, minor] = String(version).split('.').map(Number)
  const [, , patch] = String(version).split('.').map(Number)
  return (major === 22 && (minor > 23 || (minor === 23 && patch >= 4))) || (major === 24 && minor >= 22 && (minor > 22 || patch >= 1)) || (major === 26 && (minor > 12 || (minor === 12 && patch >= 1))) || major > 26
}

function pidAlive(pid) {
  if (!Number.isInteger(pid) || pid <= 0) return false
  try {
    process.kill(pid, 0)
    return true
  } catch (e) {
    return e && e.code === 'EPERM'
  }
}

function writeState(state) {
  mkdirSync(DIR, { recursive: true })
  writeFileSync(STATE, JSON.stringify(state, null, 2) + '\n')
}

/** Запись последней установки; осиротевшая (`running`, а процесса нет) исправляется на «прервано». */
function readInstall() {
  let s = null
  try {
    s = JSON.parse(readFileSync(STATE, 'utf8'))
  } catch {
    return null
  }
  if (!s || !s.running || pidAlive(s.pid)) return s
  const fixed = { ...s, running: false, ok: false, finishedAt: new Date().toISOString(), error: 'interrupted' }
  try { writeState(fixed) } catch { /* вернём исправленное и без записи */ }
  return fixed
}

function installedVersion() {
  try {
    return JSON.parse(readFileSync(PKG, 'utf8')).version ?? null
  } catch {
    return null
  }
}

/** Всё, что знают о REA страница, дверь и навык элемента. */
function status() {
  const version = installedVersion()
  const installed = Boolean(version) && existsSync(ENTRY)
  return {
    installed,
    version,
    wanted: VERSION,
    dir: DIR,
    // Как звать программу: `node <entry> <команда>`; без `.cmd` и без оболочки — одинаково на трёх системах.
    entry: installed ? ENTRY : null,
    node: { version: process.versions.node, ok: nodeOk() },
    install: readInstall(),
  }
}

module.exports = { VERSION, DIR, ENTRY, STATE, LOG, nodeOk, pidAlive, writeState, readInstall, installedVersion, status }
