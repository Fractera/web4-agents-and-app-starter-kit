// РАЗДЕЛЫ «ГЛУБОКАЯ ПАМЯТЬ» И «НЕПРЕРЫВНАЯ ЭВОЛЮЦИЯ» — на странице «Как это работает» (шаг 600, владелец 2026-10-26:
// «it is incorrect place, correct here: …/passport/how-it-works», и «приведи текст в соответствии стандарту страницы»).
// До 600 их держал вход `/architect` (599-2 и 599-3). Здесь — короче и выдержаннее; каждое утверждение сверено с кодом
// (итог 600-2: `completed-steps/600-2.md`).
//
// 🔒 Тексты пишутся тем же ключом, что соседние разделы: `en` основа, `ru` перевод. Метки `[[форма|ключ]]` раскрывает
// `_components/index.ts` через ликбез входа (`architect-home.i18n.ts`, раздел «basics»); сторож `check-term-hints` проверяет их.
import type { PresentationSection } from './presentation'

export const MEMORY_SECTIONS: Record<'en' | 'ru', PresentationSection[]> = {
  en: [
    {
      title: '5. Deep memory and a curious soul',
      tab: 'Deep memory',
      lead: 'The agents of the node have two memories. [[Basic memory|basic-memory]] works on its own. [[Deep memory|deep-memory]] keeps what you ask it to keep and gives it back when you ask, a month or a year later.',
      parts: [
        {
          title: '5.1 How to use it',
          items: [
            'Say or write “remember…” to the [[main agent|main-agent]] in your own words, in Telegram or in the terminal. “Note down”, “save this” and “don’t forget” work too, in any language.',
            'To get it back, ask “remind me about…” or “what did I say about…”. The answer gathers both memories, with the date, the source and how sure the memory is. If it finds a thing, the agent sends you its file.',
            'Send a photo, a document or a voice note together with the words, for example “remember, this is my mom”.',
            'You run the basic memory with words: “what do you know about me”, “forget …”, “don’t remember” and “remember again”. The deep memory cannot forget yet.',
          ],
        },
        {
          title: '5.2 What it keeps from each kind of file',
          items: [
            'A photo or picture is described in words and kept together with the description.',
            'A PDF is read whole and kept with its description, so you find it by its content, not by its file name.',
            'A voice note is turned into text and read like any phrase.',
            'A video is read by its frames and sound if the computer has ffmpeg. Without it, the memory says it cannot read the video.',
            'Documents are read as text. Code is read as text and never run.',
            'A text longer than 2,000 words is kept whole, not split into linked facts.',
            'Links to pages and YouTube are not opened on the node yet: the phrase is kept, and the link stays unread.',
          ],
        },
        {
          title: '5.3 Why an OpenAI key next to a Claude subscription',
          items: [
            'The agents run on your Claude subscription. The memory also needs what Anthropic does not offer: vectors for search by meaning, and speech recognition, because the Claude API takes no audio. Both come from OpenAI, and the memory splits phrases into facts on an inexpensive OpenAI model. One message costs a fraction of a cent.',
          ],
        },
        {
          title: '5.4 A curious soul: what other projects already know',
          items: [
            'Before it builds something new, an agent looks in the node’s [[skills base|skills-base]] for how other projects solved the same task. The base comes with every copy of the node, and each skill keeps its own licence.',
            'When it finds something close, the agent adds that experience to its own reasoning, puts it in its own words and names whose skill it was. When nothing is close, it says so.',
          ],
        },
      ],
      card: {
        title: 'Add your OpenAI key',
        text: 'The key stays on your computer, in the core’s settings. Without it the memory does not search by meaning, voice notes are not turned into text, and the skills base stays closed.',
        action: 'Add',
        path: '/build/environment#OPENAI_API_KEY',
      },
    },
    {
      title: '6. Continuous evolution',
      tab: 'Evolution',
      lead: 'At first an agent may see a task its own way. Explain what result you need, or what the right solution looks like. The agent keeps it in memory or in a [[skill|skill]], and next time does it your way.',
      parts: [
        {
          title: '6.1 How the agent learns already today',
          items: [
            'It remembers you. What you tell it about yourself and how you want things done goes into the [[basic memory|basic-memory]], and every new session starts with it.',
            'It reviews its own work. When an [[element|element]] finishes a task, it asks in Telegram whether to turn it off and offers to reply [[“review”|review]]. Then it reads its session and suggests up to three changes to its skills. It makes only the ones you accept, and writes your answer down word for word.',
            'It builds what is missing. An element that lacks a capability asks the node. The [[main agent|main-agent]] looks for someone in the node who can already do it. If nobody can, it asks you, and after your “yes” it leads the building.',
          ],
        },
      ],
    },
  ],
  ru: [
    {
      title: '5. Глубокая память и любознательная душа',
      tab: 'Глубокая память',
      lead: 'У агентов узла две памяти. [[Базовая память|basic-memory]] работает сама. [[Глубокая память|deep-memory]] хранит то, что вы попросите сохранить, и возвращает по просьбе — через месяц или через год.',
      parts: [
        {
          title: '5.1 Как пользоваться',
          items: [
            'Скажите или напишите [[главному агенту|main-agent]] «запомни…» своими словами — в Telegram или в терминале. «Запиши», «сохрани» и «не забудь» тоже работают, на любом языке.',
            'Чтобы вернуть сказанное, спросите «напомни о…» или «что я говорил про…». Ответ собирается из обеих памятей: с датой, источником и тем, насколько память уверена. Если нашлась вещь, агент пришлёт её файл.',
            'Фото, документ или голосовое пришлите вместе со словами, например «запомни, это моя мама».',
            'Базовой памятью управляют словами: «что ты обо мне знаешь», «забудь …», «не запоминай» и «запоминай снова». Глубокая память пока не умеет забывать.',
          ],
        },
        {
          title: '5.2 Что память делает с каждым видом файлов',
          items: [
            'Фото и картинки описываются словами и хранятся вместе с описанием.',
            'PDF читается целиком и хранится с описанием: найти его можно по содержанию, а не по имени файла.',
            'Голосовое превращается в текст и разбирается как обычная фраза.',
            'Видео разбирается по кадрам и звуку, если на компьютере есть программа ffmpeg. Без неё память скажет, что видео прочитать не может.',
            'Документы читаются как текст. Код тоже читается как текст и никогда не запускается.',
            'Текст длиннее 2000 слов хранится целиком, без разбивки на связанные факты.',
            'Ссылки на страницы и YouTube узел пока не открывает: фраза сохранится, а ссылка останется непрочитанной.',
          ],
        },
        {
          title: '5.3 Зачем ключ OpenAI, если есть подписка Claude',
          items: [
            'Агенты работают по вашей подписке Claude. Памяти нужно то, чего Anthropic не делает: векторы для поиска по смыслу и распознавание речи, потому что API Claude не принимает звук. Оба дают модели OpenAI; разбор фразы на факты тоже идёт на недорогой модели OpenAI. Обычное сообщение стоит доли цента.',
          ],
        },
        {
          title: '5.4 Любознательная душа: опыт других проектов',
          items: [
            'Прежде чем строить новое, агент смотрит в [[базе навыков|skills-base]] узла, как ту же задачу решили другие проекты. База приходит с каждой копией узла, и у каждого навыка своя лицензия.',
            'Если нашлось близкое, агент соединяет этот опыт со своим рассуждением, пересказывает своими словами и называет, чей это навык. Если близкого нет, он так и говорит.',
          ],
        },
      ],
      card: {
        title: 'Добавьте ключ OpenAI',
        text: 'Ключ хранится на вашем компьютере, в настройках ядра. Без него память не ищет по смыслу, голосовые не превращаются в текст, а база навыков закрыта.',
        action: 'Добавить',
        path: '/build/environment#OPENAI_API_KEY',
      },
    },
    {
      title: '6. Непрерывная эволюция',
      tab: 'Эволюция',
      lead: 'Сначала агент может видеть задачу по-своему. Объясните, какой результат нужен или как выглядит правильное решение: агент запишет это в память или в [[навык|skill]] и в следующий раз сделает по-вашему.',
      parts: [
        {
          title: '6.1 Как агент учится уже сегодня',
          items: [
            'Помнит вас. То, что вы рассказываете о себе и о том, как вам нужно, попадает в [[базовую память|basic-memory]], и каждая новая сессия начинается с этого.',
            'Разбирает свою работу. Закончив задачу, агент элемента спрашивает в Telegram, выключить ли его, и предлагает ответить [[«разбор»|review]]. Тогда он перечитывает сессию и предлагает до трёх правок своих навыков. Вносит только то, на что вы ответили «да», а ваш ответ записывает дословно.',
            'Строит недостающее. Если элементу не хватает возможности, он просит её у узла. [[Главный агент|main-agent]] ищет, кто в узле это уже умеет; если никто, спрашивает вас и после «да» ведёт постройку.',
          ],
        },
      ],
    },
  ],
}
