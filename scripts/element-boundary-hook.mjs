// СТОРОЖ ГРАНИЦЫ АГЕНТА ЭЛЕМЕНТА (узел, шаг 548-7) — хук Claude Code `PreToolUse`, его ставит `scripts/element-isolate.mjs`.
//
// Слово владельца 2026-10-19: «элемент физически не может получать данные из соседних элементов или из ядра за исключением
// случаев когда невозможно никаким другим способом решить проблему и только по согласованию с архитектором».
//
// Почему хук, а не только правила: правила Read/Edit Claude Code действуют на его файловые инструменты и на узнаваемые команды
// оболочки (`cat`, `sed`, `head`), но не на «a Python or Node script that opens files itself» (code.claude.com/docs/en/permissions),
// а песочницы на Windows нет («On native Windows, Claude Code runs commands unsandboxed», …/sandboxing). Хук читает ТЕКСТ вызова:
// команду оболочки, путь и содержимое записываемого файла. Назван путь вне своей папки — ответ `ask`: Claude Code спрашивает
// человека в терминале (у разбуженного из Telegram — узел присылает ссылку, `bridge.cjs` → `watchAsk`). Решает архитектор.
// 🛑 Чего хук не ловит, и это сказано вслух: путь, собранный во время работы скрипта (склейка строк, вычисленный `..`).
//
// 592-1: текст ФАЙЛА — содержимое Write/Edit и тело heredoc, которое `cat` или `tee` пишут в файл, — читается как текст этого
// файла: путь модуля (`import … from '../x'`, `require('../x')`) и ссылка Markdown считаются от папки самого файла. ✗ 589-4:
// строитель stripe записал heredoc'ом дверь с `import … from '../../../lib/stripe/stripe.mjs'`, хук посчитал путь от корня
// элемента, увидел «вне папки» — агент без бота 25 минут молча ждал разрешения. Тело heredoc, которое читает любая другая
// программа (`node <<'EOF'`, `cat <<'EOF' | node`, `git commit -F -`), исполняется сейчас и разбирается как сама команда.
// После любой правки этого файла — `npm run check:boundary-hook` (образцы; `--replay` — все вызовы из журналов элементов).
//
// Своё: папка элемента, его данные `data/services/<id>`, `logs/runtime.json` ядра (адрес ядра), временные папки, кэши npm и то,
// что нужно самому Claude Code в `~/.claude` (кроме чужих журналов `~/.claude/projects`). Всё остальное под домом человека — чужое.
// Запуск: `node element-boundary-hook.mjs --dir <папка элемента> --data <его данные> --root <корень узла>`; вход — JSON хука в stdin.

import { readFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { dirname, isAbsolute, resolve } from 'node:path'

const arg = (name) => { const i = process.argv.indexOf(name); return i > 0 ? process.argv[i + 1] : '' }
const norm = (p) => String(p).replace(/\\/g, '/').replace(/^\/([a-z])\//i, '$1:/').replace(/\/+$/, '').toLowerCase()
const DIR = norm(arg('--dir'))
const DATA = norm(arg('--data'))
const ROOT = norm(arg('--root'))
const HOME = norm(homedir())

const OWN = [DIR, DATA, `${ROOT}/logs/runtime.json`, `${HOME}/appdata/local/temp`, `${HOME}/appdata/roaming/npm`,
  `${HOME}/appdata/local/npm-cache`, `${HOME}/.npm`, `${HOME}/.cache`, `${HOME}/.claude`].filter(Boolean)
const FOREIGN_INSIDE_OWN = [`${HOME}/.claude/projects`]

const under = (p, base) => p === base || p.startsWith(`${base}/`)
function outside(p) {
  if (!(under(p, HOME) || (ROOT && under(p, ROOT)))) return false
  if (FOREIGN_INSIDE_OWN.some((b) => under(p, b))) return true
  return !OWN.some((b) => under(p, b))
}

// Пути в тексте: `C:\…`, `C:/…`, `/c/…`, `~/…`, `$HOME/…`, `%USERPROFILE%\…` и относительные с `..`. Адреса `scheme://` — не пути.
function pathsIn(text, cwd) {
  const out = []
  const t = String(text ?? '')
  for (const m of t.matchAll(/(?<![\w:/])([a-zA-Z]:[\\/][^\s"'`|&;<>()]*)/g)) out.push(m[1])
  for (const m of t.matchAll(/(?<![\w:./-])(\/[a-zA-Z]\/[^\s"'`|&;<>()]*)/g)) out.push(m[1])
  for (const m of t.matchAll(/(?:~|\$HOME|\$\{HOME\}|%USERPROFILE%)([\\/][^\s"'`|&;<>()]*)/g)) out.push(HOME + m[1])
  // 548-14: `..` — путь, только если перед ним нет точки: многоточие «wait...» читалось как родительская папка, и агент
  // переписывал свою заметку, пока не убрал многоточие (замерено 2026-10-20, template).
  for (const m of t.matchAll(/(?<![\w:/.])((?:\.\.[\\/])+[^\s"'`|&;<>()]*|\.\.(?=$|[\s"'`|&;<>()]))/g)) out.push(resolve(cwd || DIR, m[1]))
  return out.map((p) => norm(isAbsolute(p) || /^[a-z]:/i.test(p) ? p : resolve(cwd || DIR, p)))
}

// Пути, которые читает не процесс, а сам файл: их считают от папки файла node, TypeScript и просмотрщик Markdown. Прочие
// относительные пути текста (`readFileSync('../x')`) откроет процесс из своей папки — они считаются от папки команды, как прежде.
const FILE_RELATIVE = [
  /\b(?:from|import)\s*\(?\s*(['"`])(?<spec>\.\.?\/[^'"`\s]*)\1/g, // import … from '../a' · import '../a' · import('../a') · export … from
  /\brequire(?:\.resolve)?\s*\(\s*(['"`])(?<spec>\.\.?\/[^'"`\s]*)\1/g, // require('../a')
  /\bnew\s+URL\s*\(\s*(['"`])(?<spec>\.\.?\/[^'"`\s]*)\1(?=\s*,\s*import\.meta\.url)/g, // new URL('../a', import.meta.url)
  /\]\((?<spec>\.\.?\/[^)\s]*)\)/g, // ссылка Markdown [x](../a.md)
]
function fileTextPaths(text, file, cwd) {
  let t = String(text ?? '')
  if (!file) return pathsIn(t, cwd)
  const base = dirname(resolve(cwd || DIR, norm(file)))
  const out = []
  for (const re of FILE_RELATIVE) {
    t = t.replace(re, (...a) => { out.push(norm(resolve(base, a.at(-1).spec))); return ' '.repeat(a[0].length) })
  }
  return [...out, ...pathsIn(t, cwd)]
}

// Команда оболочки и тела её heredoc. Тело — текст файла, только если звено конвейера с heredoc — `cat > <файл>` (`>>`) или
// `tee [-a] <файл>` без трубы дальше и имя файла известно без подстановки (`$X`, `` `…` ``). Иначе тело — часть команды;
// незакрытый heredoc — тоже: при любом сомнении разбор строже, а не мягче.
const HEREDOC = /(?<!<)<<(?!<)(?<dash>-?)[ \t]*(?<raw>'[^'\n]*'|"[^"\n]*"|\\?[A-Za-z_][\w.-]*)/g
const unquote = (s) => String(s).replace(/^\\/, '').replace(/^(['"])(.*)\1$/, '$2')

function fileOf(line, at) {
  let start = 0
  let end = line.length
  let piped = false
  for (const m of line.matchAll(/&&|\|\||[;|]/g)) {
    if (m.index < at) start = m.index + m[0].length
    else { end = m.index; piped = m[0] === '|'; break }
  }
  const words = line.slice(start, end).replace(HEREDOC, ' ').match(/(?:[^\s"']+|"[^"]*"|'[^']*')+/g) ?? []
  let i = 0
  while (i < words.length && /^[A-Za-z_]\w*=/.test(words[i])) i++
  const prog = String(words[i] ?? '').replace(/^.*[\\/]/, '')
  const rest = words.slice(i + 1)
  let file = null
  if (prog === 'cat') {
    for (let k = 0; k < rest.length && file === null; k++) {
      const m = /^1?>>?(.*)$/.exec(rest[k])
      if (m) file = unquote(m[1] || rest[k + 1] || '')
    }
  } else if (prog === 'tee' && !piped) {
    file = unquote(rest.find((w) => !w.startsWith('-')) ?? '')
  }
  return file && !/[$`]/.test(file) ? file : null
}

function shellParts(command) {
  const head = []
  const files = []
  const pending = []
  for (const line of String(command ?? '').split('\n')) {
    const cur = pending[0]
    if (cur) {
      if ((cur.dash ? line.replace(/^\t+/, '') : line).replace(/\r$/, '') !== cur.word) { cur.body.push(line); continue }
      pending.shift()
      if (cur.file) files.push({ text: cur.body.join('\n'), file: cur.file })
      else head.push(cur.body.join('\n'))
      continue
    }
    head.push(line)
    for (const m of line.matchAll(HEREDOC)) {
      pending.push({ word: unquote(m.groups.raw), dash: m.groups.dash === '-', file: fileOf(line, m.index), body: [] })
    }
  }
  for (const cur of pending) head.push(cur.body.join('\n'))
  return { head: head.join('\n'), files }
}

let input = {}
try { input = JSON.parse(readFileSync(0, 'utf8') || '{}') } catch { process.exit(0) }
const tool = input.tool_name ?? ''
const ti = input.tool_input ?? {}
const cwd = input.cwd ?? DIR
const found = []
if (tool === 'Bash') {
  const { head, files } = shellParts(ti.command)
  found.push(...pathsIn(head, cwd), ...files.flatMap((f) => fileTextPaths(f.text, f.file, cwd)))
} else if (tool === 'PowerShell') {
  found.push(...pathsIn(ti.command, cwd))
} else {
  const file = ti.file_path ?? ti.notebook_path
  found.push(...pathsIn(ti.file_path, cwd), ...pathsIn(ti.notebook_path, cwd))
  for (const t of [ti.content, ti.new_string, ...(Array.isArray(ti.edits) ? ti.edits.map((e) => e?.new_string) : [])]) {
    found.push(...fileTextPaths(t, file, cwd))
  }
}
const hit = [...new Set(found)].find(outside)
if (!hit) process.exit(0)

process.stdout.write(JSON.stringify({
  hookSpecificOutput: {
    hookEventName: 'PreToolUse',
    permissionDecision: 'ask',
    permissionDecisionReason: `Outside your element's folder: ${hit}. Your boundary (CLAUDE.md, «Your boundary»): the architect decides.`,
  },
}))
