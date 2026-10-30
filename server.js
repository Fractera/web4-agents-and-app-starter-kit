// СВОЙ СЕРВЕР WEB4.
//
// Почему он есть, хотя Next умеет запускаться сам: `next dev` и `next start` —
// чужие команды, внутрь которых нам не попасть. Всё, что будет дальше в этом
// проекте, живёт до и вокруг отдачи страницы: выбрать свободный порт, назвать
// себя, пережить закрытие терминала, честно остановиться. Этому нужен НАШ файл.
// Такой же формы, как наши микрослужбы на сервере: один server.js, запускаемый
// node, без сборки и без обёрток.

const { createServer } = require('node:http')
const { execFileSync } = require('node:child_process')
const next = require('next')
const { pickPort, writeRuntime } = require('./lib/server-port.cjs')
const { mountAgentKits } = require('./lib/agent-kit/mount.cjs')

// ── Хэш коммита. Он нужен не для красоты: без него нельзя отличить «сайт
// работает» от «работает ИМЕННО та сборка, которую я только что поставил».
// Читается ОДИН раз при старте — процесс не переживает смену коммита, а значит
// и хэш внутри него меняться не может.
//
// `.git` может не быть вовсе: человек скачал zip, или установщик клонировал
// с `--depth 1` и выбросил историю. Это не отказ — это «неизвестно», и так и
// должно быть написано на странице.
function readCommit() {
  try {
    return execFileSync('git', ['rev-parse', '--short', 'HEAD'], {
      cwd: __dirname,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim()
  } catch {
    return 'unknown'
  }
}

const hostname = process.env.HOST || 'localhost'
// dev по умолчанию: локальная среда — это работа с исходником, а не продакшн.
// Сборка включается явно, переменной, когда для неё настанет время.
const dev = process.env.NODE_ENV !== 'production'

// Страница читает эту переменную через process.env — другого способа передать
// значение из server.js внутрь приложения Next нет: это два разных мира, и
// общее у них только окружение процесса.
process.env.WEB4_COMMIT = readCommit()
process.env.WEB4_STARTED_AT = new Date().toISOString()

// 🔒 Порт выбирается ДО того, как поднят Next: его конструктор получает номер
// один раз и потом о нём только рассказывает. Почему не 3000 и почему не
// 49152+ — в `lib/server-port.cjs`, там же и блок портов продукта.
async function main() {
  const { port, moved, asked } = await pickPort(hostname)

  // Next должен знать тот же номер: по нему он строит адреса в сообщениях об
  // ошибках и в горячей перезагрузке.
  process.env.PORT = String(port)

  const app = next({ dev, hostname, port, dir: __dirname })
  const handle = app.getRequestHandler()

  await app.prepare()

  const server = createServer((req, res) => {
    handle(req, res)
  })
  // Туннель Cloudflare держит простаивающее соединение с узлом до 90 с (cloudflared `keepAliveTimeout`, по умолчанию 1m30s —
  // developers.cloudflare.com, «Origin parameters»), а Node закрывал его через 5 с. Запрос туннеля в закрываемое соединение получал разрыв,
  // посетитель — 502 («wsarecv: An existing connection was forcibly closed», журнал домена каждый день с 19.10; федеральный шаг 606,
  // владелец 2026-10-30: «Да, починить сейчас»). Узел держит соединение дольше туннеля; заголовки ждёт чуть дольше этого (совет Node).
  server.keepAliveTimeout = 120_000
  server.headersTimeout = 121_000

  // Комплекты агента служб (271): сокет `/pty/<служба>` и опрос ботов. Список служб находится обходом
  // папок `architect/<служба>/_agent-kit/` — здесь нет ни строки о конкретной службе.
  mountAgentKits(server, app)

  server.listen(port, hostname, () => {
    // Номер порта уходит в файл — его читают сторож здоровья и команда
    // «статус». Они обязаны спрашивать сервер, а не повторять предположение.
    writeRuntime({
      port,
      hostname,
      pid: process.pid,
      commit: process.env.WEB4_COMMIT,
      startedAt: process.env.WEB4_STARTED_AT,
      mode: dev ? 'dev' : 'production',
    })

    console.log(
      `WEB4 server · http://${hostname}:${port} · commit ${process.env.WEB4_COMMIT} · ${dev ? 'dev' : 'production'}`,
    )

    // Уступка порта — событие, о котором человек обязан узнать сразу. Молчание
    // здесь означает, что он открывает старый адрес, видит чужое приложение или
    // пустоту и считает, что сломались мы.
    if (moved) {
      console.log(
        `⚠ порт по умолчанию был занят — WEB4 встал на ${port}. Адрес: http://${hostname}:${port}`,
      )
    }
    if (asked) {
      console.log(`порт ${asked} задан переменной PORT`)
    }
  })
}

main().catch((error) => {
  // Отказ при старте печатается человеческими словами и уходит в журнал pm2 —
  // молчаливый выход с ненулевым кодом выглядит как «pm2 сломался».
  console.error(`WEB4 server не запустился: ${error.message}`)
  process.exit(1)
})
