// ВСТАВКА ТЕКСТА В ТЕРМИНАЛ АГЕНТА (шаг 316). Слово владельца 2026-09-26: «терминал у нас не умеет делать скопировать
// вставить … нам нужно сделать кнопку для вызова такого модального окна чтобы туда можно было что-то вставить и отправить
// потом в терминал … перебросить его на страницу терминала где в параметрах строки передать информацию о выделенном
// контейнере».
//
// 🔒 `.mjs`, А НЕ `.ts`: функции читают и островок внутри сборки Next, и прибор, запускаемый голым `node`
// (`scripts/check-terminal-paste.mjs` — тот же приём, что у `terminal-auth.mjs`).
// 🛑 ТЕКСТ ДЛЯ ТЕРМИНАЛА ИЗ АДРЕСНОЙ СТРОКИ — ЧУЖИЕ СЛОВА В АГЕНТА (класс приёмной): управляющие символы вырезаются (иначе
// ссылка могла бы набрать в терминале последовательность ESC — сменить режим, стереть строку), длина ограничена, а в
// терминал текст уходит ТОЛЬКО кнопкой человека в окне — ссылка лишь открывает окно.

export const PASTE_LIMIT = 20000

const ESC = String.fromCharCode(27)

/** Убрать управляющие символы (кроме перевода строки и табуляции), привести переводы строк к `\n`, ограничить длину. */
export function cleanPaste(text) {
  if (typeof text !== 'string') return ''
  let out = ''
  for (const ch of text.replace(/\r\n?/g, '\n')) {
    const c = ch.codePointAt(0)
    if (ch === '\n' || ch === '\t' || (c >= 32 && c !== 127 && !(c >= 128 && c < 160))) out += ch
  }
  return out.slice(0, PASTE_LIMIT)
}

/**
 * Режим вставки терминала (bracketed paste): многострочный текст агент получает ОДНОЙ вставкой, а не строками, каждая из
 * которых отправилась бы по Enter. `send` — добавить Enter после вставки.
 */
export function bracketedPaste(text, send = false) {
  return `${ESC}[200~${cleanPaste(text)}${ESC}[201~${send ? '\r' : ''}`
}

/** Адрес страницы терминала службы с готовым текстом в окне вставки. Одно место — рамка подсветки и любая кнопка дают одно. */
export function terminalLink({ base = '', lang, service, text }) {
  return `${base}/${lang}/architect/${service}/terminal?paste=${encodeURIComponent(cleanPaste(text))}`
}

/** Текст из адреса страницы терминала (или `null`); адрес после этого чистится вызывающим — F5 не откроет окно второй раз. */
export function pasteFromSearch(search) {
  const value = new URLSearchParams(search).get('paste')
  return value === null ? null : cleanPaste(value)
}
