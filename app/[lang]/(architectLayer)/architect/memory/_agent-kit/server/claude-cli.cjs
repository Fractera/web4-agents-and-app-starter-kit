// СОСТОЯНИЕ ПОДПИСКИ CLAUDE CODE НА ЭТОЙ МАШИНЕ (267-2, перенос `fractera-memory-starter/lib/fractera/claude-cli.mjs`).
//
// 🔒 СПРАШИВАЕМ ПОЛЕ, А НЕ КОД ВОЗВРАТА — И ЭТО ИЗМЕРЕНО ЗАНОВО, А НЕ ПЕРЕНЕСЕНО. В памяти написано, что
// `claude auth status` отдаёт 0 и вошедшему, и невошедшему. На Windows 2026-09-22 (CLI 2.1.278) измерено
// иначе: вошедший — код 0, невошедший (пустой `CLAUDE_CONFIG_DIR`) — код **1**, но JSON печатается в обоих
// случаях. Поэтому JSON читается при любом коде, а решает поле `loggedIn`.
//
// 🔒 `null` — «спросить не удалось», и это НЕ «не вошёл»: разница решает, покажем мы вход или ложное
// «подключено».
//
// 🔒 ПУТЬ К CLI — ПРОСТО `claude`: на Windows `which` нет, а libuv сам дописывает `.exe` при поиске в PATH
// (измерено: `spawnSync('claude', …)` без оболочки находит `C:\Users\…\.local\bin\claude.exe`).
// `CLAUDE_BIN` — для машины, где CLI стоит вне PATH.

const { spawnSync } = require('node:child_process')
const { existsSync } = require('node:fs')
const os = require('node:os')
const path = require('node:path')

function claudeBin() {
  return process.env.CLAUDE_BIN || 'claude'
}

/** Папки, где лежат `claude` и `bun` по установщикам Anthropic и Bun — одинаково на трёх системах. */
function extraBins() {
  return [path.join(os.homedir(), '.local', 'bin'), path.join(os.homedir(), '.bun', 'bin')]
}

/**
 * Полный путь к исполняемому файлу без оболочки: `node-pty` запускает файл, а не строку для оболочки.
 * На Windows — с расширениями из PATHEXT. `~/.local/bin` и `~/.bun/bin` добавляются явно: долгоживущие
 * процессы (pm2, сервер узла) держат окружение, снятое ДО установки, и нового PATH не видят.
 */
function resolveBin(name, pathValue = process.env.PATH || process.env.Path || '') {
  const dirs = [...extraBins(), ...String(pathValue).split(path.delimiter).filter(Boolean)]
  const exts = process.platform === 'win32' ? (process.env.PATHEXT || '.EXE;.CMD').split(';').map((e) => e.toLowerCase()) : ['']
  for (const d of dirs) for (const e of exts) {
    const p = path.join(d, name + e)
    if (existsSync(p)) return p
  }
  return null
}

/** @returns {{ loggedIn: boolean | null, method: string | null, email: string | null, plan: string | null }} */
function claudeAuthState() {
  try {
    const out = spawnSync(claudeBin(), ['auth', 'status'], { encoding: 'utf8', timeout: 15_000, windowsHide: true })
    if (!out.stdout) return { loggedIn: null, method: null, email: null, plan: null }
    const p = JSON.parse(out.stdout)
    return {
      loggedIn: typeof p.loggedIn === 'boolean' ? p.loggedIn : null,
      method: typeof p.authMethod === 'string' ? p.authMethod : null,
      email: typeof p.email === 'string' ? p.email : null,
      plan: typeof p.subscriptionType === 'string' ? p.subscriptionType : null,
    }
  } catch {
    return { loggedIn: null, method: null, email: null, plan: null }
  }
}

module.exports = { claudeBin, claudeAuthState, extraBins, resolveBin }
