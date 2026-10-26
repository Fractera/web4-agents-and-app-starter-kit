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
  /**
   * Глубокая память и любознательная душа (599-2): как пользоваться памятью, что она делает с каждым видом файлов, зачем ключ OpenAI
   * при подписке Claude (карточка ведёт в редактор ключей ядра — вход ничего не спрашивает сам, 582) и как агент ищет опыт других
   * проектов в базе навыков. Факты — README элемента памяти v2.2.0, навык `use-deep-memory`, первоисточники Anthropic (итог 599-2).
   */
  memory: {
    anchor: string
    tab: string
    title: string
    lead: string
    use: { title: string; items: string[] }
    files: { title: string; items: string[] }
    key: { title: string; text: string; card: ArchitectAction }
    curious: { title: string; paragraphs: string[] }
  }
  /**
   * Непрерывная эволюция (599-3). Только построенное — решение владельца 2026-10-26 «Только построенное (Рекомендую)»: агент закрепляет
   * объяснение памятью и навыком («разбор», образ архитектора), недостающую возможность узел строит по «да»; чего нет — не пишется.
   */
  evolution: { anchor: string; tab: string; title: string; lead: string; today: { title: string; items: string[] } }
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
    memory: {
      anchor: 'memory',
      tab: 'Memory',
      title: 'Deep memory and a curious soul',
      lead: 'The agents of the node have two memories. [[Basic memory|basic-memory]] works on its own: the agent remembers your conversations and knows where you stopped. [[Deep memory|deep-memory]] keeps what you ask it to remember and gives it back when you ask, a month or a year later.',
      use: {
        title: 'How to use it',
        items: [
          'Write or say “remember…” to the [[main agent|main-agent]] in your own words, in Telegram or in the terminal. “Note down”, “save this” and “don’t forget” work too: the agent reads what you want in any language and does not look for an exact word.',
          'To get it back, ask “remind me about…” or “what did I say about…”. The answer comes from both memories, with the date, the source and how sure the memory is. When it finds a thing, the agent sends you its file.',
          'Send a photo, a document or a voice note together with words, for example “remember, this is my mom”. The memory keeps them together and finds them by meaning.',
          'You run the basic memory with words: “show me what you remember”, “forget yesterday”, “stop remembering” and “remember again”. The deep memory cannot forget yet.',
        ],
      },
      files: {
        title: 'What the memory does with each kind of file',
        items: [
          'Photos and pictures are described in words and kept with the description. Ask “remind me what was on the taxi receipt” and you get the description and the picture itself.',
          'A PDF is read whole and kept with its description, so you find it by what it says, not by its file name.',
          'A voice note is turned into text and then read like any other phrase.',
          'In a video the memory reads the frames and the sound when the computer has the ffmpeg program. Without it, the memory tells you it cannot read the video.',
          'Documents and code are read as text. The memory never runs code.',
          'A text longer than 2,000 words is kept whole, without being split into facts.',
          'Links to web pages and YouTube are not opened on the node yet: the phrase is kept and the link stays unread.',
        ],
      },
      key: {
        title: 'Why an OpenAI key when you have a Claude subscription',
        text: 'The agents work on your Claude subscription. The memory also needs two things Anthropic does not make. One is vectors, the numbers that let the memory search by meaning instead of matching words: Anthropic does not offer its own embedding model. The other is speech recognition: the Claude API does not take audio, so an OpenAI model turns voice notes into text. The memory also splits a phrase into facts on an inexpensive OpenAI model, which leaves your subscription quota to the agents. A usual message costs a fraction of a cent.',
        card: {
          title: 'Add your OpenAI key',
          text: 'The key stays on your computer, in the core’s settings. Without it the memory cannot search by meaning, voice notes are not turned into text and the skills base stays closed.',
          path: '/build/environment#OPENAI_API_KEY',
          label: 'Add',
        },
      },
      curious: {
        title: 'A curious soul: what other people already know',
        paragraphs: [
          'The node’s agents are curious by nature. Before building something new, an agent looks at how other projects solved the same task, in the node’s [[skills base|skills-base]]. The base comes with every copy of the node: skills of other projects, each with its licence.',
          'When it finds something close, the agent combines that experience with its own reasoning, puts it in its own words and names whose skill it was. When nothing is close, it says so instead of offering the nearest skill as a fit. The deep memory works the same way: for a request no service of the node can handle, it suggests a skill from the base.',
        ],
      },
    },
    evolution: {
      anchor: 'evolution',
      tab: 'Evolution',
      title: 'Continuous evolution',
      lead: 'At the start you get an agent that will not meet every expectation. It may see a task its own way. The cure is simple: explain what result you need or what the right solution looks like. The agent keeps it in memory or in a [[skill|skill]] and does it your way next time.',
      today: {
        title: 'How the agent learns today',
        items: [
          'It remembers you. What you tell it about yourself and how you want things done goes into the [[basic memory|basic-memory]], and every new session starts with it.',
          'It reviews its own work. When the agent of an [[element|element]] finishes a task, it asks in Telegram whether to turn it off and offers you to reply [[“review”|review]]. The agent then reads back its session, finds where it stumbled or where you corrected it, and suggests up to three changes to its skills. It makes only the ones you said “yes” to and writes your answer down word for word, so a rejected idea is not offered again.',
          'It builds what is missing. When an element lacks a capability, it asks the node. The [[main agent|main-agent]] looks for someone in the node who can already do it. If nobody can, it asks you, and after your “yes” it leads the building and tells the element when it is ready.',
        ],
      },
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
    memory: {
      anchor: 'memory',
      tab: 'Память',
      title: 'Глубокая память и любознательная душа',
      lead: 'У агентов узла две памяти. [[Базовая память|basic-memory]] работает сама: агент помнит ваши разговоры и знает, на чём вы остановились. [[Глубокая память|deep-memory]] хранит то, что вы просите запомнить, и возвращает это по вашей просьбе, хоть через месяц, хоть через год.',
      use: {
        title: 'Как пользоваться',
        items: [
          'Напишите или скажите [[главному агенту|main-agent]] «запомни…» своими словами, в Telegram или в терминале. Подойдут и «запиши», «сохрани», «не забудь»: агент понимает, чего вы хотите, на любом языке и не ищет точное слово.',
          'Чтобы вернуть сказанное, спросите «напомни о…» или «что я говорил про…». Ответ соберётся из обеих памятей, с датой, источником и тем, насколько память уверена. Если нашлась вещь, агент пришлёт её файл.',
          'Фото, документ или голосовое пришлите вместе со словами, например «запомни, это моя мама». Память сохранит их вместе и найдёт по смыслу.',
          'Базовой памятью вы управляете словами: «покажи, что ты помнишь», «забудь вчерашний день», «не запоминай» и «запоминай снова». Глубокая память забывать пока не умеет.',
        ],
      },
      files: {
        title: 'Что память делает с каждым видом файлов',
        items: [
          'Фото и картинки память описывает словами и хранит вместе с описанием. Спросите «напомни, что было на чеке за такси», и получите описание и сам снимок.',
          'PDF читается целиком и хранится вместе с описанием, поэтому найти его можно по содержанию, а не по имени файла.',
          'Голосовое превращается в текст и разбирается как обычная фраза.',
          'В видео память разбирает кадры и звук, если на компьютере есть программа ffmpeg. Без неё память скажет, что видео прочитать не может.',
          'Документы и код читаются как текст. Код память никогда не запускает.',
          'Текст длиннее 2000 слов хранится целиком, без разбора на факты.',
          'Ссылки на страницы и YouTube узел пока не открывает: фраза сохранится, а ссылка останется непрочитанной.',
        ],
      },
      key: {
        title: 'Зачем ключ OpenAI, если есть подписка Claude',
        text: 'Агенты работают по вашей подписке Claude. Памяти нужны ещё две вещи, которых у Anthropic нет. Первая — векторы: числа, по которым память ищет по смыслу, а не по совпадению слов; своей модели векторов у Anthropic нет. Вторая — распознавание речи: API Claude не принимает звук, поэтому голосовые превращает в текст модель OpenAI. Разбирает фразу на факты память тоже на недорогой модели OpenAI, и квота вашей подписки остаётся агентам. Обычное сообщение стоит доли цента.',
        card: {
          title: 'Добавьте ключ OpenAI',
          text: 'Ключ хранится на вашем компьютере, в настройках ядра. Без него память не ищет по смыслу, голосовые не превращаются в текст, а база навыков закрыта.',
          path: '/build/environment#OPENAI_API_KEY',
          label: 'Добавить',
        },
      },
      curious: {
        title: 'Любознательная душа: опыт других людей',
        paragraphs: [
          'Агенты узла любопытны по природе. Прежде чем строить новое, агент смотрит, как ту же задачу решили другие проекты, в [[базе навыков|skills-base]] узла. База приходит с каждой копией узла: навыки других проектов, у каждого своя лицензия.',
          'Если нашлось близкое, агент соединяет чужой опыт со своим рассуждением, пересказывает своими словами и называет, чей это навык. Если близкого нет, он так и говорит и не выдаёт ближайший навык за подходящий. Глубокая память работает так же: на просьбу, с которой не справится ни одна служба узла, она предложит навык из базы.',
        ],
      },
    },
    evolution: {
      anchor: 'evolution',
      tab: 'Эволюция',
      title: 'Непрерывная эволюция',
      lead: 'На старте вы получаете агента, который не во всём попадает в ваши ожидания: у него может быть свой взгляд на решение задачи. Лечится это просто. Объясните, какой результат вам нужен или как выглядит правильное решение, и агент закрепит это в памяти или в [[навыке|skill]], чтобы в следующий раз сделать по-вашему.',
      today: {
        title: 'Как агент учится уже сегодня',
        items: [
          'Помнит вас. То, что вы рассказываете о себе и о том, как вам нужно, агент записывает в [[базовую память|basic-memory]], и каждая новая сессия начинается с этого знания.',
          'Разбирает свою работу. Закончив задачу, агент [[элемента|element]] спрашивает в Telegram, выключить ли его, и предлагает ответить [[«разбор»|review]]. Тогда он перечитывает свою сессию, находит, где споткнулся или где вы его поправили, и предлагает до трёх правок своих навыков. Вносит только те, на которые вы ответили «да», а ваш ответ записывает дословно, чтобы отклонённое не предлагать снова.',
          'Строит то, чего не хватает. Если элементу не хватает возможности, он просит её у узла. [[Главный агент|main-agent]] ищет, кто в узле это уже умеет. Если никто, спрашивает вас, после «да» ведёт постройку и сообщает элементу, когда всё готово.',
        ],
      },
    },
  },
}

/** Язык не из набора откатывается на английский: человек видит работающую страницу, а не пустоту. */
export function architectHomeUi(lang: string): ArchitectHomeUi {
  return DICT[lang] ?? DICT.en
}

/** Языки словаря — сторож меток (`check-term-hints`) проверяет каждый. */
export const ARCHITECT_HOME_LANGS = Object.keys(DICT)
