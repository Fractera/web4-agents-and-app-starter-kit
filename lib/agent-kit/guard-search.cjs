// 615-1 — СТОРОЖ МЕДЛЕННОГО ПОИСКА ГЛАВНОГО АГЕНТА: хук Claude Code `PreToolUse` (Bash | PowerShell), его ставит мост (`bridge.cjs`).
//
// ✗ 2026-10-30 13:22 (сессия 86264690): главный агент первой командой запустил `find . -path ./node_modules -prune -o -name SKILL.md …` из
// корня ядра — обход WEB4-ITEMS со всеми node_modules элементов шёл 2 минуты, до предела инструмента; человек в Telegram всё это время не
// видел ничего, а нужное агент взял из `npm run find` и `ls .claude/skills` той же команды.
// Сторож отклоняет рекурсивный обход ТЯЖЁЛОГО места — корня ядра, его родителей, WEB4-ITEMS (и `core`/`user` в ней), `node_modules` — и
// говорит агенту быстрый путь; узкий путь, `rg` и `git grep` (уважают .gitignore — WEB4-ITEMS в нём) и всё остальное пропускает. Любая
// ошибка разбора — пропуск: сторож не вправе ломать агенту обычную работу.
// Контракт (первоисточник code.claude.com/docs/en/hooks): JSON со stdin — `tool_name`, `tool_input.command`, `cwd`; отказ — stdout
// `hookSpecificOutput.permissionDecision: "deny"` и `permissionDecisionReason` (его видит агент), выход 0.
// Запуск: node guard-search.cjs <корень узла>   (корень — аргументом моста; прибор подаёт свой)

const path = require('node:path')

const REASON = 'Blocked by the node: a recursive scan of the whole core walks every element in WEB4-ITEMS with its node_modules and ' +
  'takes minutes while the person waits in Telegram. Use npm run find / contacts / card for elements and skills, ls .claude/skills for ' +
  'your own skills, and search code inside lib, app or scripts (grep -rn <word> lib scripts, or rg, or git grep).'

const canon = (p) => {
  let s = String(p).replace(/\\/g, '/')
  const m = /^\/([a-zA-Z])\//.exec(s)
  if (m) s = `${m[1]}:/${s.slice(3)}`
  return path.posix.normalize(s).replace(/\/+$/, '').toLowerCase()
}

/** Тяжёлое ли место `target` (относительно `cwd`) для узла с корнем `root`. */
function heavy(target, cwd, root) {
  const t = String(target).replace(/^["']|["']$/g, '')
  if (/^(~|\$HOME|\$\{HOME\}|\$PWD|\*)/.test(t)) return true
  const abs = canon(/^([a-zA-Z]:[\\/]|\/)/.test(t) ? t : path.posix.join(canon(cwd), t.replace(/\\/g, '/')))
  const r = canon(root)
  if (abs === '/' || r === abs || r.startsWith(`${abs}/`)) return true
  if (!abs.startsWith(`${r}/`)) return false
  const rel = abs.slice(r.length + 1).split('/')
  if (rel[0] === 'node_modules') return true
  return rel[0] === 'web4-items' && (rel.length === 1 || (rel.length === 2 && ['core', 'user'].includes(rel[1])))
}

/** Слова одной команды с учётом кавычек. */
function words(segment) {
  const out = []
  const re = /"((?:\\.|[^"\\])*)"|'([^']*)'|(\S+)/g
  let m
  while ((m = re.exec(segment))) out.push(m[1] ?? m[2] ?? m[3])
  return out
}

const BREAK = /\s*(?:&&|\|\||;|\||\n)\s*/

/** Причина отказа или null. */
function verdict(command, cwd, root, tool = 'Bash') {
  let here = cwd
  for (const segment of String(command).split(BREAK)) {
    const w = words(segment)
    if (!w.length) continue
    const cmd = w[0].replace(/^.*[\\/]/, '').replace(/\.exe$/i, '').toLowerCase()
    const args = w.slice(1)
    if (['cd', 'pushd', 'set-location', 'sl', 'chdir'].includes(cmd)) {
      const to = args.find((a) => !a.startsWith('-'))
      if (to) here = /^([a-zA-Z]:[\\/]|\/)/.test(to) ? to : path.posix.join(canon(here), to.replace(/\\/g, '/'))
      continue
    }
    const wide = (paths) => (paths.length ? paths : ['.']).some((p) => heavy(p, here, root))
    if (cmd === 'find' && tool === 'Bash') {
      if (/-maxdepth\s+[0-3]\b/.test(segment) || /web4-items['"]?\s+-prune/i.test(segment)) continue
      const starts = []
      for (const a of args) { if (/^[-(!]/.test(a)) break; starts.push(a) }
      if (wide(starts)) return REASON
    }
    if (['grep', 'egrep', 'fgrep'].includes(cmd)) {
      if (!args.some((a) => a === '--recursive' || /^-[a-zA-Z]*[rR][a-zA-Z]*$/.test(a))) continue
      if (/--exclude-dir=\S*web4-items/i.test(segment)) continue
      const plain = args.filter((a) => !a.startsWith('-'))
      const explicit = args.some((a) => a === '-e' || a === '-f' || /^--(regexp|file)=/.test(a))
      if (wide(explicit ? plain : plain.slice(1))) return REASON
    }
    if (cmd === 'ls' && tool === 'Bash' && args.some((a) => /^-[a-zA-Z]*R/.test(a)) && wide(args.filter((a) => !a.startsWith('-')))) return REASON
    if (cmd === 'du' && !args.some((a) => /^(-d|--max-depth)/.test(a)) && wide(args.filter((a) => !a.startsWith('-')))) return REASON
    if (cmd === 'tree' && !args.includes('-L') && wide(args.filter((a) => !a.startsWith('-')))) return REASON
    if (['get-childitem', 'gci', 'dir', 'ls'].includes(cmd) && (tool === 'PowerShell' || cmd !== 'ls')) {
      const recurse = args.some((a) => /^-r(e(c(u(r(s(e)?)?)?)?)?)?$/i.test(a) || /^\/s$/i.test(a))
      if (!recurse || args.some((a) => /^-depth$/i.test(a))) continue
      const paths = []
      for (let i = 0; i < args.length; i++) {
        if (/^-(path|literalpath)$/i.test(args[i])) { paths.push(args[++i]); continue }
        if (/^-(filter|include|exclude|depth)$/i.test(args[i])) { i++; continue }
        if (!args[i].startsWith('-') && !args[i].startsWith('/')) paths.push(args[i])
      }
      if (wide(paths.filter(Boolean))) return REASON
    }
  }
  return null
}

module.exports = { verdict, heavy, REASON }

if (require.main === module) {
  let raw = ''
  process.stdin.setEncoding('utf8')
  process.stdin.on('data', (d) => { raw += d })
  process.stdin.on('end', () => {
    try {
      const j = JSON.parse(raw)
      const root = process.argv[2] || j.cwd
      const why = ['Bash', 'PowerShell'].includes(j.tool_name) ? verdict(j.tool_input?.command ?? '', j.cwd || root, root, j.tool_name) : null
      if (why) process.stdout.write(JSON.stringify({ hookSpecificOutput: { hookEventName: 'PreToolUse', permissionDecision: 'deny', permissionDecisionReason: why } }))
    } catch { /* сторож не ломает работу */ }
    process.exit(0)
  })
}
