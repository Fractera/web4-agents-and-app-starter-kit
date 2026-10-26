import type { SectionRenderer } from '@/sections/contract'
import Link from 'next/link'
import { inline } from '@/lib/content/blocks/inline'

// Ссылка на полную документацию — или (291, `navigate`) на страницу-раздел.
//
// ✗ 291, слово владельца: «кнопка открыть раздел не работает как ссылка … работает на скачивание какого-то документа».
// Рубрикатор разделов слоя архитектора взял этот вид для карточек, а ссылка вида несла `download` — браузер скачивал
// страницу вместо перехода. `navigate` — переход `next/link`, стрелка «вперёд», без подписи «полная документация».
// 599-1: заголовок карточки идёт через разбор строки, как текст под ним, — в нём может стоять подсказка к слову словаря.
const BUTTON = "inline-flex w-fit shrink-0 items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground hover:bg-primary/90"

export const docref: SectionRenderer<'docref'> = (b, { key: k, ui }) => (b.navigate ? (
  <aside key={k} className="my-6 flex flex-col gap-4 rounded-2xl border border-primary/30 bg-primary/[0.05] p-6 sm:flex-row sm:items-center sm:justify-between">
    <div className="flex flex-col gap-1.5">
      {b.kicker && <p className="text-xs font-semibold uppercase tracking-widest text-primary">{b.kicker}</p>}
      <p className="text-base font-semibold text-foreground">{inline(b.title, `${k}-t`)}</p>
      <p className="text-sm leading-normal text-muted-foreground">{inline(b.summary, k)}</p>
    </div>
    <Link href={b.href} className={BUTTON}>
      {b.label}
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M5 12h14m0 0l-6-6m6 6l-6 6" /></svg>
    </Link>
  </aside>
) : (
  <aside key={k} className="my-6 flex flex-col gap-4 rounded-2xl border border-primary/30 bg-primary/[0.05] p-6 sm:flex-row sm:items-center sm:justify-between">
    <div className="flex flex-col gap-1.5">
      <p className="text-xs font-semibold uppercase tracking-widest text-primary">
        {b.kicker ?? ui.fullDocumentation}
      </p>
      <p className="text-base font-semibold text-foreground">{inline(b.title, `${k}-t`)}</p>
      <p className="text-sm leading-normal text-muted-foreground">{inline(b.summary, k)}</p>
    </div>
    <a
      href={b.href}
      download
      // 🔒 ТА ЖЕ ПАРА, ЧТО У `cta` (шаг 507). Здесь оставалось `text-foreground`
      // — цвет текста СТРАНИЦЫ на заливке `primary`: на светлой теме тёмный на
      // тёмном. В соседней кнопке это вылечили 2026-08-12, а сюда правка не
      // дошла, потому что блок `docref` не использован ни в одном материале и
      // увидеть его было негде. Дефект в неиспользуемом коде ждёт первого, кто
      // им воспользуется.
      className="inline-flex w-fit shrink-0 items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground hover:bg-primary/90"
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3v12m0 0l-4-4m4 4l4-4M5 21h14" /></svg>
      {b.label ?? ui.downloadMd}
    </a>
  </aside>
))
