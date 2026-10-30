import "server-only"
import type { WorkspaceItem } from '@/lib/content/blocks/types'
import { listDrafts } from '@/lib/web4-items/drafts'
import { addressOf } from '@/lib/web4-items/element-address'
import { ITEM_TREE, treeLang, treeVisible, type TreePage } from '@/lib/web4-items/item-tree'
import { elementPassport, hasCatalog, isNativeElement } from '@/lib/a2a/element-passport'
import { treeContextOf } from '@/lib/web4-items/tree-context'
import { BUILT_IN_STATIC, MEMORY_GROUP, builtInDraft, builtInIds } from '@/lib/web4-items/built-in-elements'
import { hasDoc } from '@/lib/web4-items/element-docs'
import { web4DraftsUi } from '../_i18n/web4-drafts.i18n'
import { CreateDraftButton } from '../_components/create-draft-button.client'
import { ARCHITECT_HOME } from './architect-menu'

// ЧЕРНОВИКИ И КНОПКА «СОЗДАТЬ МИКРОСЕРВИС» В ЛЕВОМ МЕНЮ (314-1). Слово владельца: «в левом меню после кнопки дизайн
// добавляем кнопку создать микро service». Меню слоя собирается из папок при сборке; черновики — данные узла, поэтому их
// пункты вставляются здесь, при отрисовке страницы, и появляются без пересборки (после записи дверь перерисовывает слой).
//
// 🔒 ОТДЕЛЬНЫЙ МОДУЛЬ, А НЕ `architect-menu.ts`: тот читают и не-серверные места (`lib/menu/account-links.ts`,
// сторож маршрутов), а здесь чтение файла с диска.
// 🔒 ЯКОРЬ — ГРУППА `design`. Её нет — кнопка и черновики встают в конец, а не пропадают.

const ANCHOR = 'design'
// 327 (слово владельца 2026-09-27): «после вкладки ядро добавим горизонтальный сепаратор, под которым слева в бордюр напишем более
// мелким шрифтом нативные WEB4 ITEMS. После вкладки дизайн добавим сепаратор … кастомные WEB4 ITEMS. Задача визуально разделить
// меню на зоны». Якорь первой зоны — пункт «Ядро» (`build`); вторая встаёт за «Дизайном», над кнопкой создания.
const CORE = 'build'

/** Разделитель зоны меню: горизонтальная черта и мелкая подпись у левого края — она же переключатель зоны (553). */
function zone(label: string, id: string, open: boolean): WorkspaceItem {
  return { label, zoneHead: { id, open } }
}

/** 553: пункты зоны прячутся вместе с ней; зона открыта, когда человек на странице одного из её пунктов. */
const inZone = (items: WorkspaceItem[], id: string): WorkspaceItem[] => items.map((m) => ({ ...m, zone: id }))
const holds = (items: WorkspaceItem[], path: string): boolean =>
  items.some((m) => !!m.active || !!m.open || (!!m.href && (path === m.href || path.startsWith(`${m.href}/`))))

/** Меню слоя с кнопкой и группами черновиков, вставленными за «Дизайном». */
export function withDrafts(menu: WorkspaceItem[], lang: string, currentPath: string): WorkspaceItem[] {
  const ui = web4DraftsUi(lang)
  const l = treeLang(lang)
  const at = (path: string) => `/${lang}${path}`

  const button: WorkspaceItem = {
    label: ui.create,
    node: <CreateDraftButton lang={lang} label={ui.create} busyLabel={ui.creating} failed={ui.createFailed} />,
  }
  // 582 (владелец 2026-10-24): «для нативных элементов … кнопку какую же как и для кастомных элементов – [+ создать нативный элемент]».
  const nativeButton: WorkspaceItem = {
    label: ui.createNative,
    zone: 'native',
    node: <CreateDraftButton lang={lang} label={ui.createNative} busyLabel={ui.creating} failed={ui.createFailed} native />,
  }

  // 557: пункт элемента — дерево. У встроенного элемента (`builtIn`) страницы, которые уже есть в папке службы, ведут на прежний адрес.
  const treeItem = (d: { id: string; native?: boolean }, builtIn: boolean): WorkspaceItem & { native: boolean } => {
    // 325-3: пункт и пути — по адресу элемента в ядре (нет своего — id).
    const slug = addressOf(d.id)
    const dir = `${ARCHITECT_HOME}/${slug}`
    const hrefPath = (path: string) => {
      const own = builtIn ? BUILT_IN_STATIC[path.slice(dir.length + 1)] : undefined
      return own ? `${dir}/${own}` : path
    }
    // 320: раздел со страницами раскрывается третьим уровнем (слово владельца 2026-09-27). Раздел «активен» только на
    // своей странице, «открыт» — пока человек на любой его странице: отметка «вы здесь» не стоит в двух местах.
    // 406-4: пункт «Каталог» — только у элемента, чей паспорт объявляет каталог.
    const catalog = hasCatalog(d.id)
    // 463 (владелец 2026-10-12: «…выпадающий список … отдельные страницы а не валить в одну кучу»): «Подписки» раскрывается
    // пунктом на каждый внешний сервис элемента (OWN-SERVICE-PROPS/SUBSCRIPTIONS.json), у каждого своя страница (528-1: под
    // «Рабочий процесс → Процесс»).
    const services = elementPassport(d.id)?.subscriptions?.services ?? []
    // 472: разделы H2A/H2H и страницы по флагам паспорта элемента (`messengers`); одна функция и для маршрута.
    // 582: черновик кнопки «Создать нативный элемент» — нативный ещё до рождения (паспорта у него пока нет).
    const native = builtIn || d.native === true || isNativeElement(d.id)
    const ctx = { ...treeContextOf(d.id), catalog, native }
    // 412-2: пункт документа — только пока его файл есть в папке элемента.
    const shownOf = (pages?: TreePage[]) => (pages ?? []).filter((p) => treeVisible(p, ctx) && (!p.doc || hasDoc(d.id, p.doc)))
    // 528-1: раздел, подраздел и страница устроены одинаково — пункт со ссылкой; есть видимые дети — раскрывается; открыт, когда
    // человек на нём или внутри; «вы здесь» — только на самой странице.
    const node = (p: TreePage, base: string): WorkspaceItem => {
      const path = `${base}/${p.slug}`
      const inside = currentPath.startsWith(`${path}/`)
      const kids: WorkspaceItem[] = path === `${dir}/workflow/process/subscriptions`
        ? services.map((x) => ({ label: x.name, href: at(`${path}/${x.id}`), active: `${path}/${x.id}` === currentPath }))
        : shownOf(p.pages).map((c) => node(c, path))
      const href = hrefPath(path)
      return kids.length > 0
        ? { label: p.words[l].title, href: at(href), active: href === currentPath, open: href === currentPath || inside, children: kids, reload: builtIn && href === path }
        : { label: p.words[l].title, href: at(href), active: href === currentPath || inside, reload: builtIn && href === path, ...(p.newTab ? { newTab: true } : {}) }
    }
    const children = shownOf(ITEM_TREE).map((s) => node(s, dir))
    return {
      native,
      label: slug,
      icon: 'box',
      href: at(dir),
      active: currentPath === dir,
      open: currentPath === dir || currentPath.startsWith(`${dir}/`),
      children,
    }
  }
  const drafts = listDrafts().map((d) => treeItem(d, false))
  // 557: прежний пункт встроенного элемента (страница службы) заменяется деревом на том же месте — адрес пункта тот же.
  const builtIn = new Map(builtInIds().map((id) => { const t = treeItem({ id }, true); return [t.href, t] as const }))
  menu = menu.map((m) => { const t = m.href ? builtIn.get(m.href) : undefined; if (!t) return m; const { native: _n, ...item } = t; return { ...item, label: m.label, icon: m.icon ?? item.icon } })

  const i = menu.findIndex((m) => m.href === at(`${ARCHITECT_HOME}/${ANCHOR}`))
  const cut = i < 0 ? menu.length : i + 1
  // 544-3 (владелец 2026-10-19: «шаблон … положи в раздел нативных элементов»): рождённый нативный элемент — в зоне «Нативные», за «Дизайном».
  const strip = ({ native: _native, ...item }: WorkspaceItem & { native: boolean }): WorkspaceItem => item
  const natives = drafts.filter((d) => d.native).map(strip)
  const customs = drafts.filter((d) => !d.native).map(strip)
  // 606 (владелец 2026-10-30: «…в левом меню ядра существует старый интерфейс не такой как у стандартов в нормальных кастомных
  // элементов»; этап 9 — «Кастомный, план подтверждаю»): root — элемент реестра, не черновик; его дерево строится тем же `treeItem`, что у
  // lagrix, первой строкой кастомной зоны, выше кнопки создания. Нет root в реестре — нет и пункта.
  const rootTree = builtInDraft('root') ? [strip(treeItem({ id: 'root' }, false))] : []
  const page = at(currentPath)
  const customZone = [...rootTree, button, ...customs]
  const withCustom = [...menu.slice(0, cut), ...natives, zone(ui.zoneCustom, 'custom', holds(customZone, page)), ...inZone(customZone, 'custom'), ...menu.slice(cut)]
  // Нет пункта «Ядро» — первой зоны нет: подпись над пустотой хуже её отсутствия.
  const c = withCustom.findIndex((m) => m.href === at(`${ARCHITECT_HOME}/${CORE}`))
  if (c < 0) return withCustom
  // Зона «Нативные» — от «Ядра» до подписи «Кастомные».
  const end = withCustom.findIndex((m) => m.zoneHead?.id === 'custom')
  // 586 (владелец 2026-10-24): Root — кастомный элемент, первой строкой кастомной зоны. С 606 он строится выше деревом; вынимать его из
  // папок меню больше не нужно: старая группа `architect/root` снята.
  const nativeZone = withCustom.slice(c + 1, end)
  const customTail = withCustom.slice(end)
  // 560-2: элементы памяти — подзона «Память» на месте первого из них; их пункты остаются первым уровнем (глубина деревьев не теряется).
  const memHref = new Map(MEMORY_GROUP.map((id, k) => [at(`${ARCHITECT_HOME}/${addressOf(id)}`), k] as const))
  const memory = nativeZone.filter((m) => m.href && memHref.has(m.href)).sort((a, b) => memHref.get(a.href!)! - memHref.get(b.href!)!)
  const first = nativeZone.findIndex((m) => m.href && memHref.has(m.href))
  const rest = nativeZone.filter((m) => !(m.href && memHref.has(m.href)))
  const memoryOpen = holds(memory, page)
  const grouped = memory.length === 0 ? inZone(nativeZone, 'native') : [
    ...inZone(rest.slice(0, first), 'native'),
    { label: ui.memoryGroup, icon: 'memory', zone: 'native', zoneHead: { id: 'memory', open: memoryOpen, item: true } },
    ...inZone(memory, 'native memory'),
    ...inZone(rest.slice(first), 'native'),
  ]
  // 582 (владелец 2026-10-24): «Паспорт отдельная вкладка – раскрывающиеся список основное – перенести туда все кроме паспорта,
  // нативных и кастомных разделов … меню по умолчанию будет закрыты». Зона «Основное» — всё от Паспорта до «Ядра» включительно;
  // список не рукописный: новый пункт верхнего уровня сам уходит в неё. Нет Паспорта — меню как было.
  const top = withCustom.slice(0, c + 1)
  const p = top.findIndex((m) => m.href === at(`${ARCHITECT_HOME}/passport`))
  const main = p < 0 ? [] : top.filter((_, k) => k !== p)
  const head = p < 0 ? top : [top[p], zone(ui.zoneMain, 'main', holds(main, page)), ...inZone(main, 'main')]
  return [...head, zone(ui.zoneNative, 'native', holds(nativeZone, page)), nativeButton, ...grouped, ...customTail]
}
