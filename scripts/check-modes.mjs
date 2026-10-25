// ПРИБОР РЕЖИМОВ СЕССИИ (узел, шаг 552-4). Запуск: `npm run check:modes`. Без модели: для каждого элемента с группами навыков
// (WEB4-ITEMS/*/<элемент>/.claude/skills/build-skills/.claude-plugin/plugin.json) спрашивает ту же функцию, которой мост запускает
// сессию (`lib/agent-kit/modes.cjs` → `modeSettings`), и проверяет:
//   - наборы видимых групп режимов не пересекаются, кроме `own-service-props-skills` (обнаружение — во всех режимах);
//   - строительство не видит `workspace-skills` и `messenger-skills`;
//   - каждая группа-папка элемента названа в модуле: у групп `defaultEnabled: true`, и неназванная группа осталась бы включённой
//     во ВСЕХ режимах;
//   - вне строительства каждый вендорный навык выключен;
//   - (552-5) у элемента с `.claude/modes/` подсказка сессии — фраза и законы своего режима: build несёт «Steps» без «Cron», work — наоборот.
// Владелец 2026-10-20 (552): «разделить процессы и протестировать что они не пересекаются». Нарушение — код 1.
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { createRequire } from 'node:module'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const modes = createRequire(import.meta.url)(join(ROOT, 'lib', 'agent-kit', 'modes.cjs'))

/** 591: без файлов режима — есть душа: файл «душа + фраза»; души нет: фраза строкой, как до 552-5. */
function soulAhead(dir) {
  const out = mkdtempSync(join(tmpdir(), 'check-modes-'))
  try {
    const args = modes.promptArgs(dir, 'build', out, 'unused')
    const soul = modes.soulText()
    if (!soul) return args[0] === '--append-system-prompt'
    return args[0] === '--append-system-prompt-file' && readFileSync(args[1], 'utf8').startsWith(soul)
  } finally {
    rmSync(out, { recursive: true, force: true })
  }
}
const MODES = ['build', 'work', 'messenger']
const problems = []
const dirs = (p) => (existsSync(p) ? readdirSync(p, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name) : [])

const elements = []
for (const kind of dirs(join(ROOT, 'WEB4-ITEMS'))) {
  for (const name of dirs(join(ROOT, 'WEB4-ITEMS', kind))) {
    const dir = join(ROOT, 'WEB4-ITEMS', kind, name)
    if (modes.hasGroups(dir)) elements.push({ name, dir })
  }
}

for (const { name, dir } of elements) {
  const seen = {}
  for (const mode of MODES) {
    const s = modes.modeSettings(dir, mode)
    seen[mode] = new Set(Object.entries(s.enabledPlugins).filter(([k, v]) => v === true && k.endsWith('@skills-dir')).map(([k]) => k.replace(/@skills-dir$/, '')))
    if (!seen[mode].has(modes.COMMON)) problems.push(`${name} ${mode}: нет группы обнаружения ${modes.COMMON}`)
    // Выключенная группа закрыта и для чтения файлом (✗ 552-4а: агент прочёл SKILL.md чужой группы инструментом Read).
    for (const g of modes.ALL.filter((x) => !seen[mode].has(x))) {
      if (!(s.permissions?.deny ?? []).includes(`Read(./.claude/skills/${g}/**)`)) problems.push(`${name} ${mode}: папка чужой группы ${g} не закрыта для чтения`)
    }
    if (mode !== 'build') {
      for (const v of modes.vendored(dir)) if (s.skillOverrides?.[v] !== 'off') problems.push(`${name} ${mode}: вендорный навык ${v} не выключен`)
    }
  }
  for (const g of ['workspace-skills', 'messenger-skills']) if (seen.build.has(g)) problems.push(`${name} build: видит ${g}`)
  for (let i = 0; i < MODES.length; i++) {
    for (let j = i + 1; j < MODES.length; j++) {
      const both = [...seen[MODES[i]]].filter((g) => g !== modes.COMMON && seen[MODES[j]].has(g))
      if (both.length) problems.push(`${name}: режимы ${MODES[i]} и ${MODES[j]} оба видят ${both.join(', ')}`)
    }
  }
  // 552-5: законы режима доходят до своей сессии и только до неё — тот же вызов, что у моста, во временную папку.
  if (modes.modeFile(dir, 'build') || modes.modeFile(dir, 'work')) {
    const out = mkdtempSync(join(tmpdir(), 'check-modes-'))
    // 552-7: у нативного элемента рабочего процесса нет — только `build.md`; его подсказка не несёт «Cron», а `work.md` не нужен.
    let native = false
    try { native = JSON.parse(readFileSync(join(dir, 'OWN-SERVICE-PROPS', 'OWN-SERVICE-PROPS.json'), 'utf8')).elementType === 'native' } catch { /* нет паспорта */ }
    const pairs = [['build', '## Steps', '## Cron automations'], ['work', '## Cron automations', '## Steps']]
    for (const [mode, own, foreign] of native ? pairs.slice(0, 1) : pairs) {
      // 591: файл подсказки теперь есть и без файла режима (в нём душа) — нет ли законов режима, спрашивается у самого файла режима.
      if (!modes.modeFile(dir, mode)) { problems.push(`${name} ${mode}: нет файла .claude/modes/${mode}.md — законы режима не дойдут`); continue }
      const args = modes.promptArgs(dir, mode, out, `${name}-${mode}`)
      const text = readFileSync(args[1], 'utf8')
      // 591: первой идёт душа узла (`lib/agent-kit/soul.md`), за ней фраза сессии.
      const head = [modes.soulText(), modes.sessionNote(mode)].filter(Boolean).join('\n\n')
      if (!text.startsWith(head)) problems.push(`${name} ${mode}: подсказка не начинается с души узла и фразы сессии`)
      if (!text.includes(own)) problems.push(`${name} ${mode}: в подсказке нет «${own}»`)
      if (text.includes(foreign)) problems.push(`${name} ${mode}: в подсказке чужой раздел «${foreign}»`)
    }
    rmSync(out, { recursive: true, force: true })
  } else if (!soulAhead(dir)) {
    problems.push(`${name}: без файлов режима подсказка обязана нести душу узла (или фразу строкой, если души нет, как до 552-5)`)
  }
  const skills = join(dir, '.claude', 'skills')
  for (const g of dirs(skills).filter((d) => existsSync(join(skills, d, '.claude-plugin', 'plugin.json')))) {
    if (!modes.ALL.includes(g)) problems.push(`${name}: группа ${g} не названа в lib/agent-kit/modes.cjs — с defaultEnabled она включена во всех режимах`)
  }
  // 590-5: проходы строительства. Вендорный навык со строкой `Pass:` включён только в своих проходах и закрыт для чтения в чужих; навык
  // без строки (элемент шаблона до 590-5) включён во всём строительстве, как прежде. Шаблон с разделом «Passes» в build.md обязан
  // назвать проход у каждого вендорного навыка и нести файлы проходов; модель прохода текстов — sonnet.
  const buildFile = join(dir, '.claude', 'modes', 'build.md')
  const withPasses = existsSync(buildFile) && readFileSync(buildFile, 'utf8').includes('## Passes')
  const vp = modes.vendoredPasses(dir)
  for (const [v, ps] of Object.entries(vp)) if (withPasses && !ps?.length) problems.push(`${name}: вендорный навык ${v} без строки Pass: в SOURCE.md`)
  const out = mkdtempSync(join(tmpdir(), 'check-modes-pass-'))
  for (const pass of modes.PASSES) {
    const s = modes.modeSettings(dir, 'build', {}, pass)
    for (const [v, ps] of Object.entries(vp)) {
      const isOff = s.skillOverrides?.[v] === 'off'
      if (!ps) { if (isOff) problems.push(`${name} build/${pass}: ${v} без строки Pass: выключен — элемент старого шаблона обязан жить как прежде`); continue }
      const own = ps.includes(pass)
      if (own && isOff) problems.push(`${name} build/${pass}: ${v} выключен, а его Pass: называет этот проход`)
      if (!own && !isOff) problems.push(`${name} build/${pass}: ${v} включён вне своих проходов (${ps.join(', ')})`)
      if (!own && !(s.permissions?.deny ?? []).includes(`Read(./.claude/skills/${v}/**)`)) problems.push(`${name} build/${pass}: папка выключенного ${v} не закрыта для чтения`)
    }
    if (withPasses && pass !== 'main') {
      const passFile = join(dir, '.claude', 'modes', `build-${pass}.md`)
      if (!existsSync(passFile)) { problems.push(`${name}: нет файла прохода .claude/modes/build-${pass}.md`); continue }
      const head = readFileSync(passFile, 'utf8').replace(/\r\n/g, '\n').split('\n')[0]
      const prompt = readFileSync(modes.promptArgs(dir, 'build', out, `${name}-build-${pass}`, pass)[1], 'utf8')
      if (!prompt.includes(head)) problems.push(`${name} build/${pass}: подсказка сессии не несёт законов прохода («${head}»)`)
      if (!prompt.includes(`runs the ${pass} pass`)) problems.push(`${name} build/${pass}: фраза сессии не называет проход`)
    }
  }
  rmSync(out, { recursive: true, force: true })
  if (!existsSync(join(dir, '.claude', 'launch-model.txt')) && modes.launchModel(dir, 'build', 'texts') !== 'sonnet') problems.push(`${name}: проход текстов не на sonnet`)
}

if (!elements.length) problems.push('ни одного элемента с группами навыков — прибору нечего проверять (ожидался хотя бы template)')
if (problems.length) {
  console.error('===MODES_FAIL===')
  for (const p of problems) console.error(`  ${p}`)
  process.exit(1)
}
console.log(`===MODES_OK=== элементов с группами: ${elements.length} (${elements.map((e) => e.name).join(', ')}); ` +
  MODES.map((m) => `${m}: ${modes.visibleGroups(m).join('+')}`).join(' · '))
