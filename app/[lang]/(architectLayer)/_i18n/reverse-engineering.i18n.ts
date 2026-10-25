// Слова страницы «Проектирование продукта → Реверс-инжиниринг» (шаг 539-3; переписаны 556-9 и 594-6). Владелец 2026-10-23:
// «вместо трёх простых строк ты пишешь колбасу текста», «это шесть слов которые ты должен написать: – первая: добавьте адрес сайта
// чтобы начать разбор. – Добавьте страницы которые нужны после авторизации или загрузите скриншот. – – Добавить ещё страницы».
// Строки карточек — его слова; подробности — только под «?». 594-6: задача уходит агенту ЭТОГО элемента, в его проход разбора — первое
// слово «Build process, study:» мост узнаёт только по-английски, поэтому оно английское и в русской задаче.

import type { ReverseEngineeringWords } from "@/components/element-docs/reverse-engineering.client"

const DICT: Record<"en" | "ru", ReverseEngineeringWords> = {
  en: {
    site: {
      title: "Site address",
      lead: "Add the site address to start the study.",
      placeholder: "for example, tinylaunch.com",
      help: "The element's agent studies the open pages with REA in a study session of its own and writes down the sections, scenarios and rules. You can also give an SDK: a link to npm, PyPI or GitHub.",
    },
    page: {
      title: "Page {n}",
      lead: "Add a page you need after signing in, or upload a screenshot.",
      addressPlaceholder: "Page address, if there is one",
      notePlaceholder: "What matters on this page",
      upload: "Upload a screenshot",
      uploading: "Uploading…",
      uploadFailed: "The screenshot did not upload. Try again.",
      removeShot: "Remove the screenshot",
      remove: "Remove the page",
      help: "The agent can't see pages behind a sign-in, so a screenshot stands in for them. If it needs to sign in, it opens the node's login window and asks you in the terminal.",
      voiceKey: "Voice needs an OpenAI key",
    },
    addPage: "Add another page",
    start: "Start reverse engineering",
    helpLabel: "Help",
    task: "Build process, study: Study {target} for my product quiz. For a site, the sections, scenarios, entities and rules; for an SDK, the modules, public functions, API calls and authorization. If you need to sign in to the site, ask me.",
    taskPages: "Pages to keep in mind:",
    taskPage: "Page {n}: {address}",
    taskNoAddress: "no address",
    taskShots: "Screenshots: {links}",
    drawerElement: { title: "The element's agent — study", collapse: "Collapse" },
    studies: {
      title: "Studies of this element",
      loading: "Loading…",
      failed: "Could not load the studies. Reload the page.",
      empty: "No studies yet. The first one appears here when the agent saves it.",
      files: "{files} files · {size} · {date}",
      bundle: "evidence bundle saved",
      noBundle: "no evidence bundle yet",
      ledger: "ledger: {status} · obligations {total} · required and open {open}",
      noLedger: "no ledger of obligations yet",
    },
    tool: {
      title: "Studies need the REA program",
      install: "Install",
      installNote: "About a minute and 150 MB of disk.",
      starting: "Starting…",
      running: "Installing, usually about a minute.",
      check: "Check",
      nodeOld: "REA needs Node.js 22.23.4 or newer, and this computer has {version}. Update Node.js and restart the node.",
      failed: "The install failed ({error}).",
      retry: "Install again",
    },
  },
  ru: {
    site: {
      title: "Адрес сайта",
      lead: "Добавьте адрес сайта, чтобы начать разбор.",
      placeholder: "например, tinylaunch.com",
      help: "Агент элемента сам разберёт открытые страницы программой REA в отдельной сессии разбора и опишет разделы, сценарии и правила. Можно указать и SDK: ссылку на npm, PyPI или GitHub.",
    },
    page: {
      title: "Страница {n}",
      lead: "Добавьте страницу, которая нужна после авторизации, или загрузите скриншот.",
      addressPlaceholder: "Адрес страницы, если есть",
      notePlaceholder: "Что на этой странице важно",
      upload: "Загрузить скриншот",
      uploading: "Загружаю…",
      uploadFailed: "Скриншот не загрузился. Попробуйте ещё раз.",
      removeShot: "Убрать скриншот",
      remove: "Убрать страницу",
      help: "Страницы после входа агент сам не видит, их заменяет скриншот. Если ему понадобится войти, он откроет окно входа узла и спросит вас в терминале.",
      voiceKey: "Для голоса нужен ключ OpenAI",
    },
    addPage: "Добавить ещё страницу",
    start: "Начать реверс-инжиниринг",
    helpLabel: "Подсказка",
    task: "Build process, study: Разбери {target} для моего продуктового квиза. Если это сайт — разделы, сценарии, сущности и правила; если SDK — модули, публичные функции, вызовы API и авторизацию. Если понадобится войти на сайт, спроси меня.",
    taskPages: "Страницы, которые нужно учесть:",
    taskPage: "Страница {n}: {address}",
    taskNoAddress: "адрес не указан",
    taskShots: "Скриншоты: {links}",
    drawerElement: { title: "Агент элемента — разбор", collapse: "Свернуть" },
    studies: {
      title: "Разборы этого элемента",
      loading: "Загружаю…",
      failed: "Не удалось загрузить разборы. Обновите страницу.",
      empty: "Разборов пока нет. Первый появится здесь, когда агент его сохранит.",
      files: "файлов {files} · {size} · {date}",
      bundle: "пакет доказательств сохранён",
      noBundle: "пакета доказательств пока нет",
      ledger: "журнал: {status} · обязательств {total} · обязательных открыто {open}",
      noLedger: "журнала обязательств пока нет",
    },
    tool: {
      title: "Для разбора нужна программа REA",
      install: "Установить",
      installNote: "Около минуты и 150 МБ на диске.",
      starting: "Запускаю…",
      running: "Устанавливаю, обычно около минуты.",
      check: "Проверить",
      nodeOld: "REA нужен Node.js 22.23.4 или новее, а на этом компьютере {version}. Обновите Node.js и перезапустите узел.",
      failed: "Установка не удалась ({error}).",
      retry: "Установить ещё раз",
    },
  },
}

export function reverseEngineeringUi(lang: string): ReverseEngineeringWords {
  return lang === "ru" ? DICT.ru : DICT.en
}
