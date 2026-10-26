import { CollectionPage } from '../../_lib/collection-page'
import { collectionMetadata } from '../../_lib/collection-metadata'
import { data } from './_data'
import { content } from './_components'

// РАЗДЕЛ «Быстрое хранилище» — `/{lang}/architect/cache` (560: как «Граф», 540-2).
//
// 🔒 ТОНКИЙ ВХОД: страница называет свою папку и папку-родителя, отдаёт свои слова
// и свою работающую часть. Меню, раскладка и обработка пустоты — в оболочке.
// Устройство страницы и её правила — в README рядом.
//
// 🛑 ИМЯ ПАПКИ СЛОВ `_data` — служебная папка, не маршрут.
// Первое — адрес раздела в меню, второе — служебная папка, которую обход Next не
// считает маршрутом (она начинается с подчёркивания). Поэтому импорт ниже читает
// слова ЭТОГО раздела, а не соседний раздел.
export const generateMetadata = collectionMetadata(data, '/architect')

export default async function Page({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params
  return <CollectionPage lang={lang} dir="/architect" page={data} content={content(lang)} />
}
