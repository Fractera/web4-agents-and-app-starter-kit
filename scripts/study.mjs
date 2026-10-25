// npm run study -- list | login <сайт> [--lang ru] | end <сайт> — тестовые учётные записи для разбора (шаг 556-6), команда главного
// агента. login открывает окно входа на экране ЭТОГО компьютера и сразу возвращается (запускатель живёт отдельно, пока человек не
// закроет окно); итог — `npm run study -- list`. Пароль не вводит никто, кроме человека, в самом окне.
import { spawn, spawnSync } from 'node:child_process'
import { join } from 'node:path'

// 🛑 594-2: главный агент зовёт команду из `data/main-agent` (npm запускает скрипт в папке своего package.json), а папки учётных
// записей считаются от `process.cwd()` — сначала встать в корень ядра, потом читать (✗ до 594-2 `list` смотрел в чужую папку).
process.chdir(join(import.meta.dirname, '..'))
const { endStudy, listStudy, siteOf } = await import('../lib/study/study.mjs')

const [command, input, ...rest] = process.argv.slice(2)
const say = (m) => console.log(m)

if (command === 'list') {
  const all = listStudy()
  if (!all.length) say('no test accounts yet')
  for (const a of all) {
    const consent = a.consent ? `consent ${a.consent.at}` : 'no consent'
    const session = a.session ? (a.session.valid ? `signed in ${a.session.at}` : 'session not valid (older than the consent)') : 'not signed in'
    say(`${a.site} · ${consent} · ${session}${a.window?.open ? ' · the login window is open' : ''}`)
  }
  say(`===STUDY_ACCOUNTS=== ${all.length}`)
} else if (command === 'login' || command === 'end') {
  const t = siteOf(input)
  if (t.error) { say(`===STUDY_FAILED=== ${t.error}`); process.exit(1) }
  if (command === 'end') {
    const kill = (pid) => (process.platform === 'win32'
      ? spawnSync('taskkill', ['/PID', String(pid), '/T', '/F'], { windowsHide: true, stdio: 'ignore' })
      : (() => { try { process.kill(-pid, 'SIGTERM') } catch { /* gone */ } })())
    const r = endStudy(t.site, kill)
    say(r.ok ? `===STUDY_ENDED=== ${t.site}${r.removed ? ': the profile is deleted' : ': nothing to delete'}` : `===STUDY_FAILED=== ${r.error}`)
    process.exit(r.ok ? 0 : 1)
  }
  const lang = rest.includes('--lang') ? rest[rest.indexOf('--lang') + 1] : 'en'
  const root = join(import.meta.dirname, '..')
  const child = spawn(process.execPath, [join(root, 'scripts', 'spawn-free.mjs'), join(root, 'scripts', 'study-login.mjs'), t.site, '--lang', lang === 'ru' ? 'ru' : 'en'],
    { cwd: root, detached: true, windowsHide: true, stdio: 'ignore' })
  child.unref()
  say(`===STUDY_WINDOW_OPENING=== ${t.site}: the login window opens on this computer — the person ticks three statements, types the site name and signs in; then npm run study -- list`)
} else {
  say('usage: npm run study -- list | login <site> [--lang ru] | end <site>')
  process.exit(1)
}
