// ЭЛЕМЕНТ ИЗ РЕПОЗИТОРИЯ ЧЕЛОВЕКА (узел, шаг 367-4). Зовёт `item-birth.mjs` после клона: распознать проект, написать паспорт,
// положить запускатель узла и файлы агента. Ничего не запускает и не ставит — установка идёт дальше обычным путём.
//
// Слова владельца 2026-10-01: «старт из своего репозитория введите ссылку на репозиторий»; «Агентские файлы добавляй, агента только
// по кнопке». Поддержка (рекомендация, принятая к работе): Next.js · Node-сервер со стартом `node <файл>` · статический сайт
// (Vite, Create React App, Gatsby, Astro). Остальное — отказ с причиной: агента узел сам не зовёт.
//
// 🔒 ФАЙЛЫ ЧЕЛОВЕКА НЕ ЗАТИРАЮТСЯ: свой паспорт у проекта — остаётся; `CLAUDE.md` — дописывается одна строка `@FRACTERA.md`;
// одноимённые навыки — не заменяются; окружение узла — в отдельный `.env.fractera`, а не в его `.env*`.

import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync, appendFileSync, copyFileSync } from 'node:fs'
import { join } from 'node:path'
import { spawnSync } from 'node:child_process'
import { tmpdir } from 'node:os'

const IS_WIN = process.platform === 'win32'
const KIT = (root) => join(root, 'lib', 'web4-items', 'repo-element')

/** Что за проект: `{ kind, mode, health, build }` или `{ reason }`. */
function recognise(dir) {
  // 434-3: элемент нового шаблона несёт паспорт папкой (OWN-SERVICE-PROPS/) — он тоже свой элемент, не чужой проект.
  if (existsSync(join(dir, 'OWN-SERVICE-PROPS.json')) || existsSync(join(dir, 'OWN-SERVICE-PROPS', 'OWN-SERVICE-PROPS.json'))) return { kind: 'element', own: true }
  const pkgFile = join(dir, 'package.json')
  if (!existsSync(pkgFile)) return { reason: 'в репозитории нет package.json — это не Node-проект. Узел ставит Next.js, Node-серверы со стартом «node <файл>» и статические сайты (Vite, Create React App, Gatsby, Astro)' }
  let pkg
  try { pkg = JSON.parse(readFileSync(pkgFile, 'utf8')) } catch { return { reason: 'package.json не читается как JSON' } }
  const deps = { ...(pkg.dependencies ?? {}), ...(pkg.devDependencies ?? {}) }
  const scripts = pkg.scripts ?? {}
  const build = typeof scripts.build === 'string' && scripts.build.trim() !== ''
  if (deps.next) {
    if (!build) return { reason: 'Next.js без скрипта build в package.json — собрать нечем' }
    return { kind: 'Next.js', mode: 'next', health: '/', build }
  }
  const start = String(scripts.start ?? '').match(/^node\s+([^\s]+)$/)
  if (start) return { kind: 'Node-сервер', mode: `node:${start[1]}`, health: '/', build }
  const statics = [['vite', 'dist', 'Vite'], ['react-scripts', 'build', 'Create React App'], ['gatsby', 'public', 'Gatsby'], ['astro', 'dist', 'Astro']]
  for (const [dep, out, name] of statics) {
    if (!deps[dep]) continue
    if (!build) return { reason: `${name} без скрипта build в package.json — собрать нечем` }
    return { kind: `статический сайт (${name})`, mode: `static:${out}`, health: '/api/health', build }
  }
  return { reason: 'проект не распознан: нет Next.js, старта «node <файл>» или сборщика статического сайта (Vite, Create React App, Gatsby, Astro). Такой проект может адаптировать агент элемента — по вашей просьбе' }
}

/** Навыки шаблона — из закреплённого тега, во временную папку; одноимённые навыки человека не заменяются. */
function copyTemplateSkills(dir, template, git) {
  // 407: импорт зовёт без шаблона, если `item-template.json` не прочитан, — тогда навыков шаблона нет, а не падение посреди импорта.
  if (!template?.repo || !template?.version) return 0
  const tmp = join(tmpdir(), `fractera-template-${Date.now()}`)
  const r = git(['clone', '--quiet', '--depth', '1', '--branch', template.version, template.repo, tmp], process.cwd())
  if (r.rc !== 0) return 0
  let added = 0
  try {
    const from = join(tmp, '.claude', 'skills')
    if (existsSync(from)) {
      const to = join(dir, '.claude', 'skills')
      mkdirSync(to, { recursive: true })
      for (const e of readdirSync(from, { withFileTypes: true })) {
        if (!e.isDirectory()) continue
        // Группа-плагин (552-2), которая у элемента уже есть: дописать недостающие навыки внутрь её `skills/`.
        const group = join(from, e.name, 'skills')
        if (existsSync(join(to, e.name)) && existsSync(join(from, e.name, '.claude-plugin', 'plugin.json')) && existsSync(group)) {
          mkdirSync(join(to, e.name, 'skills'), { recursive: true })
          for (const s of readdirSync(group, { withFileTypes: true })) {
            if (!s.isDirectory() || existsSync(join(to, e.name, 'skills', s.name))) continue
            cpSync(join(group, s.name), join(to, e.name, 'skills', s.name), { recursive: true })
            added += 1
          }
          continue
        }
        if (existsSync(join(to, e.name))) continue
        cpSync(join(from, e.name), join(to, e.name), { recursive: true })
        added += 1
      }
    }
  } finally {
    rmSync(tmp, { recursive: true, force: true })
  }
  return added
}

export function prepareRepoElement({ dir, id, template, root, git }) {
  const p = recognise(dir)
  if (p.reason) return { ok: false, reason: p.reason }

  if (!p.own) {
    const kit = KIT(root)
    copyFileSync(join(kit, 'fractera-start.mjs'), join(dir, 'fractera-start.mjs'))
    copyFileSync(join(kit, 'env.fractera.example'), join(dir, 'env.fractera.example'))
    let license = 'unknown'
    try { license = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8')).license ?? 'unknown' } catch { /* распознано выше */ }
    const passport = {
      id,
      name: id,
      summary: '',
      // 407: поля самоописания нынешнего стандарта — их читает поиск узла («кто в узле это умеет»); агент заполняет их в первой сессии
      // (`FRACTERA.md`), до того элемент находится только по роли.
      shortDescription: '',
      longDescription: '',
      accepts: '',
      returns: '',
      kind: 'microservice',
      entry: 'global',
      port: { desired: 24690, note: 'A wish, not a decision. The node assigns the actual port.' },
      env: { file: '.env.fractera', example: 'env.fractera.example', note: 'Written by the node; read by fractera-start.mjs. The project\'s own .env files are not touched.' },
      health: { path: p.health, expect: 200 },
      runtime: {
        stack: p.mode === 'next' ? 'next' : p.mode.startsWith('static:') ? 'static' : 'node',
        node: '>=20',
        ...(p.build ? { build: 'npm run build' } : {}),
        entry: 'fractera-start.mjs',
        entryArgs: [p.mode],
        note: `Born from a person's repository (367-4): ${p.kind}. The node launcher starts it on the node's port.`,
      },
      contract: [
        'Takes its port from the environment (PORT); never remembers a number.',
        'Lives independently: does not follow the project design and CONFIG.',
      ],
      provides: [],
      license,
    }
    writeFileSync(join(dir, 'OWN-SERVICE-PROPS.json'), JSON.stringify(passport, null, 2) + '\n', 'utf8')
    // `npm ci` установщика требует package-lock.json. Нет его (или замок yarn/pnpm) — узел создаёт npm-замок: версии могут
    // разойтись с замком yarn/pnpm — это называется в журнале.
    if (!existsSync(join(dir, 'package-lock.json'))) {
      const other = ['yarn.lock', 'pnpm-lock.yaml', 'bun.lockb'].find((f) => existsSync(join(dir, f)))
      const r = spawnSync('npm', ['install', '--package-lock-only', '--ignore-scripts', '--no-audit', '--no-fund'], { cwd: dir, encoding: 'utf8', shell: IS_WIN, windowsHide: true })
      if (r.status !== 0) return { ok: false, reason: `npm не смог составить package-lock.json: ${String(r.stderr ?? '').trim().split('\n').slice(-1)[0]}` }
      console.log(`  package-lock.json составлен узлом${other ? ` (у проекта был ${other} — версии зависимостей могут отличаться)` : ''}`)
    }
  }

  // Собственный пример окружения проекта → `.env.local`, если своих файлов окружения нет: обычный первый шаг любого проекта.
  // ✗ Замерено 367-4 на fractera-next-starter: без него Next-проект собрался, но `/` переадресовывал сам на себя (301-петля) —
  // проекту не хватало его собственных настроек (тот же дефект чистого клона, что в 354). Чужой `.env*` не затирается.
  const example = ['.env.local.example', '.env.example'].find((f) => existsSync(join(dir, f)))
  if (example && !['.env.local', '.env'].some((f) => existsSync(join(dir, f)))) {
    copyFileSync(join(dir, example), join(dir, '.env.local'))
    console.log(`  .env.local проекта создан из его ${example}`)
  }

  // Файлы агента: инструкция узла отдельным файлом, ссылка на неё в CLAUDE.md человека (создаётся, если нет).
  copyFileSync(join(KIT(root), 'FRACTERA.md'), join(dir, 'FRACTERA.md'))
  const claude = join(dir, 'CLAUDE.md')
  const text = existsSync(claude) ? readFileSync(claude, 'utf8') : null
  if (text === null) writeFileSync(claude, '@FRACTERA.md\n', 'utf8')
  else if (!text.includes('@FRACTERA.md')) appendFileSync(claude, `${text.endsWith('\n') ? '' : '\n'}\n@FRACTERA.md\n`, 'utf8')
  const skills = copyTemplateSkills(dir, template, git)
  // 407: записи состояния — `development-docs/current-step.md`, как у элемента из шаблона (412): его читает агент при каждом пробуждении.
  const docs = join(dir, 'development-docs')
  if (!existsSync(join(docs, 'current-step.md')) && !existsSync(join(docs, 'current-steps.md'))) {
    mkdirSync(docs, { recursive: true })
    writeFileSync(join(docs, 'current-step.md'), '# Current step\n\nNothing started yet. The element was born from its own repository (Fractera node, step 367-4).\n', 'utf8')
  }
  if (!existsSync(join(dir, 'TASK-REPORT.json'))) {
    writeFileSync(join(dir, 'TASK-REPORT.json'), JSON.stringify({ task: '', done: [], check: [], path: '', anchor: '' }, null, 2) + '\n', 'utf8')
  }
  const ignore = join(dir, '.gitignore')
  const ig = existsSync(ignore) ? readFileSync(ignore, 'utf8') : ''
  if (!/^\.env\.fractera$/m.test(ig)) appendFileSync(ignore, `${ig === '' || ig.endsWith('\n') ? '' : '\n'}.env.fractera\n`, 'utf8')
  console.log(`  файлы агента: FRACTERA.md, ссылка в CLAUDE.md, навыков шаблона добавлено: ${skills}`)
  return { ok: true, kind: p.own ? 'элемент Fractera (свой паспорт)' : p.kind }
}
