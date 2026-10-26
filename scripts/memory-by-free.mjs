// ГЛУБОКАЯ ПАМЯТЬ ВКЛЮЧЕНА, ПОКА СВОБОДНОЙ ПАМЯТИ БОЛЬШЕ 1 ГБ (узел, шаг 601).
// `node scripts/memory-by-free.mjs [--settle <сек>] [--free <МБ>] [--dry]`
//
// 🎯 Владелец 2026-10-26: «Если свободной памяти больше чем 1 ГБ я хочу чтобы навык глубокой памяти был включён всегда. В отличие от
// Rivers инжиниринг это важно.» Когда мерить — его выбор: «При запуске узла и после сборки (Рекомендую)».
// Запускает его один раз сервер ядра при своём старте (`instrumentation.ts`, через `spawn-free.mjs` — вне дерева ядра): ядро стартует
// при включении компьютера (`pm2 resurrect`), при `serve start` и после каждой сборки. Таймеров и повторов нет.
//
// Правило:
//   • свободно > 1 ГБ, память выключена → включить (`element-power.mjs memory on`) и пометить `powerAuto`;
//   • свободно ≤ 1 ГБ, память включена ЭТИМ правилом → выключить с причиной; включённую главным агентом на задачу — не трогать;
//   • у включённой памяти к свободной прибавляется то, что занимает она сама (процесс и сторож, `pm2 jlist`): иначе включённая при
//     1,1 ГБ память сама опускала бы свободное ниже порога и выключалась бы при следующем замере.
// `--settle` — пауза до замера (по умолчанию 60 с: службы узла успевают подняться); `--free`, `--assume off|on|on-auto` и `--dry` — для
// прибора: подставное число, подставное состояние и решение без действия. Повторный запуск чаще раза в 2 минуты пропускается (серия перезапусков ядра не дёргает память).
import { spawnSync } from 'node:child_process'
import { appendFileSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import os from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const require = createRequire(import.meta.url)
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const power = require('../lib/web4-items/element-power.cjs')
const IS_WIN = process.platform === 'win32'
const MEMORY = 'memory'
const THRESHOLD_MB = 1024
const STATE = join(ROOT, 'data', 'node', 'memory-by-free.json')
const LOG = join(ROOT, 'logs', 'memory-by-free.log')

const args = process.argv.slice(2)
const opt = (name) => (args.includes(name) ? args[args.indexOf(name) + 1] : undefined)
const dry = args.includes('--dry')
const settle = Number(opt('--settle') ?? 60)
const forcedFree = opt('--free') !== undefined ? Number(opt('--free')) : null

function say(line) {
  const row = `${new Date().toISOString()} ${line}`
  console.log(row)
  if (dry) return
  try { mkdirSync(dirname(LOG), { recursive: true }); appendFileSync(LOG, row + '\n', 'utf8') } catch { /* журнал — не условие */ }
}

function childEnv() {
  const env = {}
  for (const [k, v] of Object.entries(process.env)) {
    if (/^(__NEXT|NEXT_|AGI_)/.test(k) || ['PORT', 'HOSTNAME', 'NODE_ENV'].includes(k)) continue
    env[k] = v
  }
  return env
}

/** Сколько занимает память узла сама (процесс и сторож), МБ — по `pm2 jlist`. */
function memoryOwnMb() {
  const r = spawnSync(IS_WIN ? 'pm2.cmd' : 'pm2', ['jlist'], { cwd: ROOT, shell: IS_WIN, windowsHide: true, env: childEnv(), encoding: 'utf8' })
  try {
    const apps = JSON.parse(r.stdout)
    const bytes = apps
      .filter((a) => a.name === `fractera-svc-${MEMORY}` || a.name === `fractera-svc-${MEMORY}-watch`)
      .reduce((n, a) => n + (a.monit?.memory ?? 0), 0)
    return Math.round(bytes / 1048576)
  } catch {
    return 0
  }
}

function elementPower(action, reason) {
  const r = spawnSync(process.execPath, [join(ROOT, 'scripts', 'element-power.mjs'), MEMORY, action, ...(reason ? [reason] : [])], {
    cwd: ROOT, encoding: 'utf8', windowsHide: true, env: childEnv(), timeout: 180_000,
  })
  return `${r.stdout ?? ''}${r.stderr ?? ''}`.trim().split(/\r?\n/).pop() ?? ''
}

// Повторный запуск чаще раза в 2 минуты — пропуск.
if (!dry) {
  try {
    const last = JSON.parse(readFileSync(STATE, 'utf8'))
    if (Date.now() - Date.parse(last.at) < 120_000) {
      console.log(`===MEMORY_BY_FREE=== skipped: decided ${Math.round((Date.now() - Date.parse(last.at)) / 1000)} s ago`)
      process.exit(0)
    }
  } catch { /* первого решения ещё не было */ }
}

if (settle > 0) await new Promise((res) => setTimeout(res, settle * 1000))

const entry = (power.readRegistry(ROOT).services || []).find((s) => s.id === MEMORY)
if (!entry) {
  say('===MEMORY_BY_FREE=== no memory element in the registry — nothing to do')
  process.exit(0)
}
// Только для прибора (`--dry`): подставное состояние памяти — off · on (включена не правилом) · on-auto (включена правилом).
const assume = dry ? opt('--assume') : undefined
const isOn = assume ? assume !== 'off' : !power.isOff(entry)
const free = forcedFree ?? Math.round(os.freemem() / 1048576)
const own = isOn && forcedFree === null ? memoryOwnMb() : 0
const effective = free + own
const auto = assume ? assume === 'on-auto' : Boolean(entry.powerAuto)

let decision
if (effective > THRESHOLD_MB && !isOn) {
  decision = 'on'
} else if (effective <= THRESHOLD_MB && isOn && auto) {
  decision = 'off'
} else {
  decision = isOn ? (auto || effective > THRESHOLD_MB ? 'keep-on' : 'keep-on-not-ours') : 'keep-off'
}
const head = `memory: free ${free} MB${own ? ` + own ${own} MB` : ''} = ${effective} MB, threshold ${THRESHOLD_MB} MB, now ${isOn ? 'on' : 'off'}${auto ? ' (auto)' : ''}`

if (dry) {
  console.log(`===MEMORY_BY_FREE=== dry: ${head} → ${decision}`)
  process.exit(0)
}

let result = ''
if (decision === 'on') {
  result = elementPower('on')
  if (/===POWER_ON===/.test(result)) power.setPowerAuto(MEMORY, true, ROOT)
} else if (decision === 'off') {
  result = elementPower('off', `Free memory is ${free} MB, below 1 GB — turned on for a memory task`)
  if (/===POWER_OFF===/.test(result)) {
    power.setPowerAuto(MEMORY, false, ROOT)
    power.setOffReason(MEMORY, {
      en: `Free memory was ${free} MB, below 1 GB — turned on for a memory task: «remember» and «remind me about»`,
      ru: `Свободной памяти было ${free} МБ, меньше 1 ГБ — включается на задачу памяти: «запомни» и «напомни о»`,
    }, ROOT)
  }
} else if (decision === 'keep-off' && auto) {
  // Память выключили, пока она была включена правилом: пометка больше не правда.
  power.setPowerAuto(MEMORY, false, ROOT)
}

writeFileSync(STATE, JSON.stringify({ at: new Date().toISOString(), free, own, effective, threshold: THRESHOLD_MB, decision, result }, null, 2) + '\n')
say(`===MEMORY_BY_FREE=== ${head} → ${decision}${result ? ` · ${result}` : ''}`)
