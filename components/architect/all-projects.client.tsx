"use client"

import { useEffect, useState } from "react"
import { DesktopNav, MobileMenu } from "@/components/shell/shell-menu.client"
import type { ShellGroup } from "@/components/shell/shell-types"

// ВКЛАДКИ «НАТИВНЫЕ ЭЛЕМЕНТЫ» И «КАСТОМНЫЕ ЭЛЕМЕНТЫ» В ШАПКЕ СТРАНИЦ АРХИТЕКТОРА (узел, шаги 553 и 600-3).
// Слово владельца 2026-10-26: вкладка «Все проекты» называется неверно; правильно — «Нативные элементы», и в ней все нативные;
// рядом такая же вкладка «Кастомные элементы» со всеми кастомными (root — кастомный, шаг 586).
// Вид — мега-меню оболочки (как у сайтов элементов), данные — дверь ядра `/api/node/catalog` в браузере; поле `kind` каталога
// решает, в какой вкладке элемент.
// 🔒 СОСТАВ УЗЛА НЕ ЗАПЕКАЕТСЯ В СБОРКУ ЯДРА (закон 264 «число о машине — спрашивать в браузере»): новый элемент появляется в
// списке при следующем открытии страницы, без пересборки ядра. Пока ответа нет или элементов нет — вкладок нет.

type Entry = { id: string; title: string; description: string; href: string | null; local: string | null; kind?: "custom" | "native" }

/** Одна вкладка-выпадашка из записей каталога; пустой список — вкладки нет вовсе. */
function groupOf(slug: string, label: string, list: Entry[]): ShellGroup | null {
  if (list.length === 0) return null
  return {
    slug,
    label,
    order: -1,
    childrenAsDropdown: true,
    roles: "public",
    catalog: true,
    // Своего домена у узла нет — карточка ведёт на элемент на этом компьютере.
    children: list.map((e) => ({ slug: e.id, title: e.title, href: e.href ?? e.local ?? "#", ...(e.description ? { description: e.description } : {}) })),
  }
}

export function AllProjects({ lang, nativeLabel, customLabel, menuLabel }: { lang: string; nativeLabel: string; customLabel: string; menuLabel: string }) {
  const [entries, setEntries] = useState<Entry[] | null>(null)

  useEffect(() => {
    let alive = true
    fetch(`/api/node/catalog?lang=${lang === "ru" ? "ru" : "en"}`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((b: { entries?: Entry[] } | null) => { if (alive) setEntries(Array.isArray(b?.entries) ? b.entries : []) })
      .catch(() => { if (alive) setEntries([]) })
    return () => { alive = false }
  }, [lang])

  if (!entries || entries.length === 0) return null
  // Нативные первыми — как в каталоге и в левом меню; всё, что не помечено кастомным, относится к нативным.
  const groups = [
    groupOf("native-elements", nativeLabel, entries.filter((e) => e.kind !== "custom")),
    groupOf("custom-elements", customLabel, entries.filter((e) => e.kind === "custom")),
  ].filter((g): g is ShellGroup => g !== null)
  if (groups.length === 0) return null
  return (
    <>
      <DesktopNav lang={lang} groups={groups} meUrl="/api/me" />
      <MobileMenu lang={lang} groups={groups} label={menuLabel} meUrl="/api/me" />
    </>
  )
}
