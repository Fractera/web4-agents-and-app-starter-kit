import type { Block, WorkspaceItem } from '@/lib/content/blocks/types'
import { headingId } from '@/lib/content/blocks/inline'
import { labelsToForms, resolveTermLabels } from '@/lib/content/blocks/term'
import { architectHomeUi, type BasicsTerm } from '../../../../_i18n/architect-home.i18n'
import { presentationWords, type PresentationSection } from '../_data/presentation'

// СОДЕРЖИМОЕ СТРАНИЦЫ «How it works» — презентация узла и его связи с Lagrix (шаг 535, слово владельца 2026-10-18 — в
// `../_data/presentation.ts`). Три уровня нумерации: раздел «1.» (h2) → часть «1.1» (h3) → нумерованный список. Сразу после вступления —
// карточка «панель открывать не обязательно»: владелец назвал её самым важным.
//
// 600-1 (владелец 2026-10-26): разделы 5–6 — «Глубокая память» и «Непрерывная эволюция» — переехали сюда со входа `/architect`;
// вверху страницы — оглавление из заголовков разделов (`tabsOf`), тот же ряд якорей, что на `/ru/auth`.
//
// 🛑 СЛОВА ОТСЮДА НЕ ПИШУТСЯ: любая строка, которую увидит человек, приходит из `_data` — иначе она не переводится и её не видит сторож
// словарей. Метки `[[форма|ключ]]` в этих словах раскрывает ликбез входа: `architect-home.i18n.ts`, раздел «basics».

function glossaryOf(lang: string): (text: string) => string {
  const termWord = (t: BasicsTerm) => (t.aside ? `${t.word} (${t.aside})` : t.word)
  const terms = Object.fromEntries(architectHomeUi(lang).basics.items.map((t) => [t.key, { word: termWord(t), text: labelsToForms(t.text) }]))
  return (text) => resolveTermLabels(text, terms)
}

/** Оглавление: одна вкладка на раздел, якорь — тот же, что печатает заголовок `h2` (`headingId`). */
export function tabsOf(lang: string): WorkspaceItem[] {
  return presentationWords(lang).sections.map((s) => ({ label: s.tab, href: `#${headingId(s.title)}` }))
}

export function content(lang: string): Block[] {
  const w = presentationWords(lang)
  const words = glossaryOf(lang)
  return [
    { kind: 'p', text: words(w.intro) },
    // Кнопка карточки — подключение Telegram главного агента (владелец 2026-10-18: «add button … -> …/ru/build/telegram»).
    { kind: 'callout', title: w.card.title, text: w.card.text, action: { href: `/${lang}/build/telegram`, label: w.card.action } },
    ...w.sections.flatMap((s: PresentationSection, i): Block[] => [
      { kind: 'h2', text: s.title },
      ...(s.lead ? [{ kind: 'p', text: words(s.lead) } as Block] : []),
      ...s.parts.flatMap((p): Block[] => [
        { kind: 'h3', text: p.title },
        { kind: 'olist', items: p.items.map(words) },
      ]),
      // 535-3 (владелец 2026-10-18): в конце первого раздела — карточка о миссии Lagrix с кнопкой на главную lagrix.dev (en/ru).
      ...(i === 0
        ? [{ kind: 'callout', title: w.lagrixCard.title, text: w.lagrixCard.text, action: { href: `https://lagrix.dev/${lang === 'ru' ? 'ru' : 'en'}`, label: w.lagrixCard.action, external: true } } as Block]
        : []),
      // 535-4 (владелец 2026-10-18): в конце второго раздела — карточка «ИИ — сердце узла» с кнопкой на активацию Claude Code.
      ...(i === 1
        ? [{ kind: 'callout', title: w.aiCard.title, text: w.aiCard.text, action: { href: `/${lang}/build/subscription`, label: w.aiCard.action } } as Block]
        : []),
      // 600-1: карточка раздела памяти — ключ OpenAI, кнопка ведёт в редактор ключей ядра.
      ...(s.card
        ? [{ kind: 'callout', title: words(s.card.title), text: words(s.card.text), action: { href: `/${lang}${s.card.path}`, label: s.card.action } } as Block]
        : []),
    ]),
  ]
}
