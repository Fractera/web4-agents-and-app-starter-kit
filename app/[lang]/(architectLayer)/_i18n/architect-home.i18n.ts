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
// с элементом reverse (594-2), разбор теперь ведёт агент элемента в своём проходе, а root есть на каждом узле.

export type ArchitectAction = {
  title: string
  text: string
  /** `/build/subscription` — страница ядра; язык подставляет страница. */
  path: string
  label: string
}

export type ArchitectHomeUi = {
  /** Три действия, чтобы начать (582). */
  start: { anchor: string; tab: string; title: string; actions: ArchitectAction[] }
  /** Главный ликбез: строки «**слово** — что это» (582). */
  basics: { anchor: string; tab: string; title: string; items: string[] }
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
          text: 'The agents of this node work on your Claude subscription. Sign in once, and the main agent can create and change elements for you.',
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
          title: 'Use reverse engineering',
          text: 'Take apart how popular products work, then build your own on their business ideas and technical solutions.',
          path: '/root/reverse-engineering',
          label: 'Open',
        },
      ],
    },
    basics: {
      anchor: 'basics',
      tab: 'Basics',
      title: 'The basics',
      items: [
        '**Node** — your computer or a VPS server where the core and all the elements run.',
        '**Core** — the centre of the node: the panel you are looking at, the registry of elements, their installation and the links between them. The core is not born from a template and is not replaced: it comes with the node.',
        '**Super-node** — a separate computer in the Lagrix network: it finds agents for customers and delivers messages, and the network pays it for this work. A place for a super-node is applied for with the node\'s wallet. [More about the super-node](/en/super-node)',
        '**Element** — a self-contained part of the node with its own folder, port, address, repository and agent. A site, an app and a bot are all elements.',
        '**Native element** — a built-in service any custom element can use: sign-in, data, memory, design, blocks. It is not sold and is not shown to the network.',
        '**Custom element** — your own project: a site, an app or an agent. It can follow the node’s shared settings or live on its own, and it can be sold and put on the Web4 network.',
        '**One owner** (node type “Single project”) — every element belongs to one person and shares the same settings, design and wallet.',
        '**Site factory** (node type “App factory”) — the node hosts projects of different owners; each app gets its own settings, its own sign-in and its own people.',
        '**Integrator** — what Lagrix calls a node that gives many people ready elements on its own computer. To the network it is an ordinary node, and each element keeps its own reputation on it. [More in Lagrix](https://lagrix.dev/en/docs/19-node-requirements)',
        '**Web4 ready** — an element on the Web4 network: agents of other nodes find it and give it orders through Lagrix. In the Passport such an element carries a big star.',
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
          text: 'Агенты узла работают по вашей подписке Claude. Войдите один раз, и главный агент сможет создавать и менять элементы.',
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
          title: 'Используйте реверс-инжиниринг',
          text: 'Разберите, как устроены популярные продукты, и постройте своё на их бизнес-идеях и технических решениях.',
          path: '/root/reverse-engineering',
          label: 'Открыть',
        },
      ],
    },
    basics: {
      anchor: 'basics',
      tab: 'Ликбез',
      title: 'Главный ликбез',
      items: [
        '**Узел** — ваш компьютер или VPS-сервер, на котором работают ядро и все элементы.',
        '**Ядро** — центр узла: пульт, который вы сейчас видите, реестр элементов, их установка и связи между ними. Ядро не рождается из шаблона и не заменяется: оно приходит вместе с узлом.',
        '**Супер-узел** — отдельный компьютер в сети Lagrix: он ищет агентов для заказчиков и доставляет сообщения, а сеть платит ему за эту работу. Заявку на место супер-узла подают с кошельком узла. [Подробнее о супер-узле](/ru/super-node)',
        '**Элемент** — самостоятельная часть узла со своей папкой, портом, адресом, репозиторием и агентом. Сайт, приложение, бот — всё это элементы.',
        '**Нативный элемент** — встроенная служба, которой пользуется любой кастомный элемент: авторизация, данные, память, дизайн, блоки. Его не продают и не показывают сети.',
        '**Кастомный элемент** — ваш собственный проект: сайт, приложение или агент. Он может брать общие настройки узла или жить отдельно, его можно продавать и выставить в сеть Web4.',
        '**Один хозяин** (тип узла «Единый проект») — все элементы принадлежат одному человеку, у них общие настройки, дизайн и кошелёк.',
        '**Завод сайтов** (тип узла «Завод приложений») — узел держит проекты разных хозяев; у каждого приложения свои настройки, свой вход и свои люди.',
        '**Интегратор** — так в Lagrix называют узел, который даёт многим людям готовые элементы на своём компьютере. Для сети это обычный узел, а репутация у каждого элемента на нём своя. [Подробнее в Lagrix](https://lagrix.dev/ru/docs/19-node-requirements)',
        '**Web4 ready** — элемент в сети Web4: агенты других узлов находят его и дают ему заказы через Lagrix. В Паспорте такой элемент отмечен большой звездой.',
      ],
    },
  },
}

/** Язык не из набора откатывается на английский: человек видит работающую страницу, а не пустоту. */
export function architectHomeUi(lang: string): ArchitectHomeUi {
  return DICT[lang] ?? DICT.en
}
