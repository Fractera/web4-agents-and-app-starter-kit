// НАДЗОР ГЛАВНОГО АГЕНТА ЗА ЭЛЕМЕНТОМ (узел, шаг 548-11).
//
// Слово владельца 2026-10-19: узел создаёт элемент, передаёт ему задание и запускает его агента, «а при другом стечении
// обстоятельств выступая в качестве старшего руководителя разработки лично отслеживать процесс его выполнения при необходимости
// передавая новые задания внутрь этого элемента но без личного участия».
//
// 🔒 Кто ведёт элемент — запись `data/node/supervision.json` (данные узла, вне git): `by: "architect"` (по умолчанию — человек
// сам ведёт работу в терминале или Telegram элемента) или `by: "main"` (ведёт главный агент узла). Пишет её главный агент
// командой `npm run supervise` / `npm run create -- --supervise main` в `data/main-agent`, по выбору человека.
// 🔒 Ничего по таймеру: шаг надзора — СОБЫТИЕ. Агент элемента сообщает узлу «закончил» (`POST /api/agents/done`) → общее
// подключение комплектов (`lib/agent-kit/mount.cjs`) зовёт `onDone` → главный агент просыпается с текстом ниже, смотрит состояние
// элемента и даёт следующее поручение или докладывает человеку. Предел циклов (`max`, по умолчанию 10) — после него надзор
// снимается сам и главный агент докладывает: модель не тратится бесконечно.
// 🛑 Главный агент не отвечает за человека на вопросы разрешений элемента (граница, `scripts/element-boundary-hook.mjs`): их
// видит только человек.

const { appendFileSync, mkdirSync, readFileSync, writeFileSync } = require('node:fs')
const path = require('node:path')

const DEFAULT_MAX = 10

function file(root) { return path.join(root || process.cwd(), 'data', 'node', 'supervision.json') }
function logFile(root) { return path.join(root || process.cwd(), 'data', 'node', 'supervision.jsonl') }

function read(root) {
  try {
    const j = JSON.parse(readFileSync(file(root), 'utf8'))
    return j && typeof j === 'object' && j.elements && typeof j.elements === 'object' ? j : { elements: {} }
  } catch { return { elements: {} } }
}

function write(root, j) {
  const f = file(root)
  mkdirSync(path.dirname(f), { recursive: true })
  writeFileSync(f, JSON.stringify(j, null, 2) + '\n', 'utf8')
}

function log(root, event) {
  try {
    mkdirSync(path.dirname(logFile(root)), { recursive: true })
    appendFileSync(logFile(root), JSON.stringify({ at: new Date().toISOString(), ...event }) + '\n', 'utf8')
  } catch { /* журнал не обязателен для работы */ }
}

/** Ведёт ли главный агент этот элемент сейчас. */
function byMain(id, root) {
  const r = read(root).elements[id]
  return Boolean(r && r.active && r.by === 'main' && (r.cycles ?? 0) < (r.max ?? DEFAULT_MAX))
}

/**
 * Записать, кто ведёт элемент: `main` | `architect` | `off`.
 * 🛑 548-15: смена ведущего без нового `brief` сохраняет прежний — `npm run supervise` его не передаёт, и пустая строка по умолчанию
 * стирала задание из записи (548-14: восстанавливал руками).
 */
function set(id, by, { max = DEFAULT_MAX, brief, root } = {}) {
  const j = read(root)
  if (by === 'off') {
    if (j.elements[id]) j.elements[id].active = false
  } else {
    const prev = j.elements[id]
    const given = brief === undefined || brief === null || String(brief).trim() === '' ? prev?.brief ?? '' : brief
    j.elements[id] = { by, active: true, cycles: prev && prev.by === by && prev.active ? prev.cycles ?? 0 : 0, max, since: new Date().toISOString(), brief: String(given).slice(0, 300) }
  }
  write(root, j)
  log(root, { id, event: 'set', by })
  return j.elements[id] ?? null
}

/**
 * Агент элемента сообщил «закончил». Ведёт главный агент — вернуть текст, с которым его будить, и засчитать цикл; на последнем
 * цикле надзор снимается, а текст говорит доложить человеку и остановиться. Не ведёт — `null`.
 */
function onDone(id, root, { conversation = false } = {}) {
  if (id === 'build') return null
  const j = read(root)
  const r = j.elements[id]
  if (!r || !r.active || r.by !== 'main') return null
  const max = r.max ?? DEFAULT_MAX
  const cycle = (r.cycles ?? 0) + 1
  r.cycles = cycle
  const last = cycle >= max
  if (last) r.active = false
  write(root, j)
  log(root, { id, event: 'done', cycle, max, last })
  const head = `Узел: агент элемента ${id} сообщил, что закончил (надзор, цикл ${cycle} из ${max}). Ты ведёшь этот элемент по поручению архитектора — навык supervise-element.`
  // 615-6 (✗ 2026-10-30 14:42: текст «Затем закрой свою сессию» попал в живой разговор — Haiku выключил storage и себя, доклад ушёл в --note):
  // главный агент в разговоре с человеком докладывает инструментом reply и себя не закрывает — выключает его только слово человека (603-3).
  const tell = conversation ? 'доложи архитектору в Telegram инструментом reply' : 'доложи архитектору'
  const end = conversation ? ' Свою сессию не закрывай: ты в разговоре с человеком, выключает тебя только его слово «выключить».' : ' Затем закрой свою сессию: npm run done -- --close.'
  const what = last
    ? ' Это последний цикл: надзор снят. Посмотри состояние (npm run state -- ' + id + ') и ' + tell + ', что сделано и что осталось (строка «Report to you» — ответ элемента на твою проверку, навык ask-element); новых поручений не давай. «Turned on by you: yes» — выключи его: npm run close -- ' + id + '.' + end
    : ' Посмотри состояние: npm run state -- ' + id + '. Ждёт подтверждения плана или ответа — ответь ему: npm run task -- ' + id + ' "<ответ>". Задание выполнено — ' + tell + ' и сними надзор: npm run supervise -- ' + id + ' off.'
  // 571-6 (владелец 2026-10-30: элемент «закончит работу и предложит разбор и этот вопрос должен вернуть именно главное агент а ответ
  // главному агенту должен запустить разбор внутри того же элемента»): предложение разбора — человеку через тебя, одной строкой.
  const review = ' Докладывая итог, предложи одной строкой: если что-то сделано не так, как человек хочет, — пусть скажет «разбор» и что именно; тогда npm run review -- ' + id + ' "<его слова>" (только по его слову).'
  return head + what + review + ' Сам не строишь и на вопросы разрешений за человека не отвечаешь.'
}

module.exports = { read, byMain, set, onDone, log, DEFAULT_MAX }
