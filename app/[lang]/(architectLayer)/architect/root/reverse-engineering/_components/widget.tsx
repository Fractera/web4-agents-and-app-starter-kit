import type { ReactNode } from 'react'
import { appDialogUi } from '@/components/dialog/app-dialog.i18n'
import { ReverseEngineering } from '@/components/element-docs/reverse-engineering.client'
import { agentTerminalWords } from '@/app/[lang]/(architectLayer)/architect/kits/_agent-kit/core/words/agent-terminal.i18n'
import { reverseEngineeringUi } from '../../../../_i18n/reverse-engineering.i18n'
import { openAiKeyHref } from '../../_agent-kit/widgets'

// 594-6: та же страница, что «Проектирование продукта → Реверс-инжиниринг» у элементов дерева, для root — у него своя статическая папка,
// и страница дерева сюда не доходит. Терминал — агент root в проходе разбора; разборы — `study/` root. Ключ голоса — страница ядра:
// своей страницы окружения у root в ядре нет (`openAiKeyHref('root')` вёл бы на несуществующую `/architect/root/build/environment`).
export function reverseEngineeringWidget(lang: string): ReactNode {
  return (
    <ReverseEngineering
      item="root"
      lang={lang}
      words={reverseEngineeringUi(lang)}
      kit={{ terminalWords: agentTerminalWords(lang), dialogUi: appDialogUi(lang), keyHref: openAiKeyHref('build', lang) }}
    />
  )
}
