import type { Block, WorkspaceItem } from '@/lib/content/blocks/types'
import type { WorkspacePageData } from '@/lib/collection/types'
import { ArchitectPage } from '../_lib/architect-page'
import { collectionMetadata } from '../_lib/collection-metadata'
import { architectLayerUi, ARCHITECT_LAYER_LANGS } from '../_i18n/architect-layer.i18n'
import { architectHomeUi, type BasicsTerm } from '../_i18n/architect-home.i18n'
import { ARCHITECT_HOME } from '../_lib/architect-menu'
import { nodeStateWidget } from '@/components/node-state/widgets'
import { labelsToForms, resolveTermLabels } from '@/lib/content/blocks/term'

// ✗ У ВХОДА В СЛОЙ НЕ БЫЛО МЕТАДАННЫХ ВОВСЕ — ИЗМЕРЕНО 2026-09-20 (256-7):
//
//   /ru/architect        → <meta name="robots" content="index, follow">
//   /ru/architect/tools  → <meta name="robots" content="noindex, nofollow, nocache">
//
// Двадцать девять разделов слоя объявляли себя закрытыми, а их собственный вход —
// открытым: у него не было `generateMetadata`, и он наследовал корневые. Правило,
// которого нет, читается как разрешение.
//
// 🔒 ЭТО ТРЕТИЙ РАЗ, КОГДА ВХОД ВЫПАДАЕТ ИЗ СПИСКА СВОИХ ЖЕ РАЗДЕЛОВ: 240 — не
// попал в список маршрутов и отдавал владельцу 404; 254 — корневой список пережил
// снос страниц. Признак один и тот же: **вход не считает себя элементом того, что
// перечисляет.**
//
// 🔒 МЕТАДАННЫЕ СТРОИТ ТА ЖЕ ФАБРИКА, ЧТО И У РАЗДЕЛОВ, — второго способа не
// заводится. Отличие входа только в том, ГДЕ лежат его слова: у разделов — в своей
// папке `_data`, у него — в словаре слоя, потому что он не элемент дерева папок, а
// его корень. Данные собираются здесь в ту же форму, и фабрика разницы не видит.
// ✗ ЗДЕСЬ СТОЯЛО `overrides: { [lang]: words }`, И ЭТО БЫЛ ДЕФЕКТ, НАЙДЕННЫЙ
// ПРИБОРОМ ЧЕРЕЗ ДЕСЯТЬ МИНУТ ПОСЛЕ НАПИСАНИЯ (256-8). Список переводов ЗАВИСЕЛ
// ОТ ТОГО, КТО СПРАШИВАЕТ: английская версия видела только себя, русская — себя и
// английскую. `hreflang` выходил односторонним, а такой поисковик игнорирует
// целиком — то есть работа выглядела сделанной и не работала.
//
// 🔒 СПИСОК ЯЗЫКОВ — СВОЙСТВО СЛОВАРЯ, А НЕ ЗАПРОСА, и берётся у самого словаря
// (`ARCHITECT_LAYER_LANGS`). Ответ обязан быть одинаков для всех спрашивающих.
const entranceData = (): WorkspacePageData => {
  const wordsOfLang = (l: string) => {
    const ui = architectLayerUi(l)
    return { title: ui.home.title, lead: ui.home.lead }
  }
  return {
    meta: { slug: 'architect', order: 0 },
    en: wordsOfLang('en'),
    overrides: Object.fromEntries(ARCHITECT_LAYER_LANGS.map(l => [l, wordsOfLang(l)])),
  }
}

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params
  return collectionMetadata(entranceData(), '')({ params })
}

// ВХОД В СЛОЙ АРХИТЕКТОРА — страница `/{lang}/architect`.
//
// ✗ ОПЛАЧЕНО ВЛАДЕЛЬЦЕМ: он открыл `/ru/architect` и получил 404. Десять разделов
// слоя работали, а самого входа не существовало — снаружи это неотличимо от
// «слоя нет».
//
// 🔒 РИСУЕТСЯ ТЕМ ЖЕ ВИДОМ, ЧТО И ОСТАЛЬНЫЕ ДЕСЯТЬ — `workspace`. Второй раскладки
// для входа не заводится: она разошлась бы с разделами на первой правке темы.
//
// 🪦 АККОРДЕОН ОТМЕНЁН 2026-09-19 (владелец: «уберём с этой страницы аккордеоны и
// представим страницу в виде раскрытых блоков с заголовками своего уровня и
// описанием»). Свёрнутое здесь мешало: сюда приходят разбираться в своём узле, а
// не открывать полосы по одной.
//
// 🔒 ВЕРХНИЙ РЯД — НАВИГАЦИЯ ПО ЭТОЙ ЖЕ СТРАНИЦЕ, А НЕ КОПИЯ ЛЕВОГО МЕНЮ.
// ✗ Оплачено его прямым указанием: «ошибка, которую ты совершил, — ты
// продублировал это меню и слева, и сверху; это меню предназначено только для
// навигации по странице с плавной прокруткой». Ряд собирается из ТЕХ ЖЕ тем, что
// и разделы ниже, — второго списка не существует, и разойтись им негде.
// Плавность даёт `scroll-smooth` на корне документа, без единой строки скрипта.
export default async function Page({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params
  const ui = architectLayerUi(lang)
  const home = architectHomeUi(lang)

  // Разделы страницы: заголовок третьего уровня с явным якорем, текст, список.
  //
  // 🔒 ЯКОРЬ ЗАДАН ЯВНО, А НЕ ВЫВЕДЕН ИЗ ЗАГОЛОВКА. Генератор якорей оставляет от
  // русского заголовка нечитаемый хеш (`h-1f4c…`) — ссылка на такой адрес ничего
  // не говорит человеку и рвётся при первой правке слов.
  // 582 (владелец 2026-10-24): «три популярных действия чтобы начать … И внизу сразу дай главный ликбез».
  // Действие — та же карточка со ссылкой, что у страниц главного агента (`docref`); адрес — от корня ядра (285-6).
  //
  // 599-1: метки `[[форма|ключ]]` в текстах становятся подсказками с определением из ликбеза того же языка — один источник слов.
  // В подсказке метки внутри определения — простые слова: подсказка в подсказке не открывается.
  const termWord = (t: BasicsTerm) => (t.aside ? `${t.word} (${t.aside})` : t.word)
  const terms = Object.fromEntries(home.basics.items.map((t) => [t.key, { word: termWord(t), text: labelsToForms(t.text) }]))
  const words = (text: string) => resolveTermLabels(text, terms)

  const children: Block[] = [
    { kind: 'h3', text: home.start.title, id: home.start.anchor },
    ...home.start.actions.map((a): Block => ({
      kind: 'docref',
      title: words(a.title),
      summary: words(a.text),
      href: `/${lang}${a.path}`,
      label: a.label,
      navigate: true,
    })),
    { kind: 'h3', text: home.basics.title, id: home.basics.anchor },
    {
      kind: 'list',
      items: home.basics.items.map((t) => words(`**${termWord(t)}** — ${t.text}${t.more ? ` ${t.more}` : ''}`)),
    },
  ]

  const tabs: WorkspaceItem[] = [home.start, home.basics].map(t => ({ label: t.tab, href: `#${t.anchor}` }))

  return (
    <ArchitectPage
      lang={lang}
      path={ARCHITECT_HOME}
      pageTitle={ui.home.title}
      pageLead={ui.home.lead}
      title={ui.home.sectionTitle}
      tabs={tabs}
      children={children}
      // 🔒 СОСТОЯНИЕ УЗЛА — ОСТРОВОК, А НЕ БЛОК (276-2). Эта страница предрендерена: измеренное на
      // сборке утверждение «ваш сайт виден в интернете» застыло бы в HTML и продолжало бы висеть в
      // день, когда домен уехал. Слова выбираются здесь, на сервере, и уезжают одним набором.
      // 582: островок молчит до кнопки «Получить текущее состояние» — вход не спрашивает узел сам.
      widget={nodeStateWidget(lang)}
    />
  )
}
