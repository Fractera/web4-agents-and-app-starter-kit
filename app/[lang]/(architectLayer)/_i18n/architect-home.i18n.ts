// СОДЕРЖИМОЕ КОРНЕВОЙ СТРАНИЦЫ СЛОЯ АРХИТЕКТОРА.
//
// 🔒 ОТДЕЛЬНЫЙ ФАЙЛ, А НЕ ВЕТКА В СЛОВАРЕ СЛОЯ. Словарь слоя описывает то, что
// повторяется на ОДИННАДЦАТИ страницах — имена групп, разделов, предупреждение.
// Здесь текст ОДНОЙ страницы, и его объём немедленно утопил бы общий словарь.
//
// 🪦 ВОСЕМЬ ТЕМ-ПОДСКАЗОК (агент, языки, нагрузка, авторизация, данные, вид, домен, продажа), ВВОДНЫЙ АБЗАЦ И
// ПРЕДУПРЕЖДЕНИЕ О ПРОДАКШНЕ СНЯТЫ 2026-10-24 (шаг 582) ПО СЛОВУ ВЛАДЕЛЬЦА: «Текст подсказками он бессмысленный а
// места этого три популярных действия чтобы начать … И внизу сразу дай главный ликбез». Прежний текст — в git
// (`git show 275a565:"app/[lang]/(architectLayer)/_i18n/architect-home.i18n.ts"`).
//
// 🔒 ВЕРХНИЙ РЯД — НАВИГАЦИЯ ПО ЭТОЙ СТРАНИЦЕ, А НЕ КОПИЯ ЛЕВОГО МЕНЮ. Его слова:
// «ошибка, которую ты совершил, — ты продублировал это меню и слева, и сверху;
// это неправильно, это меню предназначено только для навигации по странице с
// плавной прокруткой». Поэтому у каждого раздела есть `anchor`, и ряд собирается из
// тех же разделов — второго списка не существует.
//
// 🔒 АДРЕС ДЕЙСТВИЯ — ПУТЬ ОТ КОРНЯ ЯДРА БЕЗ ЯЗЫКА И БЕЗ `/architect` (285-6): язык подставляет страница.
// 594-6: «Используйте реверс-инжиниринг» ведёт на страницу разбора root (`/root/reverse-engineering`): прежняя `/reverse` снята вместе
// с элементом reverse (594-2), разбор теперь ведёт агент элемента в своём проходе, а root есть на каждом узле. 606: у root стандартное
// дерево кастомного элемента — страница разбора там `/root/product-design/reverse-engineering`.
//
// 🔒 ПОДСКАЗКИ К СЛОВАМ (599-1, владелец 2026-10-26: «добавить тултип и подсветить подсказки элемент, узел и так далее, все что у нас
// есть в глоссари … так как эта страница первого контакта и при это много новых слов»). Ликбез — единственный список определений: в
// текстах страницы слово пишется меткой `[[форма|ключ]]`, страница раскрывает её определением из ликбеза того же языка
// (`lib/content/blocks/term.ts`), сторож `check-term-hints` роняет сборку на ключе, которого в ликбезе нет.
// 🛑 «Глубокая», а не «глубинная» память: так это слово уже называется в проекте (словарь разработки, раздел 596) — второе слово для
// того же самого развело бы страницу и агентов.

export type ArchitectAction = {
  title: string
  text: string
  /** `/build/subscription` — страница ядра; язык подставляет страница. */
  path: string
  label: string
}

/**
 * Слово «Главного ликбеза» (599-1). `key` — постоянное имя для меток `[[форма|ключ]]`, одинаковое во всех языках; `word` и `text` —
 * строка ликбеза и подсказка; `aside` — уточнение в скобках после слова; `more` — ссылка `[подпись](адрес)` только для строки ликбеза.
 * В `text` можно ставить метки других слов: в строке ликбеза они станут подсказками, в подсказке — простыми словами.
 */
export type BasicsTerm = { key: string; word: string; aside?: string; text: string; more?: string }

export type ArchitectHomeUi = {
  /** Три действия, чтобы начать (582). */
  start: { anchor: string; tab: string; title: string; actions: ArchitectAction[] }
  /** Главный ликбез (582, 599-1). */
  basics: { anchor: string; tab: string; title: string; items: BasicsTerm[] }
}

const DICT: Record<string, ArchitectHomeUi> = {
  en: {
    start: {
      anchor: 'start',
      tab: 'Start',
      title: 'Three things to do first',
      actions: [
        {
          title: 'Activate your Claude Code subscription',
          text: 'The agents of this [[node|node]] work on your Claude subscription. Sign in once, and the [[main agent|main-agent]] can create and change [[elements|element]] for you.',
          path: '/build/subscription',
          label: 'Activate',
        },
        {
          title: 'Connect Telegram',
          text: 'Run the project from your phone: ask the main agent by voice or in a chat message to build anything you need.',
          path: '/build/telegram',
          label: 'Connect',
        },
        {
          title: 'Use [[reverse engineering|reverse-engineering]]',
          text: 'Take apart how popular products work, then build your own on their business ideas and technical solutions.',
          path: '/root/product-design/reverse-engineering',
          label: 'Open',
        },
      ],
    },
    basics: {
      anchor: 'basics',
      tab: 'Basics',
      title: 'The basics',
      items: [
        { key: 'node', word: 'Node', text: 'your computer or a VPS server where the [[core|core]] and all the [[elements|element]] run.' },
        { key: 'core', word: 'Core', text: 'the centre of the node: the panel you are looking at, the registry of elements, their installation and the links between them. The core is not born from a template and is not replaced: it comes with the node.' },
        { key: 'architect', word: 'Architect', text: 'you, the owner of the node: you give the agents their tasks and see everything on the node, in every element.' },
        { key: 'main-agent', word: 'Main agent', text: 'the agent of the core. It takes your request, finds the element that can do it or creates a new one, hands it the task and follows the work. It writes no code itself.' },
        { key: 'element', word: 'Element', text: 'a self-contained part of the node with its own folder, port, address, repository and agent. A site, an app and a bot are all elements.' },
        { key: 'native-element', word: 'Native element', text: 'a built-in service any custom element can use: sign-in, data, memory, design, blocks. It is not sold and is not shown to the network.' },
        { key: 'custom-element', word: 'Custom element', text: 'your own project: a site, an app or an agent. It can follow the node’s shared settings or live on its own, and it can be sold and put on the Web4 network.' },
        { key: 'passport', word: 'Passport', text: 'the first item of the left menu: the node’s reputation in Lagrix, the node’s wallet and a card for every element that shows whether it is on and whether it is on the Web4 network.' },
        { key: 'skill', word: 'Skill', text: 'written know-how an agent loads when a task calls for it: how to do one kind of work well.' },
        { key: 'skills-base', word: 'Skills base', text: 'skills of other projects, each with its licence. They come with every copy of the node and are loaded into the node’s graph once. Before a new task the agent looks there for how others solved it, and says so plainly when nothing is close.' },
        { key: 'basic-memory', word: 'Basic memory', text: 'what an agent remembers on its own, without commands: the diary of your conversations and what you have told it about yourself and how you want things done. A new session starts knowing where you stopped, and before each of your messages the agent finds related past talk by meaning.' },
        { key: 'deep-memory', word: 'Deep memory', text: 'the node’s memory element. It keeps what you ask it to remember, be it a phrase, a photo, a PDF or a voice note, and answers “remind me about…” with the date and the source. It is turned on for a memory task and off after it.' },
        { key: 'review', word: '“Review”', text: 'a command for an element’s agent after its work. Before turning off, the agent reads back its session, suggests up to three changes to its [[skills|skill]] and makes them only after your “yes”.' },
        { key: 'reverse-engineering', word: 'Reverse engineering', text: 'studying how a finished site, app or SDK works, in the words of the product: screens, scenarios, business logic. An element’s agent does it in a separate pass and then builds its own on that basis; nobody else’s code, texts or design are copied.' },
        { key: 'one-owner', word: 'One owner', aside: 'node type “Single project”', text: 'every element belongs to one person and shares the same settings, design and wallet.' },
        { key: 'site-factory', word: 'Site factory', aside: 'node type “App factory”', text: 'the node hosts projects of different owners; each app gets its own settings, its own sign-in and its own people.' },
        { key: 'super-node', word: 'Super-node', text: 'a separate computer in the Lagrix network: it finds agents for customers and delivers messages, and the network pays it for this work. A place for a super-node is applied for with the node’s wallet.', more: '[More about the super-node](/en/super-node)' },
        { key: 'integrator', word: 'Integrator', text: 'what Lagrix calls a node that gives many people ready elements on its own computer. To the network it is an ordinary node, and each element keeps its own reputation on it.', more: '[More in Lagrix](https://lagrix.dev/en/docs/19-node-requirements)' },
        { key: 'web4-ready', word: 'Web4 ready', text: 'an element on the Web4 network: agents of other nodes find it and give it orders through Lagrix. In the [[Passport|passport]] such an element carries a big star.' },
      ],
    },
  },
  ru: {
    start: {
      anchor: 'start',
      tab: 'Начать',
      title: 'Три действия, чтобы начать',
      actions: [
        {
          title: 'Активируйте подписку Claude Code',
          text: 'Агенты [[узла|node]] работают по вашей подписке Claude. Войдите один раз, и [[главный агент|main-agent]] сможет создавать и менять [[элементы|element]].',
          path: '/build/subscription',
          label: 'Активировать',
        },
        {
          title: 'Подключите Telegram',
          text: 'Управляйте проектом с телефона: голосом или сообщением в чате попросите главного агента создать что угодно.',
          path: '/build/telegram',
          label: 'Подключить',
        },
        {
          title: 'Используйте [[реверс-инжиниринг|reverse-engineering]]',
          text: 'Разберите, как устроены популярные продукты, и постройте своё на их бизнес-идеях и технических решениях.',
          path: '/root/product-design/reverse-engineering',
          label: 'Открыть',
        },
      ],
    },
    basics: {
      anchor: 'basics',
      tab: 'Ликбез',
      title: 'Главный ликбез',
      items: [
        { key: 'node', word: 'Узел', text: 'ваш компьютер или VPS-сервер, на котором работают [[ядро|core]] и все [[элементы|element]].' },
        { key: 'core', word: 'Ядро', text: 'центр узла: пульт, который вы сейчас видите, реестр элементов, их установка и связи между ними. Ядро не рождается из шаблона и не заменяется: оно приходит вместе с узлом.' },
        { key: 'architect', word: 'Архитектор', text: 'вы, хозяин узла: ставите задачи агентам и видите всё на узле, во всех элементах.' },
        { key: 'main-agent', word: 'Главный агент', text: 'агент ядра. Он принимает вашу просьбу, находит элемент, который её сделает, или создаёт новый, передаёт ему задачу и следит за работой. Сам код не пишет.' },
        { key: 'element', word: 'Элемент', text: 'самостоятельная часть узла со своей папкой, портом, адресом, репозиторием и агентом. Сайт, приложение, бот — всё это элементы.' },
        { key: 'native-element', word: 'Нативный элемент', text: 'встроенная служба, которой пользуется любой кастомный элемент: авторизация, данные, память, дизайн, блоки. Его не продают и не показывают сети.' },
        { key: 'custom-element', word: 'Кастомный элемент', text: 'ваш собственный проект: сайт, приложение или агент. Он может брать общие настройки узла или жить отдельно, его можно продавать и выставить в сеть Web4.' },
        { key: 'passport', word: 'Паспорт', text: 'первый пункт левого меню: репутация узла в Lagrix, кошелёк узла и карточка каждого элемента, где видно, включён ли он и в сети ли Web4.' },
        { key: 'skill', word: 'Навык', text: 'записанное умение, которое агент подгружает, когда задача его требует: как хорошо сделать работу определённого рода.' },
        { key: 'skills-base', word: 'База навыков', text: 'навыки других проектов, у каждого своя лицензия. Они приходят с каждой копией узла и один раз загружаются в граф узла. Перед новой задачей агент ищет там, как её решали другие, а если близкого нет, так прямо и говорит.' },
        { key: 'basic-memory', word: 'Базовая память', text: 'то, что агент помнит сам, без команд: дневник ваших разговоров и то, что вы рассказали о себе и о том, как вам нужно. Новая сессия начинается со знания, на чём вы остановились, а перед каждым вашим сообщением агент находит по смыслу связанные прошлые разговоры.' },
        { key: 'deep-memory', word: 'Глубокая память', text: 'элемент памяти узла. Он хранит то, что вы просите запомнить: фразу, фото, PDF или голосовое, а на «напомни о…» отвечает с датой и источником. Включается на задачу памяти и выключается после неё.' },
        { key: 'review', word: '«Разбор»', text: 'команда агенту элемента после его работы. Перед выключением агент перечитывает свою сессию, предлагает до трёх правок своих [[навыков|skill]] и вносит их только после вашего «да».' },
        { key: 'reverse-engineering', word: 'Реверс-инжиниринг', text: 'изучение того, как устроены готовый сайт, приложение или SDK, словами продукта: экраны, сценарии, бизнес-логика. Агент элемента делает это отдельным проходом и строит на этой основе своё; чужой код, тексты и оформление не копируются.' },
        { key: 'one-owner', word: 'Один хозяин', aside: 'тип узла «Единый проект»', text: 'все элементы принадлежат одному человеку, у них общие настройки, дизайн и кошелёк.' },
        { key: 'site-factory', word: 'Завод сайтов', aside: 'тип узла «Завод приложений»', text: 'узел держит проекты разных хозяев; у каждого приложения свои настройки, свой вход и свои люди.' },
        { key: 'super-node', word: 'Супер-узел', text: 'отдельный компьютер в сети Lagrix: он ищет агентов для заказчиков и доставляет сообщения, а сеть платит ему за эту работу. Заявку на место супер-узла подают с кошельком узла.', more: '[Подробнее о супер-узле](/ru/super-node)' },
        { key: 'integrator', word: 'Интегратор', text: 'так в Lagrix называют узел, который даёт многим людям готовые элементы на своём компьютере. Для сети это обычный узел, а репутация у каждого элемента на нём своя.', more: '[Подробнее в Lagrix](https://lagrix.dev/ru/docs/19-node-requirements)' },
        { key: 'web4-ready', word: 'Web4 ready', text: 'элемент в сети Web4: агенты других узлов находят его и дают ему заказы через Lagrix. В [[Паспорте|passport]] такой элемент отмечен большой звездой.' },
      ],
    },
  },
}

/** Язык не из набора откатывается на английский: человек видит работающую страницу, а не пустоту. */
export function architectHomeUi(lang: string): ArchitectHomeUi {
  return DICT[lang] ?? DICT.en
}

/** Языки словаря — сторож меток (`check-term-hints`) проверяет каждый. */
export const ARCHITECT_HOME_LANGS = Object.keys(DICT)
