// СЛОВА ОСТРОВКА, ПОКАЗЫВАЮЩЕГО ПОРТ СЛУЖБЫ — рядом с самим островком (264-1).
//
// 🔒 ПОЧЕМУ СЛОВА ЗДЕСЬ, А НЕ В `_data` СТРАНИЦЫ. `_data` несёт слова СТРАНИЦЫ —
// заголовок, вступление и темы. Островок переиспользуемый: тот же вопрос «на
// каком порту живёт этот блок» встанет у раздела «Данные» и у любого следующего
// сменного блока. Приём тот же, что у лестницы домена и слов cookie-баннера.
//
// 🔒 МОДУЛЬ СЕРВЕРНЫЙ. Островок получает уже выбранный язык пропсами — в браузер
// уезжает один набор строк, а не словарь; за этим следит `check:lang-delivery`.

// 289-3: имя службы подставляется — островок стоит на главной вкладке каждой службы (вход, данные, сайт, новые);
// добавлена секция «адрес в интернете».
export type ServicePortWords = {
  /** пока ответ двери не пришёл */
  loading: string
  /** «служба такая-то живёт на порту» — `{port}` подставляется */
  onPort: string
  /** блока нет в составе узла */
  absent: string
  /** блок в составе, но порт ещё не назначен — установка не выполнена */
  notInstalled: string
  /** дверь не ответила: сказать честно, а не подставить правдоподобное число */
  unknown: string
  /** одна фраза о том, почему число спрашивается, а не написано */
  note: string
  /** секция «адрес в интернете» (289-3) */
  /** заголовок карточки порта (289-6) */
  portTitle: string
  reach: {
    title: string
    asking: string
    local: string
    cloudflare: string
    address: string
    live: string
    notConnected: string
    noDns: string
    noRoute: string
    notAnswering: string
    cannotCheck: string
    notAllowed: string
    check: string
    connect: string
    connecting: string
    connectFailed: string
    /** 2026-10-01: Cloudflare отказал ключу узла в доступе к туннелю (1001 Not authorized) — объяснение и путь к замене ключа. */
    connectNoTunnel: string
    connectKeyLink: string
  }
}

const NAMES: Record<string, Record<string, string>> = {
  en: { auth: "Your sign-in service", data: "Your data service", config: "Your settings service", design: "Your design service", graph: "Your knowledge graph", storage: "Your file storage", vectors: "Your vector store", cache: "Your fast store", memory: "Your deep memory", root: "Your site", default: "This service" },
  ru: { auth: "Ваша служба входа", data: "Ваша служба данных", config: "Ваша служба настроек", design: "Ваша служба дизайна", graph: "Ваш граф знаний", storage: "Ваше хранилище файлов", vectors: "Ваше векторное хранилище", cache: "Ваше быстрое хранилище", memory: "Ваша глубокая память", root: "Ваш сайт", default: "Эта служба" },
}

const DICT: Record<string, ServicePortWords> = {
  en: {
    loading: "Asking the node…",
    onPort: "{name} lives on port {port}.",
    absent: "This node does not carry this service yet.",
    notInstalled: "The service is part of this node, but it has not been installed yet — no port is assigned.",
    unknown: "The node did not answer just now, so the port is unknown. Nothing is guessed here: a plausible number would read as a checked fact.",
    note: "The number is asked of the node on every visit, never remembered: the installer may hand the block a different port, and a remembered one would knock at an empty door.",
    portTitle: "Port on this machine",
    reach: {
      title: "Address on the internet",
      asking: "Checking the address…",
      local: "The node works on this machine only: it has no domain of its own. Address on this machine: {url}",
      cloudflare: "The node is served through Cloudflare.",
      address: "Address:",
      live: "The address answers from the internet.",
      notConnected: "The name is not connected yet:",
      noDns: "no DNS record",
      noRoute: "no tunnel route",
      notAnswering: "The name is connected, but the address does not answer (code {code}).",
      cannotCheck: "Cannot check now: {reason}.",
      notAllowed: "The check is open to the architect.",
      check: "Check connection",
      connect: "Connect",
      connecting: "Connecting…",
      connectFailed: "Could not connect: {reason}.",
      connectNoTunnel: "Could not connect: the node's Cloudflare key cannot manage the tunnel. Replace the key — the screen shows how.",
      connectKeyLink: "Open Hosting → Domain",
    },
  },
  ru: {
    loading: "Спрашиваю узел…",
    onPort: "{name} живёт на порту {port}.",
    absent: "В составе этого узла такой службы пока нет.",
    notInstalled: "Служба входит в состав узла, но ещё не установлена — порт ей не назначен.",
    unknown: "Узел сейчас не ответил, и порт неизвестен. Правдоподобное число здесь не подставляется: его читают как проверенный факт.",
    note: "Число спрашивается у узла при каждом заходе и никогда не помнится: установщик может назначить блоку другой порт, а запомненный стучался бы в пустоту.",
    portTitle: "Порт на этой машине",
    reach: {
      title: "Адрес в интернете",
      asking: "Проверяю адрес…",
      local: "Узел работает только на этой машине: своего домена у него нет. Адрес на машине: {url}",
      cloudflare: "Узел обслуживается через Cloudflare.",
      address: "Адрес:",
      live: "Адрес отвечает из интернета.",
      notConnected: "Имя ещё не подключено:",
      noDns: "нет записи DNS",
      noRoute: "нет маршрута туннеля",
      notAnswering: "Имя подключено, но адрес не отвечает (код {code}).",
      cannotCheck: "Проверить сейчас нельзя: {reason}.",
      notAllowed: "Проверка доступна архитектору.",
      check: "Проверить подключение",
      connect: "Подключить",
      connecting: "Подключаю…",
      connectFailed: "Подключить не удалось: {reason}.",
      connectNoTunnel: "Подключить не удалось: ключ Cloudflare узла не может управлять туннелем. Замените ключ — экран покажет как.",
      connectKeyLink: "Открыть «Хостинг → Домен»",
    },
  },
}

/** Слова островка на выбранном языке для службы `serviceId`; незнакомый язык честно деградирует до английского. */
export function servicePortWords(lang: string, serviceId = "auth"): ServicePortWords {
  const d = DICT[lang] ?? DICT.en
  const names = NAMES[lang] ?? NAMES.en
  return { ...d, onPort: d.onPort.replace("{name}", names[serviceId] ?? names.default) }
}
