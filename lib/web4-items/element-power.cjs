// ЭЛЕМЕНТ ВЫКЛЮЧЕН (узел, шаг 567). Владелец 2026-10-22: «архитектура должна понимать что они есть но они выключены». Признак живёт
// в записи реестра узла — `off: { reason, at }` в рабочей копии `WEB4-ITEMS-REGISTRY/web4-items.json` (состояние этой машины, как версии:
// на сервере тот же элемент может быть включён, поэтому в паспорт элемента и в коммит ядра признак не идёт).
// Выключенный элемент есть в реестре, меню и Паспорте, но его процесс и сторож не запускаются: `ecosystem.config.cjs` их не строит, а
// каждое место запуска узла спрашивает `isOff`. Включает и выключает только человек (кнопка «Опасной зоны», `npm run element:power`).
const fs = require('node:fs')
const path = require('node:path')

const registryFile = (root) => path.join(root, 'WEB4-ITEMS-REGISTRY', 'web4-items.json')

function readRegistry(root = process.cwd()) {
  return JSON.parse(fs.readFileSync(registryFile(root), 'utf8'))
}

// Причина — строка (её пишет человек) или `{ en, ru, … }` (умолчание из паспорта элемента).
const reasonOk = (r) => (typeof r === 'string' && r.trim() !== '') || (r && typeof r === 'object' && typeof r.en === 'string')

/** Признак выключения записи реестра или null. */
function offOf(entry) {
  const off = entry && entry.off
  return off && typeof off === 'object' && reasonOk(off.reason) ? off : null
}

/** Причина на языке `lang` (запасной — английский). */
function reasonIn(off, lang = 'en') {
  if (!off) return ''
  return typeof off.reason === 'string' ? off.reason : off.reason[lang] || off.reason.en
}

function isOff(entry) {
  return offOf(entry) !== null
}

/** Выключен ли элемент по id (реестр читается заново — признак меняется без перезапуска читателя). */
function isOffById(id, root = process.cwd()) {
  try {
    return isOff((readRegistry(root).services || []).find((s) => s.id === id))
  } catch {
    return false
  }
}

function write(root, mutate) {
  const file = registryFile(root)
  const raw = fs.readFileSync(file, 'utf8')
  const nl = raw.includes('\r\n') ? '\r\n' : '\n'
  const reg = JSON.parse(raw)
  mutate(reg)
  const tmp = `${file}.${process.pid}.tmp`
  fs.writeFileSync(tmp, (JSON.stringify(reg, null, 2) + '\n').replace(/\n/g, nl), 'utf8')
  fs.renameSync(tmp, file)
}

function entryOf(reg, id) {
  const e = (reg.services || []).find((s) => s.id === id)
  if (!e) throw new Error(`unknown-element:${id}`)
  return e
}

/** Выключить: причина обязательна (человек видит её в ядре). Возвращает признак. */
function setOff(id, reason, root = process.cwd()) {
  const text = typeof reason === 'string' ? reason.trim().replace(/\s+/g, ' ') : ''
  if (!text || text.length > 200) throw new Error('reason-1-200')
  let off
  write(root, (reg) => {
    const e = entryOf(reg, id)
    off = { reason: text, at: new Date().toISOString() }
    e.off = off
    // Выбор человека: умолчание паспорта (`seedPower`) его больше не перебивает.
    e.powerChosenAt = off.at
  })
  return off
}

/** Включить: снять признак. Возвращает, был ли он. */
function setOn(id, root = process.cwd()) {
  let was = false
  write(root, (reg) => {
    const e = entryOf(reg, id)
    was = isOff(e)
    delete e.off
    e.powerChosenAt = new Date().toISOString()
  })
  return was
}

// УМОЛЧАНИЕ ЭЛЕМЕНТА (владелец 2026-10-22: «некоторые элементы приходят по дефолту выключенные такие как редис … а некоторые …
// включенные такие как обычные например кастомные элемент»). Поле паспорта `power: { default: "off", reason }` — свойство элемента,
// едет с его кодом; нет поля — включён. Засев при установке и рождении: применяется, только пока человек не выбирал сам
// (`powerChosenAt`). Возвращает true, если элемент только что выключен умолчанием.
function seedPower(id, passport, root = process.cwd()) {
  const p = passport && passport.power
  if (!p || p.default !== 'off' || !reasonOk(p.reason)) return false
  let seeded = false
  write(root, (reg) => {
    const e = entryOf(reg, id)
    if (e.powerChosenAt || isOff(e)) return
    e.off = { reason: p.reason, at: new Date().toISOString(), byDefault: true }
    seeded = true
  })
  return seeded
}

// 601 (владелец 2026-10-26: «Если свободной памяти больше чем 1 ГБ я хочу чтобы навык глубокой памяти был включён всегда»): пометка
// `powerAuto` — «включено правилом узла по свободной памяти» (`scripts/memory-by-free.mjs`). Правило выключает только то, что включило
// само; включение главным агентом на задачу и выбор человека этой пометки не ставят.
function setPowerAuto(id, on, root = process.cwd()) {
  write(root, (reg) => {
    const e = entryOf(reg, id)
    if (on) e.powerAuto = new Date().toISOString()
    else delete e.powerAuto
  })
}

/** Причина выключения словами на двух языках (её видит человек в ядре) — для выключения правилом узла. */
function setOffReason(id, reason, root = process.cwd()) {
  write(root, (reg) => {
    const e = entryOf(reg, id)
    if (e.off && reasonOk(reason)) e.off.reason = reason
  })
}

module.exports = { offOf, reasonIn, isOff, isOffById, setOff, setOn, seedPower, readRegistry, setPowerAuto, setOffReason }
