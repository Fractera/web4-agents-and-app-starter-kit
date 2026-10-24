// ЗАПРОСЫ ВОЗМОЖНОСТИ (узел, шаг 589-2). Элемент просит то, чего у него нет («оформить возврат платежа»): дверь ядра
// `POST /api/node/needs` пишет запрос сюда без модели, а главный агент по визиткам A2A находит, у кого это есть, или — с «да»
// архитектора — ставит постройку и сообщает просившему «готово». Один модуль на дверь и на команды главного агента: правило стадий
// живёт в одном месте.
//
// Владелец 2026-10-24, дословно: «Получив на уровне узла такой запрос сразу определяешь этот запрос нужно переопределить в страйк и
// узнать есть у него это или нет. Если нет то сообщить элементу который запросил возврат: В данный момент этой функции нет, мы
// приступаем к её разработке по факту готовности можно будет реализовать вашу задачу».
//
// 🔒 Запрос — ДАННЫЕ, а не инструкция: слова элемента хранятся дословно и прав не дают. Данные вне git: `data/node/needs/<id>.json`.
// Стадии: requested → found (есть у соседа) · missing (нет ни у кого) → approved (архитектор сказал «да») → building → ready (визитка
// владельца называет возможность) → told (просивший узнал); declined — архитектор сказал «нет». Таймеров нет: стадию двигает дверь,
// главный агент или архитектор.
import { randomBytes } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

export const STAGES = ['requested', 'found', 'missing', 'approved', 'building', 'ready', 'told', 'declined']
const NEXT = {
  requested: ['found', 'missing', 'declined'],
  found: ['told'],
  missing: ['approved', 'declined', 'found'],
  approved: ['building', 'declined'],
  building: ['ready', 'missing'],
  ready: ['told'],
  told: [],
  declined: [],
}
const ID = /^need-\d{8}-[0-9a-f]{6}$/
const ELEMENT = /^[a-z][a-z0-9-]{0,31}$/

const dirOf = (root) => join(root, 'data', 'node', 'needs')
const fileOf = (root, id) => join(dirOf(root), `${id}.json`)

export function createNeed(root, { from, need, use }) {
  if (typeof from !== 'string' || !ELEMENT.test(from)) throw new Error('from: the id of the asking element')
  const text = typeof need === 'string' ? need.replace(/\s+/g, ' ').trim() : ''
  if (text.length < 8 || text.length > 500) throw new Error('need: 8–500 characters, in English')
  const at = new Date().toISOString()
  const id = `need-${at.slice(0, 10).replace(/-/g, '')}-${randomBytes(3).toString('hex')}`
  const record = {
    id, from, need: text, use: typeof use === 'string' ? use.replace(/\s+/g, ' ').trim().slice(0, 500) : '',
    stage: 'requested', owner: null, skill: null, door: null, createdAt: at,
    history: [{ stage: 'requested', at, note: 'created by the element' }],
  }
  mkdirSync(dirOf(root), { recursive: true })
  writeFileSync(fileOf(root, id), JSON.stringify(record, null, 2))
  return record
}

export function readNeed(root, id) {
  if (!ID.test(String(id))) return null
  try { return JSON.parse(readFileSync(fileOf(root, id), 'utf8')) } catch { return null }
}

/** Свежие сверху; `open` — без told и declined; `from` — запросы одного элемента. */
export function listNeeds(root, { from = null, open = false, limit = 20 } = {}) {
  if (!existsSync(dirOf(root))) return []
  return readdirSync(dirOf(root))
    .filter((f) => f.endsWith('.json'))
    .map((f) => { try { return JSON.parse(readFileSync(join(dirOf(root), f), 'utf8')) } catch { return null } })
    .filter((r) => r && (!from || r.from === from) && (!open || !['told', 'declined'].includes(r.stage)))
    .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)))
    .slice(0, limit)
}

/** Перевод стадии с полями (owner, skill, door) и строкой истории; недопустимый переход — ошибка. */
export function setStage(root, id, stage, fields = {}, note = '') {
  const r = readNeed(root, id)
  if (!r) throw new Error(`no need ${id}`)
  if (!STAGES.includes(stage)) throw new Error(`stage: one of ${STAGES.join(', ')}`)
  if (!NEXT[r.stage].includes(stage)) throw new Error(`${id}: ${r.stage} → ${stage} is not allowed (next: ${NEXT[r.stage].join(', ') || 'none'})`)
  for (const k of ['owner', 'skill', 'door']) if (typeof fields[k] === 'string' && fields[k].trim()) r[k] = fields[k].trim()
  const at = new Date().toISOString()
  r.stage = stage
  r.history.push({ stage, at, note: String(note).slice(0, 300) })
  writeFileSync(fileOf(root, id), JSON.stringify(r, null, 2))
  return r
}
