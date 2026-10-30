// npm run serve:rebuild:detached [-- <log file>] [--dry] — the core rebuild (`node scripts/serve.mjs rebuild`, the closed lid) in a
// hidden console of its own, detached from whoever started it, with a log (federal step 621-5, 2026-10-30; it came from the federal
// folder, where the federal agent rebuilt the core this way).
//
// Why: Claude Code stops its own background shells when memory runs low while a session idles; a build under a killed shell lived on and
// once failed with 0xc0000142 at a new worker. Here the build lives in its own console: this process starts itself again with `--child`,
// detached, and exits at once; the child writes everything into the log and ends it with `===REBUILD_RC=<code>===`.
// The main agent is a child of the core: the rebuild stops the core and ends the agent's session too. After it the person wakes the
// agent again (the owner's choice 2026-10-30: «Человек будит агента»); the agent reads the end of the log first.
import { spawn } from 'node:child_process'
import fs from 'node:fs'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const CORE = resolve(import.meta.dirname, '..')
const args = process.argv.slice(2)

if (args[0] !== '--child') {
  const log = resolve(args.find((a) => !a.startsWith('--')) ?? join(CORE, 'logs', `rebuild-${new Date().toISOString().replace(/[:.]/g, '-')}.log`))
  if (args.includes('--dry')) {
    console.log(`===REBUILD_DRY=== would run «node scripts/serve.mjs rebuild» in ${CORE}, detached, log ${log}`)
    process.exit(0)
  }
  fs.mkdirSync(resolve(log, '..'), { recursive: true })
  const child = spawn(process.execPath, [fileURLToPath(import.meta.url), '--child', log], { detached: true, windowsHide: true, stdio: 'ignore' })
  child.unref()
  console.log(`===REBUILD_DETACHED=== log ${log} — the node goes offline for 10–15 minutes; the end of the log says ===REBUILD_RC=<code>===`)
  process.exit(0)
}

const log = args[1]
const fd = fs.openSync(log, 'a')
fs.writeSync(fd, `===REBUILD_START=== ${new Date().toISOString()}\n`)
const build = spawn(process.execPath, ['scripts/serve.mjs', 'rebuild'], { cwd: CORE, stdio: ['ignore', fd, fd], windowsHide: true })
build.on('exit', (code, signal) => {
  fs.writeSync(fd, `\n===REBUILD_RC=${code}=== signal=${signal} ${new Date().toISOString()}\n`)
  fs.closeSync(fd)
})
