// ПАПКА, В КОТОРОЙ ЖИВЁТ АГЕНТ (267-1, комплект — 269, корень узла — 275).
//
// 🔒 РАБОЧАЯ ПАПКА ЕСТЬ ЛИЧНОСТЬ АГЕНТА: `claude` читает `CLAUDE.md`, права и инструменты из папки
// запуска. Поэтому папку называет ОДНА функция, и её же печатает страница до запуска — страница не имеет
// права назвать одну папку, пока агент рождается в другой.
//
// 🔒 ИМЯ СЛУЖБЫ — ПАРАМЕТР, А НЕ КОНСТАНТА (269, слово владельца: «техническое решение, которое в качестве
// параметров принимает и возвращает возможность быстро встраивать в новые микросервисы»). Одна служба —
// одна сессия Claude Code и один Telegram-бот. 🪦 До 269 здесь стояло `AGENT_SERVICE = 'auth'`.
//
// 🔒 ДВЕ РАБОЧИЕ ПАПКИ, И ВЫБОР МЕЖДУ НИМИ — ДАННЫЕ, А НЕ ВЕТКА ПО ИМЕНИ (275):
//   `web4-item` — папка элемента `WEB4-ITEMS/<kind>/<id>`, как было: агент службы заперт её деревом;
//   `node`     — корень узла: так живёт агент САМОГО узла (вкладка «Строительство»), потому что его
//                предмет — код узла, и `CLAUDE.md` узла лежит в корне.
//   `main-agent` — `data/main-agent`, своя папка-репозиторий главного агента узла (548-4): он направляет просьбы к элементам,
//                рождает новые и ведёт их, а не строит код узла, — поэтому не грузит ни `CLAUDE.md` узла (252 тыс. знаков),
//                ни 61 навык корня (Claude Code берёт навыки из всех родителей до корня репозитория). Ставит её
//                `scripts/main-agent-install.mjs` из `lib/main-agent/`.
// Какая из двух — сказано в манифесте установки `architect/<группа>/agent-kit.json`, который пишет
// установщик. 🛑 Имени конкретной группы здесь нет и быть не должно: комплект переносим.
//
// 🔒 ИМЯ ПРОВЕРЯЕТСЯ ПО МАНИФЕСТУ, РЕЕСТРУ И ДИСКУ: службы, которой нет в
// `WEB4-ITEMS-REGISTRY/web4-items.json` или в `WEB4-ITEMS/<kind>/<id>`, не существует — мост отказывает
// словами, а не рождает агента в чужой папке. Имя приходит из браузера, поэтому и форма имени
// проверяется: путь из него собирается.

const { existsSync, readFileSync, readdirSync } = require('node:fs')
const path = require('node:path')

// 🛑 КОРЕНЬ — `process.cwd()`, КАК У ВСЕГО УЗЛА (`lib/domain/auth-env.ts`), а не `__dirname`: модуль
// читают и `server.js`, и бандл двери Next, а внутри бандла `__dirname` указывает в `.next`, не в проект.
const ROOT = process.cwd()
const ID_SHAPE = /^[a-z][a-z0-9-]{0,39}$/

// 🛑 ВТОРАЯ КОПИЯ ЗНАНИЯ О ПУТИ, И ОНА НАМЕРЕННАЯ: копия комплекта уезжает в папку службы целиком и не
// имеет права зависеть от `lib/web4-items/paths.cjs` узла. Расхождение ловит `npm run check:agent-kits`.
// Узел 343: папка следует адресу элемента (`data/services/<id>/address.json`); не перенесена — папка по id.
const LABEL = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/
const itemDir = (id, kind) => {
  const base = path.join(ROOT, 'WEB4-ITEMS', kind === 'user' ? 'user' : 'core')
  let a = null
  try { a = JSON.parse(readFileSync(path.join(ROOT, 'data', 'services', id, 'address.json'), 'utf8')).address } catch { /* адреса нет */ }
  if (typeof a === 'string' && LABEL.test(a) && a !== id && existsSync(path.join(base, a))) return path.join(base, a)
  return path.join(base, id)
}
const ARCHITECT = path.join(ROOT, 'app', '[lang]', '(architectLayer)', 'architect')

function registered() {
  try {
    const reg = JSON.parse(readFileSync(path.join(ROOT, 'WEB4-ITEMS-REGISTRY', 'web4-items.json'), 'utf8'))
    return Array.isArray(reg.services) ? reg.services.filter((s) => s && typeof s.id === 'string') : []
  } catch {
    return []
  }
}

/** Манифест установки комплекта в группу `architect/<id>/` или `null`, если комплекта там нет. */
function manifest(id) {
  if (!ID_SHAPE.test(id)) return null
  try {
    const m = JSON.parse(readFileSync(path.join(ARCHITECT, id, 'agent-kit.json'), 'utf8'))
    return m && typeof m === 'object' ? m : null
  } catch {
    return null
  }
}

/** Абсолютный путь папки агента или `null`, если имени нет в реестре, на диске или оно не той формы. */
function serviceDir(service) {
  const id = String(service ?? '')
  if (!ID_SHAPE.test(id)) return null
  // Корень узла — только по слову манифеста: иначе любая опечатка в имени открыла бы агенту весь узел.
  if (manifest(id)?.workspace === 'node') return ROOT
  if (manifest(id)?.workspace === 'main-agent') {
    const dir = path.join(ROOT, 'data', 'main-agent')
    return existsSync(path.join(dir, 'CLAUDE.md')) ? dir : null
  }
  const entry = registered().find((s) => s.id === id)
  if (!entry) return null
  const dir = itemDir(id, entry.kind)
  return existsSync(dir) ? dir : null
}

/**
 * Обслуживает ли элемент ОБЩАЯ копия комплекта (`architect/[item]`, узел 326): у элемента нет своей группы с комплектом
 * (`architect/<id>/agent-kit.json`), его страницы рисует дерево элемента, папка на диске есть. Это рождённые (`kind: user` с `born`) и
 * встроенные, которым своей группы не заводили (589-6, ✗ 2026-10-24: у stripe с шага 573 агента не было вовсе — `no-agent-kit`, и узел
 * не мог поручить ему постройку). Служба со своей копией через общую не идёт — её обслуживает своя.
 * 606 (владелец 2026-10-30: root — кастомный элемент со стандартным деревом): `kind: user` без `born` — root, он ставится из реестра, а не
 * рождается. ✗ С 2026-10-28 его группа снята, а здесь требовался `born` — агента у root не было (`no-agent-kit`). Признак один для обеих
 * зон: своей группы нет, папка есть.
 */
function isBornItem(service) {
  const id = String(service ?? '')
  if (!ID_SHAPE.test(id)) return false
  const entry = registered().find((s) => s.id === id)
  if (!entry || manifest(id) !== null) return false
  return existsSync(itemDir(id, entry.kind))
}

/** Группы, у которых комплект установлен и папка агента существует. Список — обходом, не перечнем. */
function agentServices() {
  let names = []
  try {
    names = readdirSync(ARCHITECT)
  } catch {
    return []
  }
  return names.filter((id) => manifest(id) !== null && serviceDir(id) !== null)
}

module.exports = { serviceDir, agentServices, isBornItem }
