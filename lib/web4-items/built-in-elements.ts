import "server-only"
import { existsSync } from "node:fs"
import { join } from "node:path"
import { listServices } from "@/lib/microservices/registry"
import { isNativeElement } from "@/lib/a2a/element-passport"
import type { Web4Draft } from "@/lib/web4-items/drafts"

// ВСТРОЕННЫЕ ЭЛЕМЕНТЫ В ДЕРЕВЕ ЭЛЕМЕНТА (узел, шаг 557).
//
// 🎯 Владелец 2026-10-21 (четвёртый раз за день): «в левом меню опять вижу абсолютно тот же самый интерфейс который вообще не
// соответствует эталонному нативного шаблону нём это выпадающих списков нету строительства в нём нету документов разработки». Дерево
// элемента (`lib/web4-items/item-tree.ts`) ядро рисовало только черновикам — рождённым элементам; встроенные (auth, data, storage,
// vectors, graph, config, design, blocks) показывались прежними страницами служб. Теперь у встроенного элемента то же дерево, что у
// рождённого нативного: «запись элемента» без черновика (`builtInDraft`), пункт меню заменяется деревом на том же месте, страницы,
// которые у службы уже есть (Живой сайт, Терминал, Подписка, Telegram), остаются по прежним адресам (`BUILT_IN_STATIC`), остальные
// страницы дерева открывает `architect/<id>/[...page]` — та же страница элемента ядра.
// 🔒 Встроенный элемент — ядро узла: удаление и смена адреса для него закрыты (двери — только рождённым, `isBornElement`).

/** Страница дерева → прежняя страница папки службы (путь под `architect/<id>`). */
export const BUILT_IN_STATIC: Record<string, string> = {
  "build/terminal": "terminal",
  "build/subscription": "claude-code",
  "build/telegram": "telegram",
}

/** 558: элементы памяти — у них раздел «Резервное копирование» (`memory` в дереве). Ид встроенных неизменны (557). */
export const MEMORY_ELEMENTS: readonly string[] = ["data", "storage", "vectors", "graph"]

/** 560-2 (владелец 2026-10-21: «раздел память раскрывающийся внутри которого было бы пять этих элементов»): группа «Память» левого
 *  меню, в этом порядке. Резервное копирование — по-прежнему `MEMORY_ELEMENTS`: быстрое хранилище — буфер, правда в data.
 *  596-6: шестой — глубокая память `memory` (fractera-memory-starter): своих хранилищ у неё нет, она пишет в четыре первых, поэтому
 *  и в резервное копирование не входит. */
export const MEMORY_GROUP: readonly string[] = ["data", "storage", "vectors", "graph", "cache", "memory"]

/** 559: элемент входа — у него раздел «Пользователи» (`auth` в дереве), все люди узла. */
export const AUTH_ELEMENT = "auth"

const SERVICE_DIR = (id: string) => join(process.cwd(), "app", "[lang]", "(architectLayer)", "architect", id)

/** Встроенные элементы: в реестре, не рождённые, не сайт root, на нативном шаблоне, у ядра есть их папка страниц. */
export function builtInIds(): string[] {
  return listServices()
    .filter((s) => !(s as { born?: unknown }).born && s.id !== "root" && isNativeElement(s.id) && existsSync(SERVICE_DIR(s.id)))
    .map((s) => s.id)
}

/** Запись элемента для страницы дерева — у встроенного черновика нет. */
export function builtInDraft(id: string): Web4Draft | null {
  // 606: root — кастомный элемент реестра без черновика: то же дерево, что у lagrix, и общий маршрут architect/[item]; своей группы
  // `architect/root` у него больше нет, агента обслуживает общая копия комплекта (606-1).
  if (id === "root" && listServices().some((s) => s.id === "root")) return { id, createdAt: "" } as Web4Draft
  return builtInIds().includes(id) ? ({ id, createdAt: "" } as Web4Draft) : null
}
