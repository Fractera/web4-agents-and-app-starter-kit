// ПРИБОР СТОРОЖА ГРАНИЦЫ ЭЛЕМЕНТА (узел, шаг 592-1). Запуск: `npm run check:boundary-hook` — без модели: настоящий хук
// (`scripts/element-boundary-hook.mjs`) получает в stdin вход PreToolUse, как от Claude Code, и его ответ сверяется с образцом:
// `ask` — назван путь вне папки элемента, `allow` — хук молчит. Промах — код 1.
//   --hook <файл>     другая версия хука (негативный контроль: `git show <коммит>:scripts/element-boundary-hook.mjs > <файл>`);
//   --replay          вместо образцов — все вызовы Bash/PowerShell/Write/Edit из журналов сессий элементов этой машины
//                     (`~/.claude/projects/*WEB4-ITEMS*`, у сессии в настройках стоит этот хук), с папками элемента из его
//                     настроек (у удалённых и перенесённых — из пути сессии, их число печатается);
//   --against <файл>  при --replay: та же лента через вторую версию хука и каждое расхождение — какая версия спросила.
import { execFile } from 'node:child_process'
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const opt = (name) => { const i = process.argv.indexOf(name); return i > 0 ? process.argv[i + 1] : '' }
const HOOK = opt('--hook') || join(ROOT, 'scripts', 'element-boundary-hook.mjs')
const AGAINST = opt('--against')
const fwd = (p) => p.replace(/\\/g, '/')

function decide(hook, args, input) {
  return new Promise((done) => {
    const child = execFile(process.execPath, [hook, '--dir', args.dir, '--data', args.data, '--root', args.root], { windowsHide: true },
      (err, stdout) => {
        if (err) return done({ decision: 'error', hit: String(err.message).split('\n')[0] })
        try {
          const o = JSON.parse(stdout || '{}').hookSpecificOutput
          done(o ? { decision: o.permissionDecision, hit: o.permissionDecisionReason } : { decision: 'allow', hit: '' })
        } catch { done({ decision: 'error', hit: `not JSON: ${stdout.slice(0, 120)}` }) }
      })
    child.stdin.end(JSON.stringify({ hook_event_name: 'PreToolUse', ...input }))
  })
}

async function pool(items, size, work) {
  const out = new Array(items.length)
  let next = 0
  await Promise.all(Array.from({ length: size }, async () => { while (next < items.length) { const i = next++; out[i] = await work(items[i]) } }))
  return out
}

// ── Образцы: элемент stripe этого узла (папки не обязаны существовать — хук сверяет только текст путей).
const DIR = fwd(join(ROOT, 'WEB4-ITEMS', 'core', 'stripe'))
const ARGS = { dir: DIR, data: fwd(join(ROOT, 'data', 'services', 'stripe')), root: fwd(ROOT) }
const bash = (command) => ({ cwd: DIR, tool_name: 'Bash', tool_input: { command } })
const write = (file, content) => ({ cwd: DIR, tool_name: 'Write', tool_input: { file_path: `${DIR}/${file}`, content } })
const edit = (file, new_string) => ({ cwd: DIR, tool_name: 'Edit', tool_input: { file_path: `${DIR}/${file}`, old_string: 'x', new_string } })
const SAMPLES = [
  ['589-4: heredoc пишет дверь внутри элемента, импорт из ../../../lib', 'allow', bash([
    "cat > app/api/stripe-products/stripe-products.mjs <<'EOF'",
    '// The work of the door GET /api/stripe-products. Input: limit 1–100 (default 20).',
    "import { NO_KEYS, stripeOrNull } from '../../../lib/stripe/stripe.mjs'",
    'export async function handle(input) { return { status: 200, body: { input } } }',
    'EOF',
    "cat > app/api/stripe-products/stripe-products.test.mjs <<'EOF'",
    "import { handle } from './stripe-products.mjs'",
    'EOF',
    'npm run test:stripe-products 2>&1 | tail -20',
  ].join('\n'))],
  ['чтение соседа: cat ../../user/root/.env.local', 'ask', bash('cat ../../user/root/.env.local')],
  ['заголовок heredoc пишет к соседу: cat > ../neighbour/x', 'ask', bash("cat > ../neighbour/x <<'EOF'\nhello\nEOF")],
  ['548-14: многоточие в команде', 'allow', bash('echo "wait... then go"')],
  ['548-14: многоточие в заметке', 'allow', write('development-docs/current-step.md', 'Waiting for the core... then the door.')],
  ['тело heredoc исполняет node — путь к .env.local ядра', 'ask', bash(`node <<'EOF'\nrequire('fs').readFileSync('${fwd(ROOT)}/.env.local')\nEOF`)],
  ['тело heredoc идёт в файл, но называет ядро абсолютным путём', 'ask', bash(`cat > scripts/x.mjs <<'EOF'\nreadFileSync('${fwd(ROOT)}/.env.local')\nEOF`)],
  ['cat heredoc в трубу node — тело есть скрипт', 'ask', bash("cat <<'EOF' | node --input-type=module\nimport x from '../../../lib/stripe/stripe.mjs'\nEOF")],
  ['heredoc без закрывающей строки — тело остаётся командой', 'ask', bash("cat > x.mjs <<'EOF'\nimport a from '../../../lib/a.mjs'")],
  ['имя файла heredoc с подстановкой $OUT — тело остаётся командой', 'ask', bash("cat > \"$OUT/x.mjs\" <<'EOF'\nimport a from '../../../lib/a.mjs'\nEOF")],
  ['tee -a в свой файл, импорт соседнего файла элемента', 'allow', bash("tee -a lib/x.mjs <<'EOF'\nimport y from '../lib/y.mjs'\nEOF")],
  ['git commit -F - : тело не файл — разбирается как команда', 'ask', bash("git commit -q -F - <<'EOF'\nFix ../../../lib/a\nEOF")],
  ['Write: импорт из ../../../lib в файле на три папки вглубь', 'allow', write('app/api/x/route.mjs', "import a from '../../../lib/a.mjs'\n")],
  ['Write: импорт, который выходит из папки элемента', 'ask', write('app/x.mjs', "import a from '../../../lib/a.mjs'\n")],
  ['Write: скрипт читает ../root/.env.local — путь процесса, не файла', 'ask', write('scripts/x.mjs', "readFileSync('../root/.env.local')\n")],
  ['Edit: новый импорт из ../../lib', 'allow', edit('app/api/route.ts', "import a from '../../lib/a.mjs'")],
  ['Write: ссылка Markdown на папку выше внутри элемента', 'allow', write('development-docs/steps-done/3.md', 'See [backlog](../backlog.md).')],
  ['cd .. спрашивает', 'ask', bash('cd .. && ls')],
]

async function samples() {
  const got = await pool(SAMPLES, 8, ([, , input]) => decide(HOOK, ARGS, input))
  let misses = 0
  SAMPLES.forEach(([label, want], i) => {
    const ok = got[i].decision === want
    if (!ok) misses++
    console.log(`${ok ? 'ok  ' : 'FAIL'} ${want.padEnd(5)} ${label}${ok ? '' : `\n     got ${got[i].decision}: ${got[i].hit}`}`)
  })
  console.log(misses ? `===BOUNDARY_HOOK_FAIL=== ${misses} of ${SAMPLES.length} (hook ${HOOK})` : `===BOUNDARY_HOOK_OK=== ${SAMPLES.length} samples`)
  process.exit(misses ? 1 : 0)
}

// ── Лента: вызовы из журналов сессий элементов (у сессии в настройках стоит этот хук).
function hookArgsOf(cwd) {
  try {
    const s = JSON.parse(readFileSync(join(cwd, '.claude', 'settings.local.json'), 'utf8'))
    const cmd = (s.hooks?.PreToolUse ?? []).flatMap((m) => m.hooks ?? []).map((h) => String(h.command ?? ''))
      .find((c) => c.includes('element-boundary-hook.mjs')) ?? ''
    const m = /--dir "([^"]+)" --data "([^"]+)" --root "([^"]+)"/.exec(cmd)
    if (m) return { dir: m[1], data: m[2], root: m[3] }
  } catch {}
  // Элемент удалён или перенесён — папки выводятся из пути сессии `<узел>/WEB4-ITEMS/<зона>/<папка>` (до шага 519 — `AGI-ITEMS`):
  // для сравнения двух версий хука на одних и тех же входах этого хватает (данные — по имени папки, как у большинства элементов).
  const at = /^(.*)[\\/](?:WEB4|AGI)-ITEMS[\\/][^\\/]+[\\/]([^\\/]+)$/.exec(cwd)
  return at ? { dir: fwd(cwd), data: fwd(join(at[1], 'data', 'services', at[2])), root: fwd(at[1]), derived: true } : null
}
const TOOLS = new Set(['Bash', 'PowerShell', 'Write', 'Edit', 'MultiEdit', 'NotebookEdit'])
function calls() {
  const P = join(homedir(), '.claude', 'projects')
  const out = []
  let skipped = 0
  // Папки элементов живут в `<узел>/WEB4-ITEMS/`, и только им `element-isolate.mjs` ставит этот хук.
  for (const d of existsSync(P) ? readdirSync(P).filter((n) => n.includes('WEB4-ITEMS')) : []) {
    for (const f of readdirSync(join(P, d)).filter((n) => n.endsWith('.jsonl'))) {
      const seen = new Set()
      let args
      for (const line of readFileSync(join(P, d, f), 'utf8').split('\n')) {
        let o; try { o = JSON.parse(line) } catch { continue }
        if (!o.timestamp || !o.cwd) continue
        if (args === undefined) args = hookArgsOf(o.cwd)
        if (!args) break
        for (const c of Array.isArray(o.message?.content) ? o.message.content : []) {
          if (c?.type !== 'tool_use' || !TOOLS.has(c.name) || seen.has(c.id)) continue
          seen.add(c.id)
          out.push({ key: `${f.slice(0, 8)}/${String(c.id).slice(-8)}`, at: o.timestamp, args, input: { cwd: o.cwd, tool_name: c.name, tool_input: c.input } })
        }
      }
      if (args === null) skipped++
    }
  }
  return { list: out, skipped }
}

async function replay() {
  const { list, skipped } = calls()
  const a = await pool(list, 8, (c) => decide(HOOK, c.args, c.input))
  const b = AGAINST ? await pool(list, 8, (c) => decide(AGAINST, c.args, c.input)) : null
  const asks = a.filter((r) => r.decision === 'ask').length
  const derived = new Set(list.filter((c) => c.args.derived).map((c) => c.key.slice(0, 8))).size
  console.log(`calls ${list.length} (sessions: folders from the session path ${derived}, skipped ${skipped}); asks: ${asks}${b ? `, against: ${b.filter((r) => r.decision === 'ask').length}` : ''}`)
  const errors = [...a, ...(b ?? [])].filter((r) => r.decision === 'error')
  for (const r of errors.slice(0, 5)) console.log(`ERROR ${r.hit}`)
  list.forEach((c, i) => {
    const ti = c.input.tool_input
    const what = String(ti.command ?? ti.file_path ?? '').split('\n')[0].slice(0, 110)
    if (!b && a[i].decision === 'ask') console.log(`ask  ${c.at.slice(0, 16)} ${c.key} ${c.input.tool_name}: ${what}\n     ${a[i].hit}`)
    if (b && a[i].decision !== b[i].decision) {
      console.log(`${a[i].decision === 'ask' ? 'ONLY THIS ASKS ' : 'ONLY AGAINST ASKS'} ${c.at.slice(0, 16)} ${c.key} ${c.input.tool_name}: ${what}\n     ${(a[i].decision === 'ask' ? a[i] : b[i]).hit}`)
    }
  })
  process.exit(errors.length ? 1 : 0)
}

if (process.argv.includes('--replay')) await replay()
else await samples()
