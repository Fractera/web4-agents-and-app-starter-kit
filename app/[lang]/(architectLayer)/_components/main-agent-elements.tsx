import Link from 'next/link'
import { listDrafts } from '@/lib/web4-items/drafts'
import { builtInDraft } from '@/lib/web4-items/built-in-elements'
import { addressOf } from '@/lib/web4-items/element-address'
import { getService } from '@/lib/microservices/registry'
import { findTreePath, treeVisible } from '@/lib/web4-items/item-tree'
import { treeContextOf } from '@/lib/web4-items/tree-context'
import { H2 } from '@/components/ui/typography'
import { ARCHITECT_HOME } from '../_lib/architect-menu'
import { mainAgentUi } from '../_i18n/main-agent.i18n'

// ЭТА ЖЕ СТРАНИЦА У ЭЛЕМЕНТОВ (528-3). Владелец 2026-10-18: «у проекта есть ядро, оно сейчас у нас находится на вкладке главный
// агент … задача главного агента аккумулировать внутри себя как минимум один элемент руут, как максимум все какие будут кастомные
// элементы … ты сделаешь такую же точно схему как я тебе описал для элемента … тут мы будем делать глобальные аккумулирующие
// настройки». Сводных данных пока нет (не входит в 528) — страница ядра ведёт к той же странице у каждого элемента.
//
// 🔒 СПИСОК — ИЗ ДАННЫХ УЗЛА, А НЕ РУКОЙ: кастомные элементы — те же, что в левом меню (`listDrafts`); страница элемента — из его
// дерева (`item-tree.ts`) с теми же флагами паспорта, что у меню. 606: у root то же дерево кастомного элемента — он первая строка списка,
// как в левом меню (прежде здесь стояло «root работает на прежнем шаблоне: такой страницы у него пока нет»).

export function MainAgentElements({ lang, path }: { lang: string; path: string }) {
  const ui = mainAgentUi(lang)
  const trail = findTreePath(path.split('/'))
  const rows = [...(builtInDraft('root') ? [{ id: 'root' }] : []), ...listDrafts()].map((d) => {
    const slug = addressOf(d.id)
    const ctx = treeContextOf(d.id)
    const visible = !!trail && trail.every((t) => treeVisible(t, ctx))
    const note = !getService(d.id) ? ui.draft : visible ? null : ui.off
    return { slug, href: visible ? `/${lang}${ARCHITECT_HOME}/${slug}/${path}` : null, note }
  })

  return (
    <section className="mb-6 flex max-w-3xl flex-col gap-3" data-main-agent-elements={path}>
      <div className="flex flex-col gap-1">
        <H2 variant="ui">{ui.elementsTitle}</H2>
        <p className="text-sm text-muted-foreground">{ui.elementsLead}</p>
      </div>
      <ul className="grid gap-2 sm:grid-cols-2">
        {rows.map((r) => (
          <li key={r.slug} className="flex flex-col gap-1 rounded-lg border border-border p-3" data-main-agent-element={r.slug}>
            {r.href
              ? <Link href={r.href} className="w-fit font-medium text-foreground underline-offset-4 hover:underline">{r.slug}</Link>
              : <span className="font-medium text-foreground">{r.slug}</span>}
            <span className="text-[length:var(--fs-small)] text-muted-foreground">{r.note ?? `${ui.open}: /${r.slug}/${path}`}</span>
          </li>
        ))}
      </ul>
      {rows.length === 0 && <p className="text-sm text-muted-foreground">{ui.none}</p>}
    </section>
  )
}
