// СЛОВА РАЗДЕЛА «TELEGRAM-БОТ» — рядом с островком (267-3).
//
// 🔒 ПЕРЕНОС СМЫСЛА МАСТЕРСКОЙ ПАМЯТИ (BotFather → токен → допуск ссылкой → запуск → работа). Там слова
// жили в общем словаре мастерской; здесь — рядом с островком, двумя языками, по закону узла.

export type TelegramChannelWords = {
  loading: string
  forbidden: string
  /** 372-2: выход из отказа на временном адресе. */
  exitWhy: string
  exitOpen: string
  intro: string

  step1Title: string
  /** `{cmd}` — место команды /newbot: её рисует островок с фоном, как команду (267-3, правка владельца) */
  step1Text: string
  step1Points: string[]
  openBotFather: string
  nameLabel: string
  usernameLabel: string
  copy: string
  copied: string

  step2Title: string
  step2Text: string
  tokenLabel: string
  tokenHint: string
  saveToken: string
  saving: string
  /** «Бот @{username} сохранён · токен …{tail}» */
  tokenSaved: string

  // Ступень 3 — активация одним нажатием, слова памяти (`build.i18n.ts`: stepActivateLead, activateBtn…).
  step3Title: string
  step3Text: string
  activateBtn: string
  activateHint: string
  activateWaiting: string
  activated: string
  /**
   * Системное сообщение о состоянии. 🛑 ЕГО ШЛЁТ УЗЕЛ НАПРЯМУЮ ЧЕРЕЗ BOT API, А НЕ CLAUDE CODE: на START и на
   * любое сообщение, пока терминал выключен, — раньше, чем человек поймёт, что ничего не работает (решение
   * владельца 2026-09-22). `{subscription}` и `{terminal}` — адреса разделов, подставляет островок.
   */
  msgActive: string
  msgInactive: string
  msgNoSubscription: string

  // Ступень 4 — только состояние; запуск и остановка — во вкладке «Терминал» (решение владельца 2026-09-22).
  step4Title: string
  step4Text: string
  /** 552-6: ступень 4 ещё одного бота элемента (H2H, заказы, работа) — без терминала. */
  slotStep4Text: string
  cardActive: string
  cardInactive: string
  /** терминал запущен до того, как бот был подключён: `claude` в нём без канала */
  cardWithoutChannel: string
  openTerminal: string
  openChat: string
  /** «Допущено: {n}» */
  allowedCount: string
  notes: string[]

  locked: string
  errors: Record<string, string>
}

const DICT: Record<string, TelegramChannelWords> = {
  en: {
    loading: "Asking the node…",
    forbidden: "Only the architect can set up the bot, and only from this computer or your own domain.",
    exitWhy: "This is closed on the temporary internet address so that nobody with the link can run commands on your computer. Open this page on the computer where the node runs, or connect your own domain.",
    exitOpen: "Open on this computer",
    intro:
      "You write to your own bot in Telegram, and Claude Code answers from the folder of this service on this computer. The bot, its token and its list of allowed people are yours — nothing passes through Fractera.",

    step1Title: "Create a bot at @BotFather",
    step1Text: "BotFather is Telegram's own bot for making bots. Open it, send {cmd} and answer its two questions.",
    step1Points: [
      "First it asks for a name — what people see in the chat header.",
      "Then a username — the address of the bot; it must end with «bot».",
      "At the end BotFather sends a token: a long line with a colon. Copy it for the next step.",
    ],
    openBotFather: "Open @BotFather",
    nameLabel: "A name you can use",
    usernameLabel: "A username you can use",
    copy: "Copy",
    copied: "Copied",

    step2Title: "Bring the token",
    step2Text: "The node checks it with Telegram itself and keeps it on this computer. It is never shown again — only its last four characters.",
    tokenLabel: "Bot token",
    tokenHint: "looks like 123456789:AA… — sent by BotFather",
    saveToken: "Save token",
    saving: "Checking with Telegram…",
    tokenSaved: "Bot @{username} saved · token …{tail}",

    step3Title: "Activate the connection",
    step3Text:
      "One press. The button opens your bot in Telegram; press START (or «Send») there — and the connection is active. You do not need to type anything or copy any codes.",
    activateBtn: "Activate the connection in Telegram",
    activateHint: "Telegram will open the chat with your bot. Press the big button at the bottom of that chat.",
    activateWaiting: "Waiting for the press… as soon as it happens, your node sends you a message there with the state of your terminal.",
    activated: "Connected. Your node sent you a message in Telegram with the state of your terminal.",
    msgActive:
      "This message was sent by your node. The agent is on — write and it will answer. The whole conversation is visible in the terminal: {terminal}",
    msgInactive:
      "This message was sent by your node. The agent is off right now. Just start the conversation — send a message and I will offer to turn it on. Or turn the agent on here: {terminal}",
    msgNoSubscription:
      "This message was sent by your node. Claude Code on this computer is not signed in to a subscription. First sign in: {subscription} — then start the terminal: {terminal}",

    step4Title: "Write to the bot",
    step4Text: "The bot works inside the Claude Code session of the terminal. You start and stop it in the «Terminal» tab.",
    slotStep4Text: "The bot is connected to this element. How it will work is still being built: for now it answers every message with one line, and the node's main agent can write to you through it.",
    cardActive:
      "Everything you type in the Telegram chat is shown in your terminal — you can continue the conversation there at any moment.",
    cardInactive: "Your terminal is not active — Telegram cannot work. Press the button to open the terminal.",
    cardWithoutChannel:
      "The terminal was started before the bot was connected — Telegram cannot work. Open the terminal, stop the agent and start it again.",
    openTerminal: "Open the terminal",
    openChat: "Open the chat",
    allowedCount: "Allowed: {n}",
    notes: [
      "The bot answers while this computer is on and the agent is running in the terminal.",
      "It spends your Claude subscription — the same limit as the terminal and your own work.",
      "Channels are a research preview by Anthropic: their flags may change.",
    ],

    locked: "Complete the step above first.",
    errors: {
      "empty-token": "Paste the token first.",
      "bad-format": "That does not look like a bot token: digits, a colon, then a long line of letters.",
      "token-rejected": "Telegram does not recognise this token. Copy it from BotFather again.",
      "token-used-by-another-bot": "This token already belongs to another bot of this element. Create a separate bot at BotFather.",
      "unknown-slot": "This page has no such bot.",
      "telegram-unreachable": "Telegram did not answer. Check the internet on this computer.",
      "telegram-refused": "Telegram refused the request.",
      "no-bot-username": "Save the token first.",
      "no-activation": "The link has expired. Get a new one.",
      "no-token": "Save the token first.",
      network: "The node did not answer.",
    },
  },
  ru: {
    loading: "Спрашиваю узел…",
    forbidden: "Настраивать бота может только архитектор и только с этого компьютера или со своего домена.",
    exitWhy: "На временном адресе в интернете это закрыто, чтобы никто по ссылке не мог выполнять команды на вашем компьютере. Откройте эту страницу на компьютере, где работает узел, или подключите свой домен.",
    exitOpen: "Открыть на этом компьютере",
    intro:
      "Вы пишете своему боту в Telegram, а отвечает Claude Code из папки этой службы на этом компьютере. Бот, его токен и список допущенных — ваши; через Fractera не проходит ничего.",

    step1Title: "Создайте бота у @BotFather",
    step1Text: "BotFather — собственный бот Telegram для создания ботов. Откройте его, отправьте {cmd} и ответьте на два вопроса.",
    step1Points: [
      "Сначала он спросит имя — его видят в заголовке чата.",
      "Затем имя пользователя — адрес бота; оно обязано оканчиваться на «bot».",
      "В конце BotFather пришлёт токен — длинную строку с двоеточием. Скопируйте её для следующей ступени.",
    ],
    openBotFather: "Открыть @BotFather",
    nameLabel: "Имя, которое можно взять",
    usernameLabel: "Имя пользователя, которое можно взять",
    copy: "Скопировать",
    copied: "Скопировано",

    step2Title: "Принесите токен",
    step2Text: "Узел проверит его у самого Telegram и сохранит на этом компьютере. Больше он не показывается — только четыре последних знака.",
    tokenLabel: "Токен бота",
    tokenHint: "вида 123456789:AA… — его присылает BotFather",
    saveToken: "Сохранить токен",
    saving: "Проверяю у Telegram…",
    tokenSaved: "Бот @{username} сохранён · токен …{tail}",

    step3Title: "Активируйте соединение",
    step3Text:
      "Одно нажатие. Кнопка откроет вашего бота в Telegram — нажмите там START (или «Отправить»), и соединение активно. Ничего печатать и никакие коды копировать не нужно.",
    activateBtn: "Активировать соединение в Telegram",
    activateHint: "Telegram откроет чат с вашим ботом. Нажмите большую кнопку внизу этого чата.",
    activateWaiting: "Жду нажатия… как только оно случится, узел пришлёт вам туда сообщение о состоянии терминала.",
    activated: "Соединение активно. Узел прислал вам в Telegram сообщение о состоянии терминала.",
    msgActive:
      "Это сообщение отправил ваш узел. Агент включён — пишите, он ответит. Вся переписка видна в терминале: {terminal}",
    msgInactive:
      "Это сообщение отправил ваш узел. Агент сейчас выключен. Просто начните диалог — напишите сообщение, и я предложу его включить. Или включите агента по ссылке: {terminal}",
    msgNoSubscription:
      "Это сообщение отправил ваш узел. Claude Code на этом компьютере не вошёл в подписку. Сначала войдите в подписку: {subscription} — затем запустите терминал: {terminal}",

    step4Title: "Пишите боту",
    step4Text: "Бот работает внутри сессии Claude Code терминала. Запускаете и останавливаете её вы во вкладке «Терминал».",
    slotStep4Text: "Бот подключён к этому элементу. Как он будет работать, ещё строится: пока он отвечает на каждое сообщение одной строкой, а главный агент узла может писать вам через него.",
    cardActive:
      "Всё, что вы печатаете в чате Telegram, отображается в вашем терминале — в нём вы можете продолжить общение в любой момент.",
    cardInactive: "Ваш терминал неактивен — Telegram не сможет работать. Нажмите кнопку, чтобы открыть терминал.",
    cardWithoutChannel:
      "Терминал запущен до подключения бота — Telegram не сможет работать. Откройте терминал, остановите агента и запустите снова.",
    openTerminal: "Открыть терминал",
    openChat: "Открыть чат",
    allowedCount: "Допущено: {n}",
    notes: [
      "Бот отвечает, пока этот компьютер включён и в терминале запущен агент.",
      "Он тратит вашу подписку Claude — тот же лимит, что у терминала и вашей работы.",
      "Каналы — исследовательская версия Anthropic: их флаги могут измениться.",
    ],

    locked: "Сначала пройдите ступень выше.",
    errors: {
      "empty-token": "Сначала вставьте токен.",
      "bad-format": "Это не похоже на токен бота: цифры, двоеточие, затем длинная строка букв.",
      "token-rejected": "Telegram не узнаёт этот токен. Скопируйте его у BotFather заново.",
      "token-used-by-another-bot": "Этот токен уже у другого бота этого элемента. Создайте у BotFather отдельного бота.",
      "unknown-slot": "У этой страницы нет такого бота.",
      "telegram-unreachable": "Telegram не ответил. Проверьте интернет на этом компьютере.",
      "telegram-refused": "Telegram отклонил запрос.",
      "no-bot-username": "Сначала сохраните токен.",
      "no-activation": "Ссылка истекла. Получите новую.",
      "no-token": "Сначала сохраните токен.",
      network: "Узел не ответил.",
    },
  },
}

/** Слова на выбранном языке; незнакомый язык честно деградирует до английского. */
export function telegramChannelWords(lang: string): TelegramChannelWords {
  return DICT[lang] ?? DICT.en
}
