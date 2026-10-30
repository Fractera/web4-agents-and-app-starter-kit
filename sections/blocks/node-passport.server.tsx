import type { SectionRenderer } from '@/sections/contract'
import { NodePassport, type NodePassportWords } from '@/components/dashboard/node-passport.client'
import { nodeWalletUi } from '@/components/wallet/node-wallet.i18n'
import { lagrixNodeHints, lagrixRatingUi } from '@/app/[lang]/(architectLayer)/_i18n/lagrix-rating.i18n'

// «ПАСПОРТ» УЗЛА (478-1): слова берутся здесь, на сервере, и уходят островку пропсами. Слова карточки рейтинга — те же, что на
// главной A2A элемента (`lagrixRatingUi`), здесь только заголовки и подписи паспорта.
const WORDS: Record<string, Omit<NodePassportWords, 'rating' | 'nodeHints' | 'wallet'>> = {
  en: {
    nodeTitle: 'The node in Lagrix: reputation of its elements',
    nodeLead: 'A summary of the indicators of all elements of this node: every deal any of them pays through the network adds here.',
    nodeNote: 'The numbers appear when the node is connected to Lagrix.',
    elementNote: 'The numbers appear when the element is connected to Lagrix.',
    root: 'Root element',
    custom: 'Custom element',
    loading: 'Asking the node about its elements…',
    unavailable: 'The node did not answer, so the elements are not shown.',
    empty: 'The node has no elements with reputation yet.',
    noDescription: 'No description yet.',
    generate: 'Order a description',
    notBorn: 'The element is not born yet — a description can be ordered after its birth.',
    fullDescription: 'Full description',
    provides: 'What it provides',
    openElement: 'Open the element',
    off: 'Turned off:',
    powerOn: 'On',
    powerOff: 'Off',
    web4On: 'This element can receive orders from the Web4 network',
    web4Off: 'This element is not integrated into the Web4 network yet',
    show: { label: 'Show', all: 'All', on: 'In the Web4 network', off: 'Not in the network' },
    changeSettings: 'Change settings',
    mode: {
      label: 'Node mode',
      project: 'Single project',
      factory: 'App factory',
      byDefault: '(default)',
      projectText: 'One owner. Every element of the node lives under the core’s CONFIG: one header and footer, one set of languages, one wallet (the node’s), no Messenger in the elements.',
      factoryText: 'The core hosts projects of different owners. A new element of yours is born with its own settings: its own header, footer and policy pages; wallets and Messenger stay with each element.',
      both: 'In both modes the core and the built-in elements live under the core’s CONFIG.',
      chosen: 'The mode is chosen at the start of the project and changes only the elements born after the switch.',
      change: 'Change the mode on the project settings page',
    },
  },
  ru: {
    nodeTitle: 'Узел в Lagrix: репутация его элементов',
    nodeLead: 'Сводка показателей всех элементов этого узла: каждая сделка любого из них, оплаченная через сеть, добавляется сюда.',
    nodeNote: 'Показатели появятся, когда узел подключится к Lagrix.',
    elementNote: 'Показатели появятся, когда элемент подключится к Lagrix.',
    root: 'Корневой элемент',
    custom: 'Свой элемент',
    loading: 'Спрашиваю узел о его элементах…',
    unavailable: 'Узел не ответил, поэтому элементы не показаны.',
    empty: 'В узле пока нет элементов с репутацией.',
    noDescription: 'Описания пока нет.',
    generate: 'Заказать описание',
    notBorn: 'Элемент ещё не рождён — описание можно заказать после рождения.',
    fullDescription: 'Полное описание',
    provides: 'Что он даёт',
    openElement: 'Открыть элемент',
    off: 'Выключен:',
    powerOn: 'Включён',
    powerOff: 'Выключен',
    web4On: 'Этот элемент может получать заявки из сети Web4',
    web4Off: 'Этот элемент ещё не интегрирован в сеть Web4',
    show: { label: 'Показать', all: 'Все', on: 'В сети Web4', off: 'Не в сети' },
    changeSettings: 'Изменить настройки',
    mode: {
      label: 'Режим узла',
      project: 'Единый проект',
      factory: 'Завод приложений',
      byDefault: '(по умолчанию)',
      projectText: 'Один хозяин. Все элементы узла живут по CONFIG ядра: одна шапка и один подвал, одни языки, один кошелёк (кошелёк узла), у элементов нет Messenger.',
      factoryText: 'Ядро — хостинг для проектов разных хозяев. Новый свой элемент рождается со своими настройками: своя шапка, подвал и страницы политик; кошельки и Messenger — у каждого элемента свои.',
      both: 'В обоих режимах ядро и встроенные элементы живут по CONFIG ядра.',
      chosen: 'Режим выбирают в начале проекта; смена касается только элементов, рождённых после неё.',
      change: 'Сменить режим — на странице настроек проекта',
    },
  },
}

export const nodePassport: SectionRenderer<'nodePassport'> = (b, { key: k }) => (
  <NodePassport key={k} lang={b.lang} words={{ ...(WORDS[b.lang] ?? WORDS.en), rating: lagrixRatingUi(b.lang), wallet: nodeWalletUi(b.lang), nodeHints: lagrixNodeHints(b.lang) }} />
)
