// СЛОВА РАЗДЕЛА «ПОДПИСКА CLAUDE CODE» — рядом с островком (267-2).
//
// 🔒 В ПАМЯТИ ЭТИ СЛОВА БЫЛИ ВПИСАНЫ В КОД ПО-РУССКИ («Вход по подписке Claude Code», «Сбросить»). Здесь они
// вынесены в словарь: закон узла — каждая видимая строка в `_data` или словаре островка, иначе её не видит
// сторож словарей и она не переводится.

export type ClaudeSubscriptionWords = {
  checking: string
  onTitle: string
  onText: string
  offTitle: string
  offText: string
  unknownTitle: string
  unknownText: string
  login: string
  relogin: string
  starting: string
  recheck: string
  terminalNote: string
  close: string
  quota: string
  forbidden: string
  /** 372-2: выход из отказа на временном адресе. */
  exitWhy: string
  exitOpen: string
  modalTitle: string
  modalText: string
  copyLink: string
  copied: string
  openLink: string
  codePlaceholder: string
  sendCode: string
  codeSent: string
}

const DICT: Record<string, ClaudeSubscriptionWords> = {
  en: {
    checking: "Asking Claude Code on this computer…",
    onTitle: "Connected",
    onText: "Account {email} · plan {plan}. Every agent of this node works under it.",
    offTitle: "Not connected",
    offText: "Agents of this node cannot start until you sign in to your Claude subscription.",
    unknownTitle: "Claude Code did not answer",
    unknownText: "The command-line tool may not be installed on this computer, or it did not respond in time.",
    login: "Sign in with Claude subscription",
    relogin: "Sign in again",
    starting: "Starting sign-in…",
    recheck: "Check again",
    terminalNote: "This is the real sign-in of Claude Code. When a link appears, a window opens with it; paste the code Anthropic gives you.",
    close: "Close",
    quota: "One subscription serves everything here: the node terminal, the Telegram bot and your own work at the computer. They share the same usage limit.",
    forbidden: "Only the architect can manage the subscription, and only from this computer or your own domain.",
    exitWhy: "This is closed on the temporary internet address so that nobody with the link can run commands on your computer. Open this page on the computer where the node runs, or connect your own domain.",
    exitOpen: "Open on this computer",
    modalTitle: "Claude Code — sign in with your subscription",
    modalText: "Open the link, sign in to your Anthropic account, then paste the code it gives you below.",
    copyLink: "Copy link",
    copied: "Copied",
    openLink: "Open",
    codePlaceholder: "Paste the code here",
    sendCode: "Send the code",
    codeSent: "Sent",
  },
  ru: {
    checking: "Спрашиваю Claude Code на этом компьютере…",
    onTitle: "Подключена",
    onText: "Учётная запись {email} · тариф {plan}. Под ней работают все агенты этого узла.",
    offTitle: "Не подключена",
    offText: "Агенты этого узла не запустятся, пока вы не войдёте в свою подписку Claude.",
    unknownTitle: "Claude Code не ответил",
    unknownText: "Возможно, программа не установлена на этом компьютере или не успела ответить.",
    login: "Войти по подписке Claude",
    relogin: "Войти заново",
    starting: "Запускаю вход…",
    recheck: "Проверить снова",
    terminalNote: "Это настоящий вход Claude Code. Когда появится ссылка, откроется окно с ней; вставьте код, который выдаст Anthropic.",
    close: "Закрыть",
    quota: "Одна подписка обслуживает всё: терминал узла, Telegram-бот и вашу собственную работу за компьютером. Лимит у них общий.",
    forbidden: "Управлять подпиской может только архитектор и только с этого компьютера или со своего домена.",
    exitWhy: "На временном адресе в интернете это закрыто, чтобы никто по ссылке не мог выполнять команды на вашем компьютере. Откройте эту страницу на компьютере, где работает узел, или подключите свой домен.",
    exitOpen: "Открыть на этом компьютере",
    modalTitle: "Claude Code — вход по вашей подписке",
    modalText: "Откройте ссылку, войдите в свою учётную запись Anthropic и вставьте выданный код в поле ниже.",
    copyLink: "Скопировать ссылку",
    copied: "Скопировано",
    openLink: "Открыть",
    codePlaceholder: "Вставьте код сюда",
    sendCode: "Отправить код",
    codeSent: "Отправлено",
  },
}

/** Слова на выбранном языке; незнакомый язык честно деградирует до английского. */
export function claudeSubscriptionWords(lang: string): ClaudeSubscriptionWords {
  return DICT[lang] ?? DICT.en
}
