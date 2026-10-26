import type { SectionRenderer } from '@/sections/contract'
import { inline } from '@/lib/content/blocks/inline'
import { termPlain } from '@/lib/content/blocks/term'
import { tableUi } from '@/sections/table.i18n'
import { TableTools } from '@/components/table/table-tools.client'

// Таблица — полным набором: поиск сверху, тело, страницы снизу (262). Панели и их слова — в островке
// `components/table/table-tools.client.tsx`; здесь сервер рисует шапку и строки, островок их только
// отбирает и листает. Рендерер остаётся серверным, как весь `sections/`.

/** Текст ячейки без разметки: `**жирный**`, `[подпись](адрес)` и подсказка к слову (599-1) → слова, по которым ищут. */
function plain(s: string): string {
  return termPlain(s).replace(/\[([^\]]*)\]\([^)]*\)/g, '$1').replace(/\*\*/g, '').replace(/`/g, '')
}

export const table: SectionRenderer<'table'> = (b, { key: k, lang }) => {
  const lastCol = b.headers.length - 1

  const head = (
    <tr className="border-b border-border">
      {b.headers.map((h, ci) => (
        <th
          key={ci}
          scope="col"
          className={`px-4 py-3 align-bottom font-semibold ${ci === lastCol ? 'bg-primary/10 text-foreground' : 'text-foreground'}`}
        >
          {inline(h, `${k}-h${ci}`)}
        </th>
      ))}
    </tr>
  )

  const rows = b.rows.map((row, ri) => (
    <tr key={ri} className="border-b border-border last:border-0">
      {row.map((cell, ci) => (
        <td
          key={ci}
          className={`px-4 py-3 align-top leading-relaxed ${
            ci === 0
              ? 'font-medium text-foreground'
              : ci === lastCol
                ? 'bg-primary/5 text-foreground'
                : 'text-muted-foreground'
          }`}
        >
          {inline(cell, `${k}-r${ri}c${ci}`)}
        </td>
      ))}
    </tr>
  ))

  return (
    <TableTools
      key={k}
      caption={b.caption ? inline(b.caption, `${k}-cap`) : undefined}
      columns={b.headers.length}
      head={head}
      rows={rows}
      texts={b.rows.map(row => row.map(plain).join(' '))}
      words={tableUi(lang)}
    />
  )
}
