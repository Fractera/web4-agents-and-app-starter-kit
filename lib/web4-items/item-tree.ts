// ДЕРЕВО СТРАНИЦ ОДНОГО WEB4 ITEM (шаг 314-1). Структура — слово владельца 2026-09-26: Preview · строительство · коннекторы ·
// web3 store · проектирование продукта · документы · процесс («Последний раздел подписки исправь на вот этот вот»).
// 528-1 (владелец 2026-10-18): «сразу под вкладкой живой сайт делаем раскрывающийся список: Messenger – h2h – h2a – настройки …
// Рабочий процесс – Переносим сюда вкладку процесс – А2а ваши заказы … – А2а ваша работа … Строительство – В Строительство
// переносим документы, проектирование продукта»; «Для всех элементов»; «Оставить отзывы» — «Вкладкой в «Рабочем процессе»».
//
// 🔒 ОДИН ФАЙЛ — И МЕНЮ, И МАРШРУТ, И ЗАГЛУШКИ. Список разделов, объявленный второй раз где-то ещё, разойдётся молча:
// добавили страницу — в меню она есть, а маршрут отвечает 404, или наоборот.
// 🔒 ДО ТРЁХ УРОВНЕЙ ПОД ЭЛЕМЕНТОМ, И КАЖДЫЙ — АДРЕС: раздел (`messenger`), подраздел (`messenger/h2h`), страница
// (`messenger/h2h/native`). Подраздел — та же `TreePage` со своими `pages`, его главная перечисляет свои страницы.
// 🪦 До 528-1 здесь жили «группы» (`group`, `TREE_GROUPS`): страницы раздела под раскрывающейся подписью без своего адреса
// (i2i, f2f). Снято: два способа группировать в одном дереве — отсутствие правила; i2i и f2f стали подразделами
// `build/i2i`, `build/f2f`, их прежние адреса переадресуются (`movedPage`).
// Слова — `en` основа, `ru` перевод.

export type TreeWords = { title: string; lead: string }
// 412-2: `doc` — страница показывает файл (или папку) элемента; пункт есть, только пока этот файл существует
// (`lib/web4-items/element-docs.ts`).
// 435 (владелец 2026-10-08): `about` — абзацы под заголовком страницы, когда одной строки `lead` мало. 528-1 (владелец: «описание
// длинной ленты не показывать скрывать их в аккордеона») — `about` показывается свёрнутым.
// 472 (владелец 2026-10-13): «в наличии или отсутствие этих инструментов таких как чат H2H его состояние как правда или ложь должны
// передаваться в own-service-props.json». Флаги паспорта элемента `messengers` — h2a · h2h · a2a; `needs` — пункт есть, только когда
// флаг включён; `unless` — пункт есть, только когда флаг ВЫКЛЮЧЕН (Telegram-бот остаётся в «Строительстве» у элементов без H2A).
export type Messenger = "h2a" | "h2h" | "a2a"
export type TreePage = {
  slug: string; words: Record<"en" | "ru", TreeWords>; pages?: TreePage[]; needs?: "catalog" | Messenger; unless?: Messenger
  /** 544-3: страница сети Lagrix (заказы и работа для чужих агентов, отзывы, f2f, кошелёк, тариф первого контакта) — у нативного элемента её нет. */
  network?: true
  /** 567-6 (владелец 2026-10-22, «Только A2A и «Отзывы»»): страница есть, только когда элемент в сети Web4 (паспорт `visibility: network`). */
  web4?: true
  /** 551-1 (владелец 2026-10-20: «всю вкладку рабочие процесс мы должны немедленно удалить из native element, он не может на техническом
   *  уровне иметь подобные решения»; «относятся только к custom элементу»): раздел только кастомного элемента — рабочий процесс и платежи
   *  не все про сеть, поэтому отдельный флаг, а не `network`. */
  custom?: true
  /** 573-4: раздел кастомного элемента, который есть и у платёжного элемента узла, даже нативного (паспорт `payment`): у элемента
   *  Stripe здесь его ключи. ✗ После 573-2 Stripe стал нативным, раздел «Платежи» исчез, и ключи Stripe ввести было негде. */
  orPayment?: true
  /** 573-4: абзацы раздела для платёжного элемента вместо `about` (у нативного Stripe нет Web3 и ничего о сети Lagrix). */
  aboutPayment?: Record<"en" | "ru", string[]>
  /** 558 (владелец 2026-10-21: «обновить все четыре нативных элементов связанных с памятью … вкладку на одном уровне с строительства но
   *  ниже которая будет называться резервная копирование»): раздел только элементов памяти — data, storage, vectors, graph. */
  memory?: true
  /** 559 (владелец 2026-10-21: «добавления к стандартной вкладки авторизации на одном из верхних уровней вкладки пользователей»):
   *  раздел только элемента входа (`auth`). */
  auth?: true
  /** 578-5 (владелец 2026-10-23: «разместить вкладку блоки внутри всех нативных и кастомных элементов, обеспечивая её как кнопку
   *  которая просто напросто открывает новую вкладку»): пункт меню открывается в новой вкладке. */
  newTab?: true
  // 553-6: на едином проекте (nodeType project) страницы нет — в меню и по адресу
  project?: false
  doc?: { file: string; folder?: boolean; deep?: boolean }
  about?: Record<"en" | "ru", string[]>
}

const w = (enTitle: string, enLead: string, ruTitle: string, ruLead: string): Record<"en" | "ru", TreeWords> => ({
  en: { title: enTitle, lead: enLead },
  ru: { title: ruTitle, lead: ruLead },
})

// Прежний адрес → новый: ссылки и закладки не ломаются. Сначала точное совпадение, затем начало пути (`movedPage`).
// 451-2: вкладки i2i и f2f переехали в «Строительство»; 528-1: они — подразделы `build/i2i`, `build/f2f`; H2H и H2A — в Messenger;
// A2A — в «Рабочий процесс» («A2A ваша работа», витрина — «Карточки возможностей»); «Процесс» — в «Рабочий процесс»;
// «Документы» — в «Строительство»; 556-12: «Проектирование продукта» — снова свой раздел между «Рабочим процессом» и «Строительством».
export const MOVED_PAGES: Record<string, string> = {
  "connectors/catalog": "build/i2i/catalog",
  "connectors/api": "build/i2i/api",
  "connectors/mcp": "build/i2i/mcp",
  "connectors/a2a": "workflow/a2a-work/capabilities",
  "web3-store": "build",
  "web3-store/find": "build/f2f/find",
  "web3-store/publish": "build/f2f/publish",
  "build/catalog": "build/i2i/catalog",
  "build/api": "build/i2i/api",
  "build/mcp": "build/i2i/mcp",
  "build/find": "build/f2f/find",
  "build/publish": "build/f2f/publish",
  "h2a/native-chat": "messenger/h2a/native",
  // 538: два пункта переезда свёрнуты в «Реверс-инжиниринг».
  "build/product-design/from-nextjs": "product-design/reverse-engineering",
  "build/product-design/from-framework": "product-design/reverse-engineering",
  "product-design/from-nextjs": "product-design/reverse-engineering",
  "product-design/from-framework": "product-design/reverse-engineering",
  // 606: страницы старой группы `architect/root` (снята) ведут в дерево; у других элементов таких адресов нет. Текст из `?paste=` при
  // переадресации теряется — источник ссылок на терминал root исправлен в 606-1 (`terminalServiceOf`).
  "terminal": "build/terminal",
  "claude-code": "build/subscription",
  "telegram": "build/telegram",
  "reverse-engineering": "product-design/reverse-engineering",
  "external-github": "build/github",
  "blocks": "build/blocks",
  "design": "build/design",
  "site-settings": "build/site-settings",
}
const MOVED_PREFIXES: [string, string][] = [
  ["h2a", "messenger/h2a"],
  ["h2h", "messenger/h2h"],
  ["connectors", "workflow/a2a-work"],
  ["process", "workflow/process"],
  ["documents", "build/documents"],
  ["build/product-design", "product-design"],
]
/** Куда переехал прежний адрес (путь под элементом, без языка); не переезжал — `null`. */
export function movedPage(path: string[]): string | null {
  const key = path.join("/")
  if (MOVED_PAGES[key]) return MOVED_PAGES[key]
  for (const [from, to] of MOVED_PREFIXES) if (key === from || key.startsWith(`${from}/`)) return to + key.slice(from.length)
  return null
}

// 472: что у элемента есть — для условий `needs`/`unless`. Один ответ для меню, маршрута и списка страниц раздела.
export type TreeContext = { catalog: boolean; messengers: Record<Messenger, boolean>; native?: boolean; nodeType?: "project" | "factory"; memory?: boolean; auth?: boolean; web4?: boolean; payment?: boolean }
export function treeVisible(p: TreePage, c: TreeContext): boolean {
  if (p.project === false && c.nodeType === "project") return false
  if (p.needs === "catalog" && !c.catalog) return false
  if (p.needs && p.needs !== "catalog" && !c.messengers[p.needs]) return false
  if (p.unless && c.messengers[p.unless]) return false
  if (p.network && c.native) return false
  if (p.web4 && c.web4 === false) return false
  if (p.custom && c.native && !(p.orPayment && c.payment)) return false
  if (p.memory && !c.memory) return false
  if (p.auth && !c.auth) return false
  return true
}
// 472: у элемента с H2A бот живёт в H2A — старый адрес ведёт туда (у элемента без H2A бот остаётся в «Строительстве»).
export const MOVED_WITH: Record<string, { to: string; when: Messenger }> = {
  "build/telegram": { to: "messenger/h2a/telegram", when: "h2a" },
}

// 472-2: дашборд — счётчики, таблица и под ней надпись про терминал (страница элемента, `element-dashboard.i18n.ts`).
const dashboard = (en: string, ru: string, needs?: Messenger): TreePage => ({ slug: "dashboard", ...(needs ? { needs } : {}), words: w("Dashboard", en, "Дашборд", ru) })

// 435-1: что такое элемент и узел — одними словами там, где человеку это нужно знать.
const ELEMENT_AND_NODE = {
  en: "An element is one self-contained thing in your node: a site, an app, an agent or a service. It has its own folder, its own address on the internet, its own repository and its own agent that builds it. To other elements it is also a microservice: it answers its neighbours and asks them for help. Your node is all your elements on this computer together with the core that links them; the node belongs to you and works without Fractera.",
  ru: "Элемент — это одна самостоятельная вещь вашего узла: сайт, приложение, агент или служба. У него своя папка, свой адрес в интернете, свой репозиторий и свой агент, который его строит. Для других элементов он ещё и микросервис: отвечает соседям и просит их о помощи. Узел — это все ваши элементы на этом компьютере вместе с ядром, которое их связывает; узел принадлежит вам и работает без Fractera.",
}

// 528-1: «A2A ваши заказы» и «A2A ваша работа» — одинаковые страницы в разных ролях: сначала сделки, затем мессенджер, Telegram, дашборд.
const a2aRolePages = (role: "orders" | "work"): TreePage[] => [
  role === "orders"
    ? { slug: "deals", words: w("Deals", "Work this element ordered from other agents: a summary of each deal and the conversation behind it.", "Сделки", "Работа, которую элемент заказал у других агентов: сводка каждой сделки и беседа за ней.") }
    // 436-2 (владелец 2026-10-09): прежде «Процесс → Заказы», затем «A2A → Сделки».
    : { slug: "deals", words: w("Deals", "Work this element did for other agents: a summary of each deal and the conversation behind it.", "Сделки", "Работа, которую элемент сделал для других агентов: сводка каждой сделки и беседа за ней.") },
  {
    slug: "native", needs: "a2a",
    words: role === "orders"
      ? w("Native messenger", "The agents this element orders work from, and the history with each of them.", "Нативный мессенджер", "Агенты, у которых элемент заказывает работу, и история общения с каждым.")
      : w("Native messenger", "The agents this element works for, and the history with each of them.", "Нативный мессенджер", "Агенты, для которых работает элемент, и история общения с каждым."),
    about: {
      en: ["Each counterpart is a chat: what was asked, what was done, the deal and its result — tables and summaries right in the conversation. It is programmed in the next steps."],
      ru: ["Каждый контрагент — это чат: что спросили, что сделали, сделка и её итог — таблицы и сводки прямо в разговоре. Мессенджер программируется следующими шагами."],
    },
  },
  {
    slug: "telegram", needs: "a2a",
    words: role === "orders"
      ? w("Telegram", "Following the element's orders to other agents in Telegram.", "Telegram", "Следить за заказами элемента у других агентов в Telegram.")
      : w("Telegram", "Following the element's work for other agents in Telegram.", "Telegram", "Следить за работой элемента для других агентов в Telegram."),
    about: {
      en: ["How Telegram serves the element's dealings with other agents is still being decided."],
      ru: ["Как Telegram будет служить делам элемента с другими агентами — ещё решается."],
    },
  },
  role === "orders"
    ? dashboard("The agents this element ordered from and its orders, in short.", "Агенты, у которых элемент заказывал, и его заказы — коротко.", "a2a")
    : dashboard("The agents this element worked for and its deals, in short.", "Агенты, для которых работал элемент, и его сделки — коротко.", "a2a"),
]

export const ITEM_TREE: TreePage[] = [
  { slug: "preview", words: w("Live site", "The element's own site as it runs now and a visitor sees it.", "Живой сайт", "Сайт элемента таким, каким он работает сейчас и каким его видит посетитель.") }, // 393: «Preview» → «Живой сайт» (владелец 2026-10-04)
  // 559: «Пользователи» элемента входа — сразу под «Живым сайтом»: все люди узла, серверная таблица, правка, истории, пакет.
  {
    slug: "users",
    auth: true,
    words: w("Users", "Everyone who has an account on this node: search, filters, histories and actions in batches.", "Пользователи", "Все, у кого есть учётная запись на этом узле: поиск, фильтры, истории и действия пакетом."),
  },
  // 528-1: Messenger — сразу под «Живым сайтом»: H2H, H2A и их настройки.
  {
    slug: "messenger",
    project: false,
    words: w("Messenger", "How people reach you and this element's agent: other people (H2H), you and your agent (H2A), and the rules for both.", "Messenger", "Как с вами и с агентом этого элемента связываются: другие люди (H2H), вы и ваш агент (H2A) — и правила для обоих."),
    about: {
      en: [
        "H2H is people talking to people through their agents: your friends and acquaintances on Fractera, and important people you could not reach otherwise. H2A is you talking to this element's agent: here, in Telegram, or in any messenger you build with the terminal.",
        "In «Settings» you set what a stranger pays for a first contact and what the agent holding the conversation for you must never do and should look for.",
      ],
      ru: [
        "H2H — люди общаются с людьми через своих агентов: ваши друзья и знакомые на Fractera и важные люди, до которых иначе не достучаться. H2A — вы общаетесь с агентом этого элемента: здесь, в Telegram или в любом мессенджере, который вы соберёте терминалом.",
        "В «Настройках» вы задаёте, сколько незнакомец платит за первый контакт, и что агенту, который ведёт разговор за вас, запрещено и что ему искать.",
      ],
    },
    pages: [
      {
        slug: "h2h",
        needs: "h2h",
        words: w("H2H", "Talking to other people through their agents — friends, and important people you cannot reach otherwise.", "H2H", "Общение с другими людьми через их агентов — с друзьями и с важными людьми, до которых иначе не достучаться."),
        about: {
          en: [
            "Here is the native way for people to talk to each other: your close friends or acquaintances who run their own agent on Fractera.",
            "The connection goes without any outside server — unlike WhatsApp, for example — and is encrypted with SSL (TLS) certificates, so your conversations stay fully confidential for as long as the SSL standards themselves stay reliable.",
            "Its special feature is reaching important people you could never contact otherwise. The messenger starts with a preliminary conversation through your agent: it contacts the important person's agent and tries to prove why you need to talk. That agent brings the request to its owner with its assessment, and the person decides. If they agree, they appear in your contact list and you talk to them just as you would to a friend.",
          ],
          ru: [
            "Здесь — нативный способ связи между людьми: это могут быть ваши близкие друзья или знакомые, которые развернули своего агента в инфраструктуре Fractera.",
            "Соединение идёт без какого-либо внешнего сервера — в отличие, например, от WhatsApp — и шифруется сертификатами SSL (TLS), поэтому ваши разговоры остаются полностью конфиденциальными, пока надёжны сами стандарты SSL.",
            "Особенность этого способа — возможность связаться с важными людьми, до которых иначе не достучаться. Мессенджер начинает с предварительного разговора через вашего агента: он связывается с агентом важного человека и старается доказать, зачем вам нужен разговор. Тот агент приносит обращение своему владельцу со своей оценкой, а решает сам человек. Если он согласен, он появляется в вашем списке контактов, и вы общаетесь с ним так же, как с другом.",
          ],
        },
        pages: [
          {
            slug: "native",
            words: w("Native messenger", "Your contacts and conversations with them, with no outside server.", "Нативный мессенджер", "Ваши контакты и разговоры с ними — без внешнего сервера."),
            about: {
              en: ["Contacts you already know, and the people whose agents agreed to bring your request — each with its conversation. It is programmed in the next steps."],
              ru: ["Контакты, которых вы знаете, и люди, чьи агенты согласились передать ваше обращение, — у каждого свой разговор. Мессенджер программируется следующими шагами."],
            },
          },
          {
            slug: "telegram",
            words: w("Telegram bot", "Talking to people through Telegram.", "Telegram-бот", "Общение с людьми через Telegram."),
            about: {
              en: ["How Telegram serves conversations between people is still being decided."],
              ru: ["Как Telegram будет служить разговорам людей — ещё решается."],
            },
          },
          dashboard("Your contacts and conversations, in short.", "Ваши контакты и разговоры — коротко."),
        ],
      },
      {
        slug: "h2a",
        needs: "h2a",
        words: w("H2A", "How you talk to this element's agent: here, in Telegram, or in a messenger you build.", "H2A", "Как вы общаетесь с агентом этого элемента: здесь, в Telegram или в мессенджере, который вы соберёте."),
        about: {
          en: [
            "This is about how a person talks to their own agent inside this element. Telegram works by default, and you can build any other messenger with the terminal.",
            "The native chat is a conversation with the element's agent right here, for those who would rather not use Telegram.",
          ],
          ru: [
            "Здесь — о том, как человек общается с собственным агентом внутри этого элемента. По умолчанию работает Telegram, а любые другие мессенджеры вы можете создать с помощью терминала.",
            "Нативный чат — разговор с агентом элемента прямо здесь, для тех, кто не хочет пользоваться Telegram.",
          ],
        },
        pages: [
          {
            slug: "native",
            words: w("Native chat", "Talk to the element's agent right here, without Telegram.", "Нативный чат", "Разговор с агентом элемента прямо здесь, без Telegram."),
            about: {
              en: ["This chat will replace Telegram for those who do not want to use it: you write to the element's agent on this page. It is programmed in the next steps."],
              ru: ["Этот чат заменит Telegram тем, кто не хочет им пользоваться: вы пишете агенту элемента прямо на этой странице. Он программируется следующими шагами."],
            },
          },
          { slug: "telegram", words: w("Telegram bot", "A bot that talks to the same agent session.", "Telegram-бот", "Бот, который говорит с той же сессией агента.") },
          dashboard("Who you talk to through this element's agent, in short.", "С кем вы общаетесь через агента этого элемента — коротко."),
        ],
      },
      // 528-2 (владелец 2026-10-18): тариф первого контакта и правила агента, который ведёт диалог; хранятся в паспорте элемента.
      { slug: "settings", network: true, words: w("Settings", "What a stranger pays for a first contact, and the rules for the agent that holds the conversation for you.", "Настройки", "Сколько незнакомец платит за первый контакт и правила для агента, который ведёт разговор за вас.") },
    ],
  },
  // 528-1: «Рабочий процесс» — что элемент делает, когда уже работает (451-2: a2a — рабочий процесс; i2i и f2f — строительный).
  {
    slug: "workflow",
    custom: true,
    words: w("Working process", "What the running element does: its scheduled work, the work it orders and does over A2A, and reviews.", "Рабочий процесс", "Что делает уже работающий элемент: работа по расписанию, заказы и работа по A2A, отзывы."),
    about: {
      en: [
        ELEMENT_AND_NODE.en,
        "This section is the working process: what the element does once it runs. Nothing here rebuilds the element — it is data the element works with, not code.",
        "Over a2a the element meets other agents in two roles. In «A2A: your orders» it is the customer: it orders work from other agents. In «A2A: your work» it is the provider: it does work for them, and its capability cards say what it can do, at what price and for whom. Over a2a a Fractera element meets Lagrix exactly like any other framework, site or agent without a UI: no advantage, no handicap.",
        "How elements of this node agree on connectors (i2i) and how whole elements are exchanged with other Fractera projects (f2f) is the build process — those are in «Build».",
      ],
      ru: [
        ELEMENT_AND_NODE.ru,
        "Этот раздел — рабочий процесс: что элемент делает, когда уже работает. Ничто здесь не пересобирает элемент — это данные, с которыми он работает, а не код.",
        "По a2a элемент встречается с другими агентами в двух ролях. В «A2A: ваши заказы» он заказчик: заказывает работу у других агентов. В «A2A: ваша работа» он исполнитель: работает для них, а его карточки возможностей говорят, что он умеет, по какой цене и для кого. По a2a элемент Fractera встречается с Lagrix ровно как любой другой фреймворк, сайт или агент без интерфейса: без преимуществ и недостатков.",
        "Как элементы этого узла договариваются о connector (i2i) и как элементы целиком обмениваются с другими проектами Fractera (f2f) — строительный процесс, это в «Строительстве».",
      ],
    },
    pages: [
      // 552-4б: сессия агента рабочего процесса — задачи агентов других узлов; отдельная от «Строительства», закрывается сама.
      { slug: "terminal", words: w("Terminal", "The agent session of the working process: tasks from agents of other nodes run here, and it closes itself when the work is done.", "Терминал", "Сессия агента рабочего процесса: здесь идут задачи агентов других узлов, и она закрывается сама, когда работа сделана.") },
      {
        slug: "process",
        words: w("Process", "Outside services the element may use and the work it runs on a schedule.", "Процесс", "Внешние сервисы, которыми может пользоваться элемент, и работа, которая идёт по расписанию."),
        pages: [
          { slug: "subscriptions", words: w("Subscriptions", "Outside services this element may use.", "Подписки", "Внешние сервисы, которыми может пользоваться элемент.") },
          { slug: "cron", words: w("Cron automations", "Work that runs on a schedule.", "Крон автоматизации", "Работа, которая идёт по расписанию.") },
        ],
      },
      {
        slug: "a2a-orders",
        network: true,
        web4: true,
        words: w("A2A: your orders", "Work this element orders from other agents: the deals, the conversations and a summary.", "A2A: ваши заказы", "Работа, которую элемент заказывает у других агентов: сделки, переписка и сводка."),
        about: {
          en: ["Here the element is the customer. A deal is opened by the customer, the money waits in escrow, and the provider is paid when the deal closes. The conversations and tables of each deal will appear in the native messenger."],
          ru: ["Здесь элемент — заказчик. Сделку открывает заказчик, деньги ждут в условном депонировании, исполнитель получает оплату при закрытии сделки. Переписка и таблицы каждой сделки появятся в нативном мессенджере."],
        },
        pages: a2aRolePages("orders"),
      },
      {
        slug: "a2a-work",
        network: true,
        web4: true,
        words: w("A2A: your work", "Work this element does for other agents: the deals, the conversations, a summary and the capability cards it offers.", "A2A: ваша работа", "Работа, которую элемент делает для других агентов: сделки, переписка, сводка и карточки его возможностей."),
        about: {
          en: ["Here the element is the provider. Its capability cards say what it can do, what it returns, to whom, at what price and with what limit; the deals are the work it has already done."],
          ru: ["Здесь элемент — исполнитель. Его карточки возможностей говорят, что он умеет, что возвращает, кому, по какой цене и с каким лимитом; сделки — работа, которую он уже сделал."],
        },
        pages: [
          ...a2aRolePages("work"),
          // 528 (владелец 2026-10-18): «а2а- карточки возможностей переименовать» — прежняя витрина A2A.
          { slug: "capabilities", words: w("Capability cards", "What the element can do for others: what it returns, to whom and on what terms.", "Карточки возможностей", "Что элемент умеет делать для других: что возвращает, кому и на каких условиях.") },
        ],
      },
      {
        slug: "reviews",
        network: true,
        web4: true,
        words: w("Reviews", "Rate the partners of closed deals: a like or a dislike, and if you wish a review page.", "Отзывы", "Оценить партнёров по закрытым сделкам: лайк или дизлайк и, если хотите, страница отзыва."),
        about: {
          en: ["After a deal closes, both sides may leave a review: a like or a dislike. Its weight is the fee paid on that deal, so a review cannot be bought cheaper than real work. The author may attach a page of their own to the review — what happened and why; the page adds no weight and changes no place in search results."],
          ru: ["Когда сделка закрыта, обе стороны могут оставить отзыв: лайк или дизлайк. Его вес — комиссия, уплаченная по этой сделке, поэтому отзыв нельзя купить дешевле настоящей работы. К отзыву автор может привязать свою страницу — что произошло и почему; страница не добавляет веса и не меняет места в выдаче."],
        },
      },
    ],
  },
  // 556-12 (владелец 2026-10-23): «Вынеси проектирование продукта на внешний слой каждого элемента чтобы он был в 1 линии … живой
  // сайт – рабочий процесс – проектирование продукта – строительство». С 528-1 до этого раздел жил внутри «Строительства».
  {
    slug: "product-design",
    words: w("Product design", "What the element should become, before its code.", "Проектирование продукта", "Каким должен стать элемент — до его кода."),
    pages: [
      { slug: "quiz", words: w("Product quiz", "Questions that shape the element.", "Продуктовый квиз", "Вопросы, из которых складывается элемент.") },
      // 538 (владелец 2026-10-19): «замену двух этих записей на надпись Реверс инжиниринг» — «Переезд из другого Next.js» и
      // «Переезд из другого фреймворка» свёрнуты в один пункт; прежние адреса переадресуются (`MOVED_PAGES`).
      { slug: "reverse-engineering", words: w("Reverse engineering", "Study how a finished site or SDK works, then build your own in this element.", "Реверс-инжиниринг", "Разберите, как устроен готовый сайт или SDK, чтобы построить своё в этом элементе.") },
    ],
  },
  {
    slug: "build",
    words: w("Build", "Everything the element's agent needs to build it.", "Строительство", "Всё, что нужно агенту элемента, чтобы его строить."),
    pages: [
      // 384-1, слово владельца 2026-10-03: «перевести её вверх самый вверх выше чем подписка Claude Code Agent».
      { slug: "github", words: w("GitHub", "The element's own repository.", "GitHub", "Собственный репозиторий элемента.") },
      { slug: "subscription", words: w("Claude Code subscription", "Signing the element's agent in to the Claude Code subscription.", "Подписка Claude Code", "Вход агента элемента в подписку Claude Code.") },
      { slug: "terminal", words: w("Terminal", "A live Claude Code in the element's folder: started and stopped here.", "Терминал", "Живой Claude Code в папке элемента: запускается и останавливается здесь.") },
      // Владелец 2026-10-01: «кнопку развёртывания мы находим внизу а это очень важная кнопка … подними её вверх и установи сразу
      // под кнопкой терминал».
      { slug: "deployments", words: w("Preview & Deploy", "See a new version before visitors do, deploy it, or go back to a working one.", "Предпросмотр и развёртывание", "Посмотреть новую версию до посетителей, развернуть её или вернуться к работающей.") },
      // 577-11 (владелец 2026-10-23: «мы не строим внутри страницы архитектора блоки это кнопка просто работает как переадресация на
      // страницу блоке которая находится в элементах»): пункт ведёт на `/<язык>/admin/blocks` самого элемента.
      { slug: "blocks", newTab: true, words: w("Blocks", "The blocks of this element, on the element itself.", "Блоки", "Блоки этого элемента — на самом элементе.") },
      // 579-4 (владелец 2026-10-23: «должно существовать такая же кнопка в левом меню какое мы сделали кнопка блоки и у нас должны быть
      // там две кнопки которые ведут на настройку дизайна и на настройку CONFIG то есть на собственные страницы каждого кастомного
      // элемента»): только переадресация на страницы самого элемента, в ядре ничего не строится. Только у кастомных: 579 — их шаг.
      { slug: "design", custom: true, newTab: true, words: w("Design", "The element's own design workshop, on the element itself: fonts, colours, type, shapes.", "Дизайн", "Своя мастерская оформления элемента — на самом элементе: шрифты, цвета, текст, формы.") },
      { slug: "site-settings", custom: true, newTab: true, words: w("Site settings", "The element's own site settings, on the element itself: name, menu, footer, switches.", "Настройки сайта", "Свои настройки сайта элемента — на самом элементе: название, меню, подвал, выключатели.") },
      // 472: у элемента с H2A бот переехал в H2A (`MOVED_WITH`); здесь он остаётся для элементов без H2A.
      { slug: "telegram", unless: "h2a", words: w("Telegram bot", "A bot that talks to the same agent session.", "Telegram-бот", "Бот, который говорит с той же сессией агента.") },
      { slug: "environment", words: w("Environment variables", "Keys and settings the element reads at start.", "Переменные окружения", "Ключи и настройки, которые элемент читает при старте.") },
      // 451-2 (владелец 2026-10-11): i2i — элементы узла договариваются о connector через API; f2f — обмен элементами через Lagrix.
      // 452 (владелец 2026-10-11: «коротко понятно ты ввёл человека в курс дела»): главная подраздела вводит в курс дела.
      {
        slug: "i2i",
        words: w("i2i: inside the node", "How the elements of this node agree to work together without asking a model every time.", "i2i: внутри узла", "Как элементы этого узла договариваются работать вместе, не спрашивая модель каждый раз."),
        about: {
          en: [
            "i2i is how the elements of one node work together. The core keeps the catalog of every element and what it can do; an element that lacks something finds the neighbour who can.",
            "The first time, the two agents talk as in A2A: what is needed, in what form, with what answer. Then they fix the agreement as a connector — one plain API call between the elements. From then on the work runs over that call, and no language model is asked again: it is faster, costs no subscription and gives the same answer every time.",
            "This is the build process: a connector is code the element's agent writes and you accept like any other change. The pages here show what the node and this element offer for it: the catalog, the element's HTTP doors (API) and its tools for agents (MCP).",
          ],
          ru: [
            "i2i — это то, как элементы одного узла работают вместе. Ядро держит каталог всех элементов и того, что каждый умеет; элемент, которому чего-то не хватает, находит соседа, который это умеет.",
            "В первый раз два агента разговаривают как в A2A: что нужно, в каком виде, с каким ответом. Затем договорённость закрепляется как connector — один обычный вызов API между элементами. Дальше работа идёт по этому вызову, и языковую модель больше не спрашивают: так быстрее, не тратится подписка, и ответ каждый раз один и тот же.",
            "Это строительный процесс: connector — код, который пишет агент элемента и который вы принимаете, как любую другую правку. Страницы здесь показывают, что для этого есть у узла и у элемента: каталог, HTTP-двери элемента (API) и его инструменты для агентов (MCP).",
          ],
        },
        pages: [
          { slug: "api", words: w("API", "The element's HTTP doors.", "API", "HTTP-двери элемента.") },
          { slug: "mcp", words: w("MCP", "The element's tools for agents over MCP.", "MCP", "Инструменты элемента для агентов по MCP.") },
          // 435-3, выбор владельца «Показать оба»: сверху элементы этого узла, ниже — каталог самого элемента, если он его объявляет.
          { slug: "catalog", words: w("Catalog", "The elements of this node in short, and what this element can give away — where i2i connectors start.", "Каталог", "Элементы этого узла коротко и что умеет отдать этот элемент — отсюда начинаются connector i2i.") },
        ],
      },
      {
        slug: "f2f",
        network: true,
        words: w("f2f: exchange with Fractera", "How whole elements travel between Fractera projects through Lagrix.", "f2f: обмен с Fractera", "Как элементы целиком переходят между проектами Fractera через Lagrix."),
        about: {
          en: [
            "f2f is how Fractera projects exchange whole elements — a site, an app, an agent or a service with its code and design — so that a builder can take a ready element instead of building it again.",
            "It goes through Lagrix, an open network with no central server. An element is announced there with a signed announcement, the same way agents are; independent super-nodes collect the announcements and build search results by open rules that are the same for everyone (Lagrix document 17).",
            "What f2f adds is a technical card: what the element is made of, so that another project can install it — the starter and version it was born from, the framework, the services it needs, its doors, the names (never the values) of its environment variables, its licence and where its code is (Lagrix document 20). Keys, passwords and personal data never travel.",
            "If an exchange is paid, Lagrix settles it like any deal: the money waits in an escrow contract, the provider receives 95% when the deal closes, 5% is the network fee (Lagrix document 04). Fractera has no advantage in Lagrix: for the network it is one project among others.",
            "The pages here: find a ready element in other Fractera projects, or offer this one. Documents: https://github.com/lagrix-dev/lagrix",
          ],
          ru: [
            "f2f — это то, как проекты Fractera обмениваются элементами целиком — сайтом, приложением, агентом или службой с их кодом и оформлением, — чтобы строитель мог взять готовый элемент, а не строить его заново.",
            "Обмен идёт через Lagrix — открытую сеть без центрального сервера. Элемент объявляется там подписанным объявлением, так же как агенты; независимые супер-узлы собирают объявления и строят выдачу по открытым правилам, одинаковым для всех (документ Lagrix 17).",
            "f2f добавляет техническую карточку: из чего сделан элемент, чтобы другой проект мог его поставить, — стартовый шаблон и версия, из которых он рождён, фреймворк, нужные ему службы, его двери, имена (никогда не значения) переменных окружения, лицензия и где лежит код (документ Lagrix 20). Ключи, пароли и персональные данные не передаются никогда.",
            "Если обмен платный, Lagrix рассчитывает его как любую сделку: деньги ждут в контракте условного депонирования, исполнитель получает 95 % при закрытии, 5 % — комиссия сети (документ Lagrix 04). У Fractera в Lagrix нет преимуществ: для сети это один проект среди других.",
            "Страницы здесь: найти готовый элемент в других проектах Fractera или предложить этот. Документы: https://github.com/lagrix-dev/lagrix",
          ],
        },
        pages: [
          {
            slug: "find",
            words: w("Find a ready element", "Look for a ready element in other Fractera projects through Lagrix (f2f) before building your own.", "Найти готовый элемент", "Найти готовый элемент в других проектах Fractera через Lagrix (f2f), прежде чем строить свой."),
            about: {
              en: ["An element is looked for in two ways: through Lagrix discovery (f2f) — the same discovery as for agents, with the technical characteristics a build needs — and through AI search engines."],
              ru: ["Элемент ищется двумя путями: через обнаружение Lagrix (f2f) — то же, что для агентов, плюс технические характеристики, нужные строительству, — и через ИИ-поисковики."],
            },
          },
          {
            slug: "publish",
            words: w("Offer the element", "Offer this whole element to other Fractera projects through Lagrix (f2f): free or for money.", "Предложить элемент", "Предложить этот элемент целиком другим проектам Fractera через Lagrix (f2f): бесплатно или за деньги."),
            about: {
              en: ["Here the price of the element itself is set — the whole site, app or agent with its code and design. This is not the price of its skills: what the element's work costs others (an article, an image, a message in a dialog) is set in its capability cards («Working process → A2A: your work»)."],
              ru: ["Здесь назначается цена самого элемента — сайта, приложения или агента целиком, с его кодом и устройством. Это не цена его навыков: сколько стоит работа элемента для других (статья, изображение, сообщение в диалоге), задаётся в его карточках возможностей («Рабочий процесс → A2A: ваша работа»)."],
            },
          },
        ],
      },
      // 528-1 (владелец 2026-10-18): «В Строительство переносим документы».
      {
        slug: "documents",
        words: w("Documents", "The element's instruction and the record of its development.", "Документы", "Инструкция элемента и запись о его разработке."),
        // 412-2 (владелец 2026-10-06): документы разработки вернулись — из настоящих файлов элемента, а не заглушками.
        pages: [
          { slug: "instruction", doc: { file: "CLAUDE.md" }, words: w("Main instruction", "What the element's agent reads first.", "Главная инструкция", "То, что агент элемента читает первым.") },
          // 416 (владелец 2026-10-06): навыки и хуки — из настоящих папок агента элемента, чтобы смотреть их во время разработки.
          { slug: "skills", doc: { file: ".claude/skills", folder: true, deep: true }, words: w("Skills", "The skills the element's agent carries: when each is used and how.", "Навыки", "Навыки агента элемента: когда каждый вызывается и как работает.") },
          { slug: "hooks", doc: { file: ".claude/hooks", folder: true }, words: w("Hooks", "Commands the agent's tools run on their own events.", "Хуки", "Команды, которые инструменты агента запускают на своих событиях.") },
          { slug: "passport", doc: { file: "OWN-SERVICE-PROPS.json" }, words: w("Passport", "What the element is, can do and needs: its A2A card, integrations and cron.", "Паспорт", "Что элемент такое, что умеет и что ему нужно: визитка A2A, интеграции и крон.") },
          // 417 (владелец 2026-10-06): новый паспорт строится рядом со старым — папка с JSON, README и сервером.
          // 543 (владелец 2026-10-19): «заменить слово новый паспорт на слово собственные свойства элемента и в названии кнопки и в названии страницы».
          { slug: "own-service-props", doc: { file: "OWN-SERVICE-PROPS", folder: true }, words: w("The element's own properties", "What the element tells the outside about itself: why the file exists, and the file.", "Собственные свойства элемента", "Что элемент сообщает о себе снаружи: зачем этот файл и сам файл.") },
          { slug: "readme", doc: { file: "development-docs/README.md" }, words: w("Documents index", "Every development document, who writes it and when it is opened.", "Оглавление документов", "Все документы разработки: кто пишет и когда открывать.") },
          { slug: "current-step", doc: { file: "development-docs/current-step.md" }, words: w("Current step", "Where the work stands now; the agent reads it on every wake.", "Текущий шаг", "Где работа сейчас; агент читает его при каждом пробуждении.") },
          { slug: "steps-new", doc: { file: "development-docs/steps-new", folder: true }, words: w("Steps: planned", "Steps the person agreed to and not started yet.", "Шаги: план", "Согласованные и ещё не начатые шаги.") },
          { slug: "steps-done", doc: { file: "development-docs/steps-done", folder: true }, words: w("Steps: done", "Closed steps with their commit and proof.", "Шаги: завершённые", "Закрытые шаги с коммитом и доказательством.") },
          // 435-5 (владелец 2026-10-08: «Глоссари это неотъемлемая часть архитектуры документов которые должна существовать в каждом
          // элементе»): полный набор документов элемента — пункты появляются, потому что файлы есть с рождения.
          { slug: "glossary", doc: { file: "development-docs/glossary.md" }, words: w("Glossary", "One meaning per word, with the person's words next to each term.", "Глоссарий", "Одно значение у каждого слова, рядом — как его говорит человек.") },
          { slug: "pre-steps", doc: { file: "development-docs/pre-steps", folder: true }, words: w("Intake", "Building requests not started at once, recorded verbatim.", "Приёмная заявок", "Заявки на строительство, не начатые сразу, — дословно.") },
          { slug: "backlog", doc: { file: "development-docs/backlog.md" }, words: w("Backlog", "Built but not explained, built halfway, or promised.", "Бэклог", "Построенное, но не объяснённое, недостроенное или обещанное.") },
          { slug: "cancelled", doc: { file: "development-docs/cancelled.md" }, words: w("Cancelled", "What was dropped, by whose word, and what replaced it.", "Отменённое", "Что отменено, чьим словом и что пришло взамен.") },
          { slug: "anti-patterns", doc: { file: "development-docs/anti-patterns.md" }, words: w("Anti-patterns", "Dead ends already paid for.", "Антипаттерны", "Тупики, за которые уже заплачено.") },
          { slug: "reports", doc: { file: "development-docs/reports", folder: true }, words: w("Reports", "One failure explained, or one finished capability described.", "Отчёты", "Разбор одного отказа или описание готовой способности.") },
          { slug: "proofs", doc: { file: "development-docs/proofs", folder: true }, words: w("Proofs", "How parts of the instruction and skills were proven live.", "Доказательства", "Как части инструкции и навыков доказаны вживую.") },
          { slug: "translation-debt", doc: { file: "development-docs/translation-debt.md" }, words: w("Translation debt", "Texts still in one language, and why.", "Долги по переводам", "Тексты, которые пока на одном языке, и почему.") },
          { slug: "skill-decisions", doc: { file: "development-docs/owner-decisions-on-skill-changes.md" }, words: w("Decisions on skills", "What a self-review proposed and what the person answered.", "Решения о навыках", "Что предложил разбор и что ответил человек.") },
          { slug: "task-add", words: w("Add a task", "A task for the element's agent.", "Добавить задание", "Задание агенту элемента.") },
        ],
      },
    ],
  },
  // 558 (владелец 2026-10-21): «Резервное копирование» у четырёх элементов памяти — ниже «Строительства», по образцу «Процесса» своих
  // элементов: «Инструменты» (подписки — внешние сервисы копирования), «Крон события» (тот же календарь), «Настройки» (задача агенту голосом).
  {
    slug: "backup",
    memory: true,
    words: w("Backup", "Copies of this element's data: the services that keep them, their schedule and the task for the agent.", "Резервное копирование", "Копии данных этого элемента: сервисы, где они хранятся, расписание и задача агенту."),
    about: {
      en: ["Backup is set up in three places. «Tools» lists the outside services the copies go to (a storage, a cloud disk). «Cron events» is the calendar of when copying runs. «Settings» is where you say in plain words what to copy, how often and where — and send it to the element's agent, which builds the copying service and puts it on the schedule."],
      ru: ["Резервное копирование настраивается в трёх местах. «Инструменты» — внешние сервисы, куда уходят копии (хранилище, облачный диск). «Крон события» — календарь того, когда идёт копирование. «Настройки» — здесь вы обычными словами говорите, что копировать, как часто и куда, и отправляете это агенту элемента: он строит службу копирования и ставит её в расписание."],
    },
    pages: [
      { slug: "tools", words: w("Tools", "Outside services the copies go to — subscriptions of this element.", "Инструменты", "Внешние сервисы, куда уходят копии, — подписки этого элемента.") },
      { slug: "cron", words: w("Cron events", "The calendar of copying: when each backup runs and how it went.", "Крон события", "Календарь копирования: когда идёт каждая копия и чем кончилась.") },
      { slug: "settings", words: w("Settings", "Say what to copy, how often and where — and add it to development.", "Настройки", "Скажите, что копировать, как часто и куда, — и добавьте в разработку.") },
    ],
  },
  // 325 (слово владельца 2026-09-27): обязательная страница внизу — «Настройки», так называемый Danger zone. Всегда последняя.
  {
    slug: "settings",
    words: w("Settings", "The element's danger zone and the settings of its own site.", "Настройки", "Опасная зона элемента и настройки его собственного сайта."),
    // 328 (слово владельца 2026-09-28): «на вкладке настройки увидеть выпадающий список … страница настройки, которые уже
    // существуют, и страница конфигуратора». Конфигуратор живёт в самом элементе (выбор «б» 324-8) — страница ядра открывает
    // его на главном адресе в новой вкладке (выбор «б» 2026-09-28: во встроенном окне свой домен не получил бы билет входа).
    pages: [
      // 443-5 (слово владельца 2026-10-11): «настройка домена находится на вкладке опасная зона … её нужно вытащить в настройки,
      // домен. Поместить туда два внутренних раздела главное зеркало и адрес элемента».
      { slug: "domain", words: w("Domain", "The element's main mirror (its own domain) and its address in the core.", "Домен", "Главное зеркало элемента (его собственный домен) и его адрес в ядре.") },
      { slug: "danger-zone", words: w("Danger zone", "The element's description in the core, its links to the node and deleting it.", "Опасная зона", "Описание элемента в ядре, связи с узлом и удаление.") },
      { slug: "site-settings", words: w("Site settings", "The name, texts, search settings, images and languages of the element's own site.", "Настройки сайта", "Название, тексты, настройки для поиска, картинки и языки собственного сайта элемента.") },
      // 530-1 (владелец 2026-10-18): «На вкладке настройки создать вкладку платежи которые будет раскрываться и предлагать два выбора веб
      // два и web3 в одной у нас будет настраиваться страйп , в другой у нас будет настраиваться кошелёк».
      {
        slug: "payments",
        custom: true,
        orPayment: true,
        aboutPayment: {
          en: ["This element is the payment element of your node: it takes card payments through your own Stripe account for the other elements, so they need no keys of their own. Web2 holds its Stripe keys, the agent key for the Stripe tools of its agent, and the list of elements that take payments through it."],
          ru: ["Этот элемент — платёжный элемент вашего узла: он принимает оплату картой через ваш собственный аккаунт Stripe для других элементов, и своих ключей им не нужно. В Web2 — его ключи Stripe, ключ агента для инструментов Stripe его агента и список элементов, которые принимают оплату через него."],
        },
        words: w("Payments", "How the element takes money: by card through the node's payment elements (Web2) and in USDC through a wallet (Web3) — the node's or its own.", "Платежи", "Как элемент принимает деньги: картой через платёжные элементы узла (Web2) и в USDC через кошелёк (Web3) — узла или свой."),
        about: {
          en: [
            "Web2 is the usual way: a visitor pays by card on the element's site through a payment element of your node, such as its Stripe element, and the money goes to your own account there. Here you connect the payment elements this element works with; the checkout itself is agreed and built by the agents of the two elements over i2i.",
            "Web3 is the Lagrix network: deals between agents are paid in USDC through escrow, and the node's wallet is its name and account. Every element works with the node's wallet unless it adds its own; every payment is recorded for the element that earned it.",
          ],
          ru: [
            "Web2 — привычный путь: посетитель платит картой на сайте элемента через платёжный элемент вашего узла, например его элемент Stripe, и деньги поступают на ваш собственный аккаунт там. Здесь вы подключаете платёжные элементы, с которыми работает этот элемент; саму оплату договаривают и строят агенты двух элементов по i2i.",
            "Web3 — сеть Lagrix: сделки агентов оплачиваются в USDC через условное депонирование, а кошелёк узла — его имя и счёт. Каждый элемент работает кошельком узла, если не добавил свой; каждый платёж записывается за элементом, который его заработал.",
          ],
        },
        pages: [
          { slug: "web2", words: w("Web2: payment elements", "Card payments on the element's site through the payment elements of your node.", "Web2: платёжные элементы", "Оплата картой на сайте элемента через платёжные элементы вашего узла.") },
          { slug: "web3", network: true, words: w("Web3: wallet", "USDC through the node's wallet, or the element's own if it has one.", "Web3: кошелёк", "USDC через кошелёк узла или через свой кошелёк элемента, если он есть.") },
        ],
      },
    ],
  },
]

export type TreeLang = "en" | "ru"
export const treeLang = (lang: string): TreeLang => (lang === "ru" ? "ru" : "en")

/**
 * 528-6: слова страницы дерева по пути `messenger/h2h/native` — тем же словом её называет «Главный агент» ядра (его папки
 * `architect/build/…` берут заголовок отсюда, а не держат вторую копию). Пути нет — ошибка сборки, а не пустая подпись.
 */
export function treeWords(path: string, lang: TreeLang): TreeWords {
  const trail = findTreePath(path.split("/"))
  if (!trail) throw new Error(`item-tree: нет страницы ${path}`)
  return trail[trail.length - 1].words[lang]
}

/** Цепочка страниц дерева по пути (раздел → подраздел → страница); нет такой — `null`. */
export function findTreePath(path: string[]): TreePage[] | null {
  if (path.length === 0 || path.length > 3) return null
  const trail: TreePage[] = []
  let level: TreePage[] | undefined = ITEM_TREE
  for (const seg of path) {
    const next: TreePage | undefined = level?.find((p) => p.slug === seg)
    if (!next) return null
    trail.push(next)
    level = next.pages
  }
  return trail
}
