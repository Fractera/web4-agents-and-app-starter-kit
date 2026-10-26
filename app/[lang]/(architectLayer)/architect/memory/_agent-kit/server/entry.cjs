// ВХОД КОПИИ КОМПЛЕКТА ДЛЯ УЗЛА (271).
//
// 🔒 ОБЩЕЕ ПОДКЛЮЧЕНИЕ УЗЛА (`lib/agent-kit/mount.cjs`) НАХОДИТ ЭТОТ ФАЙЛ В `architect/<служба>/_agent-kit/server/`
// САМО, обходом папок при старте, и получает отсюда три вещи: принять сокет терминала службы, начать читать её
// бота, пока терминал выключен, и разбудить агента без браузера (409-1, `wake`). Удалили папку службы — после
// перезапуска узла её здесь нет.

const { onConnection, wake, done, answerTrust } = require('./bridge.cjs')
const { startIdlePoller, personLang, setPersonLang } = require('./telegram.cjs')
// 552-6: ещё три бота элемента (h2h · orders · work) — опрос при старте узла, список и отправка для ядра (`/api/agents/telegram`).
const { startPollers: startSlotPollers, bots: telegramBots, send: telegramSend } = require('./telegram-slots.cjs')

// 409-5: `done` — агент сообщил «работа закончена» или закрывает свой терминал по ответу человека.
// 411: язык человека в Telegram элемента — читать и менять (дверь `/api/agents/person-lang`).
// 604: `answerTrust` — ответ человека «да» на вопрос доверия папке (дверь `/api/agents/trust`, бот главного агента).
module.exports = { onConnection, startIdlePoller, wake, done, answerTrust, personLang, setPersonLang, startSlotPollers, telegramBots, telegramSend }
