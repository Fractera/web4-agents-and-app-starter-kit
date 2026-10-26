import type { Block } from '@/lib/content/blocks/types'
import { servicePortWords } from '@/components/services/service-port.i18n'

// СОДЕРЖИМОЕ СТРАНИЦЫ «Глубокая память» (596-6) — как у «Быстрого хранилища»: где элемент живёт (порт на машине, адрес в интернете).
// Элемент приходит выключенным по своему паспорту (567): причину называет плашка страниц элемента, процесса нет, пока главный агент не
// включит его на задачу памяти.
// 🛑 Слова отсюда не пишутся — они приходят из `_data`.
export function content(lang: string): Block[] {
  return [{ kind: 'servicePort', serviceId: 'memory', words: servicePortWords(lang, 'memory') }]
}
