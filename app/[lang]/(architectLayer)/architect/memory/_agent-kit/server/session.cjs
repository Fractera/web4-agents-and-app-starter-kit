// ДЕРЖАТЕЛЬ ЖИВЫХ СЕССИЙ АГЕНТОВ (267-1, перенос `fractera-memory-starter/lib/fractera/build-session.mjs`;
// по службам — 269).
//
// 🎯 Слова владельца, сказанные о мастерской памяти и перенесённые вместе с ней: «до того как она будет
// запущена она не должна расходовать ресурсы компьютера» · «когда я перехожу в другие вкладки терминал
// должен продолжать работать» · «нужно быть кнопка остановить».
//
// 🔒 ОДНА СЛУЖБА — ОДНА СЕССИЯ (269): у каждой службы свой `claude` в своей папке и свой Telegram-бот в нём.
// Сессия живёт дольше сокета: сокет только подключён к ней. Хранится в `globalThis` по той же причине, что
// билет: дверь статуса (Next) и мост (`server.js`) — один процесс, два экземпляра модуля.
//
// 🛑 ПЕРЕЗАПУСК УЗЛА (пересборка, `pm2 restart`) УБИВАЕТ СЕССИИ — процессы `claude` дочерние. Это цена
// держателя внутри сервера сайта, и страница говорит о ней словами, а не прячет.

const KEY = '__web4TerminalSessions'
const BUFFER_BYTES = 256 * 1024

function box() {
  if (!globalThis[KEY]) globalThis[KEY] = new Map()
  return globalThis[KEY]
}

function current(service) {
  return box().get(service) ?? null
}

function register({ service, pid, proc, cwd, channel = false }) {
  const session = { service, buffer: '', clients: new Set(), pid, proc, cwd, channel, startedAt: new Date().toISOString() }
  box().set(service, session)
  return session
}

function remember(session, chunk) {
  session.buffer = (session.buffer + chunk).slice(-BUFFER_BYTES)
}

/** Что видно снаружи — факты, без процесса и сокетов. */
function status(service) {
  const s = box().get(service)
  if (!s) return { running: false }
  return { running: true, pid: s.pid, cwd: s.cwd, channel: Boolean(s.channel), clients: s.clients.size, startedAt: s.startedAt }
}

/** Все живые сессии узла (узел 345: полоса «Терминалы, которые нагружают ваш компьютер») — те же факты, что `status`. */
function list() {
  return [...box().keys()].map((service) => ({ service, ...status(service) }))
}

function closeAll(s, reason) {
  for (const ws of s.clients) {
    try { ws.close(1000, reason) } catch { /* уже закрыт */ }
  }
  s.clients.clear()
}

/** Остановить: убить процесс, закрыть подключённых, забыть сессию. */
function stop(service, reason = 'stopped') {
  const s = box().get(service)
  if (!s) return { ok: true, was: false }
  box().delete(service)
  closeAll(s, reason)
  try { s.proc.kill() } catch { /* уже мёртв */ }
  return { ok: true, was: true, pid: s.pid }
}

/** Процесс завершился сам (набрали `exit`, закрыли агента). */
function exited(session) {
  if (box().get(session.service) !== session) return
  box().delete(session.service)
  closeAll(session, 'exited')
}

module.exports = { current, register, remember, status, list, stop, exited }
