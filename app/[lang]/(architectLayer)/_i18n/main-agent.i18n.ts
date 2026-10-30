// СЛОВА СВОДНЫХ СТРАНИЦ «ГЛАВНОГО АГЕНТА» (528-3): Messenger и Рабочий процесс ядра ведут к той же странице у root и у каждого
// кастомного элемента. `en` основа, `ru` перевод; слой архитектора двуязычен.

export type MainAgentUi = {
  elementsTitle: string
  elementsLead: string
  open: string
  off: string
  draft: string
  none: string
}

const UI: Record<"en" | "ru", MainAgentUi> = {
  en: {
    elementsTitle: "The same page in each element",
    elementsLead: "The main agent gathers root and every custom element of the node. Open the page of the element you need.",
    open: "Open",
    off: "turned off in the element's passport",
    draft: "a draft: the element is not born yet",
    none: "There are no custom elements in the node yet.",
  },
  ru: {
    elementsTitle: "Эта же страница у элементов",
    elementsLead: "Главный агент собирает root и все кастомные элементы узла. Откройте страницу нужного элемента.",
    open: "Открыть",
    off: "выключено в паспорте элемента",
    draft: "черновик: элемент ещё не родился",
    none: "Кастомных элементов в узле пока нет.",
  },
}

export function mainAgentUi(lang: string): MainAgentUi {
  return lang === "ru" ? UI.ru : UI.en
}
