// ГЛАВНЫЙ АГЕНТ УЗЛА ЖИВЁТ В КОРНЕ ЯДРА (узел, шаг 610, 2026-10-30): `npm run main-agent:install`.
//
// 🪦 С шага 548-4 по 610 он жил в своей папке-репозитории `data/main-agent`: корневой CLAUDE.md (тогда 252 361 знак) и 61 навык корня
// стоили 124 786 токенов первого запроса. Владелец 2026-10-29, узнав, что агент не видит проекта, который строит: «почему он не находится
// в корне?» — и «yes to do it». Инструкция ядра теперь ~28 тыс. знаков (шаг 608), навыки, не нужные ядру, выключены здесь.
// Что делает установка:
//   · `.claude/settings.local.json` корня — чужое вон (`lib/agent-kit/foreign-off.mjs`) и навыки корня из `lib/main-agent/root-skills-off.json`
//     выключены (`skillOverrides: off`); файл локальный, вне git (`.gitignore`), и действует на любую сессию в корне — главный агент и есть она;
//   · `.claude/launch-tools.txt` и `.claude/launch-model.txt` корня — инструменты и модель его сессии (мост, `lib/agent-kit/modes.cjs`);
//   · `data/main-agent/` остаётся папкой его данных: каталоги «Автоматизированного управления» (`OWN-SERVICE-PROPS`), расписание `data/`;
//     прежние копии (CLAUDE.md, package.json, навыки) оттуда убираются — их источники в git ядра.
// Свои навыки главного агента лежат в `.claude/skills/` корня (610-4), команды — в `package.json` ядра (610-2). Зовут:
// `npm run main-agent:install` и `scripts/element-isolate.mjs`.

import { copyFileSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { foreignOff } from '../lib/agent-kit/foreign-off.mjs'

export function installMainAgent(root) {
  const src = join(root, 'lib', 'main-agent')
  const data = join(root, 'data', 'main-agent')
  if (!existsSync(join(src, 'root-skills-off.json'))) { console.log('===MAIN_AGENT_INSTALL_SKIP=== нет lib/main-agent/root-skills-off.json'); return false }
  // 558-3: каталоги «Автоматизированного управления» (события и внешние сервисы) — как у элемента; расписание `data/` своё, вне git.
  mkdirSync(join(data, 'OWN-SERVICE-PROPS'), { recursive: true })
  for (const f of ['CRON.json', 'SUBSCRIPTIONS.json']) if (existsSync(join(src, 'OWN-SERVICE-PROPS', f))) copyFileSync(join(src, 'OWN-SERVICE-PROPS', f), join(data, 'OWN-SERVICE-PROPS', f))
  // 610-5: прежние копии папки агента; узел их больше не читает (служба build — `workspace: node`).
  const gone = ['CLAUDE.md', 'package.json', join('.claude', 'skills')].filter((f) => existsSync(join(data, f)))
  for (const f of gone) rmSync(join(data, f), { recursive: true, force: true })
  // 569-3: встроенные инструменты Claude Code главного агента. 610-4: Glob и Grep — он строит код ядра.
  mkdirSync(join(root, '.claude'), { recursive: true })
  writeFileSync(join(root, '.claude', 'launch-tools.txt'), `${process.platform === 'win32' ? 'Bash,PowerShell,Read,Write,Edit,Glob,Grep,Skill' : 'Bash,Read,Write,Edit,Glob,Grep,Skill'}\n`, 'utf8')
  // 🪦 570 «главный агент — sonnet» снято владельцем 2026-10-30 (шаг 610): «Opus — он строит ядро (Рекомендую)».
  writeFileSync(join(root, '.claude', 'launch-model.txt'), 'opus\n', 'utf8')
  const file = join(root, '.claude', 'settings.local.json')
  let s = {}
  try { s = JSON.parse(readFileSync(file, 'utf8')) } catch { /* нет файла — начинаем с пустого */ }
  // 548-13: без блока чтения вне папки — с ним каждая команда с подоболочкой ждала бы человека, а главного агента будит событие.
  s.permissions = { ...(s.permissions ?? {}) }
  delete s.permissions.blockReadsOutsideWorkingDirectories
  delete s.claudeMdExcludes
  const off = Object.keys(JSON.parse(readFileSync(join(src, 'root-skills-off.json'), 'utf8')).off ?? {})
  const { settings } = foreignOff()
  const { skillOverrides, enabledPlugins, ...rest } = settings
  Object.assign(s, rest)
  s.skillOverrides = { ...(s.skillOverrides ?? {}), ...skillOverrides, ...Object.fromEntries(off.map((n) => [n, 'off'])) }
  s.enabledPlugins = { ...(s.enabledPlugins ?? {}), ...enabledPlugins }
  writeFileSync(file, JSON.stringify(s, null, 2) + '\n', 'utf8')
  const size = readFileSync(join(root, 'CLAUDE.md'), 'utf8').length
  console.log(`===MAIN_AGENT_INSTALL_OK=== корень ядра: CLAUDE.md ${size} знаков, навыков корня выключено ${off.length}${gone.length ? `, из data/main-agent убрано: ${gone.join(', ')}` : ''}`)
  return true
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) installMainAgent(process.cwd())
