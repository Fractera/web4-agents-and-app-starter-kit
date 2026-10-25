// ТЕСТОВЫЕ УЧЁТНЫЕ ЗАПИСИ ДЛЯ РАЗБОРА (шаг 556-6). Владелец 2026-10-22: агент сам смотрит внутренние страницы, но только в учётной
// записи, которая «не должна быть реальным пользователем … не страшно потерять это пользователь должен подтвердить лично».
//
// Одна логика для двери ядра (`/api/node/study`), страницы согласия (`/api/node/study/consent`), запускателя окна
// (`scripts/study-login.mjs`), браузера разбора (`scripts/study-browser.mjs`) и команды главного агента (`npm run study`). Папка сайта —
// данные ядра (594-2; прежде — элемента `reverse`, снятого тем шагом): `data/study/accounts/<сайт>/` — `profile/` (профиль браузера),
// `pending.json` (окно открыто: одноразовый ключ окна),
// `consent.json` (согласие человека: дата, слова отметок, введённое имя сайта), `session.json` (что сайт записал в браузер ПОСЛЕ
// согласия — только число и отпечатки, без значений). Логина и пароля здесь нет никогда: человек входит сам в видимом окне.
// 🔒 Согласие и сессия связаны: принимается только сессия, замеченная запускателем после согласия в том же окне.
import { randomBytes } from 'node:crypto'
import { existsSync, mkdirSync, readdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { parseTarget } from '../site-rules.mjs'

// 🛑 От `process.cwd()`: в собранном сервере Next путь модуля указывает внутрь сборки (замерено 337). Скрипт, которого запускают не из
// корня (команда главного агента идёт из `data/main-agent`), сначала встаёт в корень — иначе читает чужую папку (✗ найдено 594-2).
export const STUDY_ROOT = join(process.cwd(), 'data', 'study', 'accounts')
const TRASH = join(process.cwd(), 'data', 'study', 'trash')

/** Слова трёх отметок согласия — их же человек видит в окне, они же ложатся в запись согласия. */
export const STATEMENTS = {
  en: [
    'This is not my main account and not the account of another person.',
    'It holds none of my personal or payment data.',
    'I am not afraid to lose it: the site may block it.',
  ],
  ru: [
    'Это не моя основная учётная запись и не учётная запись другого человека.',
    'В ней нет моих личных и платёжных данных.',
    'Её не страшно потерять: сайт может её заблокировать.',
  ],
}

/** Адрес или имя сайта → { site (имя хоста), origin } или { error }. Свои и частные адреса — только с `allowLocal` (проверка 556-6). */
export function siteOf(input, { allowLocal = false } = {}) {
  const raw = String(input ?? '').trim()
  const withScheme = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`
  if (allowLocal) {
    try { const u = new URL(withScheme); return { site: u.host.toLowerCase(), origin: u.origin } } catch { return { error: 'not an address' } }
  }
  const t = parseTarget(withScheme)
  if (t.error) return { error: t.error }
  return { site: t.url.host.toLowerCase(), origin: t.url.origin }
}

const SITE = /^[a-z0-9.-]+(:\d+)?$/
export const folderOf = (site) => (SITE.test(site) ? join(STUDY_ROOT, site.replace(':', '_')) : null)
const read = (p) => { try { return JSON.parse(readFileSync(p, 'utf8')) } catch { return null } }

function alive(pid) {
  if (!pid) return false
  try { process.kill(pid, 0); return true } catch (e) { return e.code === 'EPERM' }
}

/** Окно открывается: папка, профиль, одноразовый ключ окна (его знает только страница согласия этого окна). */
export function openPending(site, origin, pid) {
  const dir = folderOf(site)
  if (!dir) throw new Error('bad site name')
  mkdirSync(join(dir, 'profile'), { recursive: true })
  const nonce = randomBytes(16).toString('hex')
  writeFileSync(join(dir, 'pending.json'), JSON.stringify({ site, origin, nonce, pid: pid ?? null, at: new Date().toISOString() }, null, 2))
  return { dir, nonce }
}

/** Окно поднялось: его процесс и порт отладки (порт нужен только проверке 556-6, которая ведёт браузер сама). */
export function setPending(site, fields) {
  const p = join(folderOf(site), 'pending.json')
  const v = read(p)
  if (v) writeFileSync(p, JSON.stringify({ ...v, ...fields }, null, 2))
}

/** Согласие из окна: ключ окна совпал, отмечены все три, имя сайта введено точно. → { ok } или { error }. */
export function recordConsent({ site, nonce, checks, typed, lang }) {
  const dir = folderOf(String(site ?? ''))
  const pending = dir ? read(join(dir, 'pending.json')) : null
  if (!pending) return { error: 'no-window', message: 'No login window is open for this site.' }
  if (!nonce || nonce !== pending.nonce) return { error: 'bad-window', message: 'This form does not belong to the open login window.' }
  if (!Array.isArray(checks) || checks.length !== 3 || !checks.every(Boolean)) return { error: 'checks', message: 'All three statements must be ticked.' }
  // 556-9: адрес вписывают как угодно — с https://, с www, с косой чертой в конце; совпасть должен сам сайт.
  const bare = (s) => String(s ?? '').trim().toLowerCase().replace(/^https?:\/\//, '').replace(/[/?#].*$/, '').replace(/^www\./, '')
  if (!bare(typed) || bare(typed) !== bare(site)) return { error: 'typed', message: `Type the site address: ${site}` }
  const words = STATEMENTS[lang === 'ru' ? 'ru' : 'en']
  const consent = { site, at: new Date().toISOString(), statements: words, typed: site, nonce }
  writeFileSync(join(dir, 'consent.json'), JSON.stringify(consent, null, 2))
  rmSync(join(dir, 'session.json'), { force: true }) // старая сессия не переживает новое согласие
  return { ok: true, origin: pending.origin, consent }
}

export function writeSession(site, session) {
  writeFileSync(join(folderOf(site), 'session.json'), JSON.stringify(session, null, 2))
}

export function closePending(site) {
  rmSync(join(folderOf(site), 'pending.json'), { force: true })
}

/** Состояние одного сайта: согласие, сессия (только после согласия), открыто ли окно. */
export function stateOf(site) {
  const dir = folderOf(site)
  if (!dir || !existsSync(dir)) return null
  const consent = read(join(dir, 'consent.json'))
  const session = read(join(dir, 'session.json'))
  const pending = read(join(dir, 'pending.json'))
  const valid = Boolean(consent && session && session.consentAt === consent.at && Date.parse(session.at) > Date.parse(consent.at))
  return {
    site,
    consent: consent ? { at: consent.at, statements: consent.statements } : null,
    session: session ? { at: session.at, changed: session.changed, valid } : null,
    window: pending ? { at: pending.at, open: alive(pending.pid) } : null,
    profile: existsSync(join(dir, 'profile')),
  }
}

export function listStudy() {
  if (!existsSync(STUDY_ROOT)) return []
  return readdirSync(STUDY_ROOT, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => stateOf(d.name.replace(/_(\d+)$/, ':$1')))
    .filter(Boolean)
}

/** «Завершить и удалить»: окно гасится, папка уезжает в корзину переименованием (мгновенно), стирается без ожидания (закон 325-6). */
export function endStudy(site, killTree) {
  const dir = folderOf(site)
  if (!dir || !existsSync(dir)) return { ok: true, removed: false }
  const pending = read(join(dir, 'pending.json'))
  if (pending?.pid && alive(pending.pid)) killTree(pending.pid)
  mkdirSync(TRASH, { recursive: true })
  const to = join(TRASH, `${site.replace(':', '_')}-${Date.now()}`)
  try { renameSync(dir, to) } catch (e) { return { ok: false, error: `the folder is busy: ${e instanceof Error ? e.message : e}` } }
  setTimeout(() => { try { rmSync(to, { recursive: true, force: true }) } catch { /* the next end retries */ } }, 0)
  return { ok: true, removed: true }
}
