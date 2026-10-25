import { CollectionPage } from '../../../_lib/collection-page'
import { collectionMetadata } from '../../../_lib/collection-metadata'
import { data } from './_data'
import { content, widget } from './_components'

// РАЗДЕЛ «Реверс-инжиниринг» root — `/{lang}/architect/root/reverse-engineering` (шаг 594-6).
//
// 🔒 ТОНКИЙ ВХОД: страница называет свою папку и папку-родителя, отдаёт свои слова и свою работающую часть. Устройство — в README рядом.
export const generateMetadata = collectionMetadata(data, '/architect/root')

export default async function Page({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params
  return <CollectionPage lang={lang} dir="/architect/root" page={data} content={content(lang)} widget={widget(lang)} />
}
