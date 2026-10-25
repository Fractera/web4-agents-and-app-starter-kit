import { existsSync } from 'node:fs'
import { join } from 'node:path'
import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { ArchitectPage } from '../../../_lib/architect-page'
import { ARCHITECT_HOME } from '../../../_lib/architect-menu'
import { web4DraftsUi } from '../../../_i18n/web4-drafts.i18n'
import { DraftCards } from '../../../_components/draft-cards'
import { DeleteDraftButton } from '../../../_components/delete-draft-button.client'
import { appDialogUi } from '@/components/dialog/app-dialog.i18n'
import { draftAddress, getDraft } from '@/lib/web4-items/drafts'
import { findTreePath, movedPage, MOVED_WITH, treeLang, treeVisible, type TreePage } from '@/lib/web4-items/item-tree'
import { AccordionSection } from '@/components/accordion/accordion-section.client'
import { getService, listServices, serviceUrl } from '@/lib/microservices/registry'
import { builtInDraft, builtInIds } from '@/lib/web4-items/built-in-elements'
import { BirthButton } from '../../../_components/birth-button.client'
import nodeType from '@/lib/web4-items/node-type.cjs'
import { birthState } from '@/lib/web4-items/birth'
import { ServicePort } from '@/components/services/service-port.client'
import { servicePortWords } from '@/components/services/service-port.i18n'
import { ElementGithub } from '../../../_components/element-github.client'
import { elementGithubUi } from '../../../_i18n/element-github.i18n'
import { elementDeploymentsUi } from '../../../_i18n/element-deployments.i18n'
import { elementDeployUi, rejectTaskUi } from '../../../_i18n/element-deploy.i18n'
import { ElementDeploy } from '../../../_components/element-deploy.client'
import { ElementRollback } from '../../../_components/element-rollback.client'
import { elementCodeState } from '@/lib/web4-items/element-code-state'
import { elementDir } from '@/lib/web4-items/element-github'
import { elementVersions } from '@/lib/web4-items/element-versions'
import type { Block } from '@/lib/content/blocks/types'
import { ElementDangerZone } from '../../../_components/element-danger-zone'
import { ElementPower } from '../../../_components/element-power.client'
import power from '@/lib/web4-items/element-power.cjs'
import { DeleteElementButton } from '../../../_components/delete-element-button.client'
import { elementSettingsUi } from '../../../_i18n/element-settings.i18n'
import { ElementDescribe } from '../../../_components/element-describe.client'
import { ElementAddress } from '../../../_components/element-address.client'
import { ElementDomain } from '../../../_components/element-domain.client'
import { domainRecord } from '@/lib/web4-items/element-domain'
import { primaryDomain } from '@/lib/domain/node-domains'
import { ElementOwnDomainSignIn } from '../../../_components/element-own-domain-signin'
import { readStaticCopy } from '@/lib/web4-items/static-copy-state'
import { readLinks } from '@/lib/web4-items/element-links'
import { ElementLink } from '../../../_components/element-link.client'
import { ElementSiteSettings } from '../../../_components/element-site-settings'
import { ElementWeb4 } from '../../../_components/element-web4.client'
import { addressOf, idOfAddress } from '@/lib/web4-items/element-address'
import { registryDescription, TASK as DESCRIBE_TASK } from '@/lib/web4-items/element-describe'
import { terminalLink } from '@/app/[lang]/(architectLayer)/architect/kits/_agent-kit/core/client/terminal-paste.mjs'
import { ScheduleTask } from '@/app/[lang]/(architectLayer)/_components/schedule-task.client'
import { backupCronUi, backupTaskWords } from '@/app/[lang]/(architectLayer)/_components/schedule-task.i18n'
import { NodeUsers } from '@/components/node-users/node-users.client'
import { nodeUsersUi } from '@/components/node-users/node-users.i18n'
import { agentKitWidget, openAiKeyHref, type AgentKitPage } from '../_agent-kit/widgets'
import { ElementPreview } from '@/components/preview/element-preview.client'
import { elementPreviewWords, previewTaskKit } from '@/sections/blocks/element-preview.server'
import { EnvironmentPanel } from '@/components/environment/environment-panel'
import { ElementPassport, type NodeElementRow, type PassportView } from '../../../_components/element-passport'
import { nodeEntries } from '@/lib/a2a/node-registry'
import { elementPassportUi } from '../../../_i18n/element-passport.i18n'
import { elementPassport, isNativeElement } from '@/lib/a2a/element-passport'
import { effectiveMessengers, treeContextOf } from '@/lib/web4-items/tree-context'
import { listOrders } from '@/lib/web4-items/element-orders'
import { elementDashboardUi } from '../../../_i18n/element-dashboard.i18n'
import { hasDoc } from '@/lib/web4-items/element-docs'
import { ElementDocIsland } from '@/components/element-docs/element-doc.client'
import { PassportDoor } from '@/components/element-docs/passport-door.client'
import { elementDocsUi, elementOrdersUi, passportDoorUi } from '../../../_i18n/element-docs.i18n'
import { ElementOrdersIsland } from '@/components/element-docs/element-orders.client'
import { LagrixRating } from '@/components/element-docs/lagrix-rating'
import { lagrixRatingUi } from '../../../_i18n/lagrix-rating.i18n'
import { ElementMessengerSettings } from '../../../_components/element-messenger-settings.client'
import { messengerSettingsUi } from '../../../_i18n/element-messenger-settings.i18n'
import { PaymentElements } from '../../../_components/payment-elements.client'
import { PaymentSelf } from '../../../_components/payment-self'
import { paymentElementsUi } from '../../../_i18n/payment-elements.i18n'
import { paymentOf } from '@/lib/web4-items/payment-elements'
import { tableUi } from '@/sections/table.i18n'
import { paymentsUi } from '@/components/payments/payments.i18n'
import { NodeWalletCard } from '@/components/wallet/node-wallet.client'
import { nodeWalletUi } from '@/components/wallet/node-wallet.i18n'
import { ElementHome } from '../../../_components/element-home.client'
import { ElementDiscoveryAlarm } from '../../../_components/element-discovery-alarm'
import { elementHomeUi } from '../../../_i18n/element-home.i18n'
import { ProductQuizIsland } from '@/components/element-docs/product-quiz.client'
import { productQuizUi, quizTaskUi } from '../../../_i18n/product-quiz.i18n'
import { ReverseEngineering } from '@/components/element-docs/reverse-engineering.client'
import { CapabilityCards } from '../../../_components/capability-cards.client'
import { capabilityCardUi } from '../../../_i18n/capability-card.i18n'
import { reverseEngineeringUi } from '../../../_i18n/reverse-engineering.i18n'
import { agentTerminalWords } from '@/app/[lang]/(architectLayer)/architect/kits/_agent-kit/core/words/agent-terminal.i18n'

// ОДНА СТРАНИЦА НА ВСЕ АДРЕСА ВСЕХ ЧЕРНОВИКОВ (314-1): `/architect/<id>`, `/architect/<id>/<раздел>`,
// `/architect/<id>/<раздел>/<страница>`. Дерево — `lib/web4-items/item-tree.ts`, черновики — `data/web4-drafts.json`.
//
// 🔒 НИ ОДНОГО НОВОГО ФАЙЛА НА НОВЫЙ ЧЕРНОВИК: адреса отдаются по первому запросу и кэшируются как весь слой (ISR); создание и
// удаление перерисовывают слой дверью. Поэтому группа появляется и исчезает без пересборки.
// 🔒 ПАПКА С ТОЧНЫМ ИМЕНЕМ ВАЖНЕЕ ЭТОЙ (правило Next): `architect/root`, `architect/blocks` и остальные разделы сюда не попадают.
// Черновика нет — 404, а не пустая группа с чужим именем.
// 🔒 В ПОИСК НЕ ИДЁТ: черновик — рабочее место, а не страница продукта.

type Params = { lang: string; item: string; page?: string[] }

// 417: поручение кнопки «Сгенерировать описание» — агент элемента пишет тексты паспорта по своему навыку.
// Владелец 2026-10-06: поручение — на языке человека и его словами («сейчас ты будешь создавать описание для паспорта, используя
// текстовый ввод пользователя; ты должен вызвать для этого навык …»); английское он стёр, не поняв, и агент построил работу вместо
// описания. Текст кончается новой строкой: курсор встаёт под поручением, надиктованное дописывается ниже.
// 590-5: тексты паспорта — работа прохода текстов (humanizer живёт только там): поручение открывается его словом, мост рождает сессию
// этого прохода; живая сессия другого прохода, получив поручение вставкой, переключается сама (`npm run pass`).
const PASSPORT_TASK: Record<'en' | 'ru', string> = {
  en: "Build process, texts: now you write the description for the passport using the user's text below. Call the skill passport-description for this: only the passport texts, build nothing; show them to me before saving.\nUser's text:\n",
  ru: "Build process, texts: сейчас ты будешь создавать описание для паспорта, используя текстовый ввод пользователя ниже. Ты должен вызвать для этого навык passport-description: только тексты паспорта, ничего не строй; покажи их мне до сохранения.\nТекст пользователя:\n",
}

// 326-3: страница дерева → вид острова комплекта агента (имя шаблона комплекта). 472: Telegram-бот — и в H2A (у элементов с флагом
// H2A), и в «Строительстве» (у остальных). 528-1: ключ — полный путь страницы под элементом.
const AGENT_PAGES: Record<string, AgentKitPage | undefined> = {
  'build/subscription': 'claude-code', 'build/terminal': 'terminal', 'build/telegram': 'telegram', 'messenger/h2a/telegram': 'telegram',
  // 552-4б: сессия рабочего процесса — свой терминал в «Рабочем процессе».
  'workflow/terminal': 'terminal-work',
}

// 552-6 (владелец 2026-10-20: «поднимем четыре телеграмма … такой же подключение телеграмма но подставим эти названия»): ещё три бота
// элемента — то же окно с ячейкой; только у элемента с группами навыков, у остальных страница остаётся текстом «ещё решается».
const SLOT_PAGES: Record<string, 'h2h' | 'orders' | 'work' | undefined> = {
  'messenger/h2h/telegram': 'h2h', 'workflow/a2a-orders/telegram': 'orders', 'workflow/a2a-work/telegram': 'work',
}
const hasSkillGroups = (id: string) => {
  const dir = elementDir(id)
  return Boolean(dir && existsSync(join(dir, '.claude', 'skills', 'build-skills', '.claude-plugin', 'plugin.json')))
}

const SUBSCRIPTIONS = 'workflow/process/subscriptions'
// 558: подписки элемента памяти — те же, но в разделе «Резервное копирование → Инструменты».
const BACKUP_TOOLS = 'backup/tools'
const SUBSCRIPTION_LISTS = [SUBSCRIPTIONS, BACKUP_TOOLS]

// 325-3: сегмент пути — адрес элемента в ядре или его id (id неизменен; адрес — слой над ним, `lib/web4-items/element-address.ts`).
function resolve(p: Params) {
  const id = idOfAddress(p.item)
  // 557: у встроенного элемента черновика нет — его запись даёт `builtInDraft` (то же дерево, что у рождённого нативного).
  const draft = id ? getDraft(id) ?? builtInDraft(id) : null
  if (!draft) return null
  const path = p.page ?? []
  if (path.length === 0) return { draft, trail: [] as TreePage[], service: undefined }
  // 463 (владелец 2026-10-12: «…создавать отдельные страницы а не валить в одну кучу»): у каждого внешнего сервиса элемента
  // своя страница `workflow/process/subscriptions/<id>` (528-1); id — из его OWN-SERVICE-PROPS/SUBSCRIPTIONS.json, чужой id — 404.
  const list = SUBSCRIPTION_LISTS.find((l) => path.length === l.split('/').length + 1 && path.slice(0, -1).join('/') === l)
  if (list) {
    const known = elementPassport(draft.id)?.subscriptions?.services.some((s) => s.id === path[path.length - 1])
    const trail = findTreePath(path.slice(0, -1))
    return known && trail ? { draft, trail, service: path[path.length - 1] } : null
  }
  const trail = findTreePath(path)
  if (!trail) return null
  // 412-2: страница документа есть, только пока есть его файл в папке элемента.
  const doc = trail[trail.length - 1].doc
  if (doc && !hasDoc(draft.id, doc)) return null
  // 472: разделы и страницы по флагам паспорта (H2A · H2H · A2A) — тот же ответ, что в левом меню; 528-1 — по всей цепочке.
  const ctx = treeContextOf(draft.id)
  if (!trail.every((t) => treeVisible(t, ctx))) return null
  return { draft, trail, service: undefined }
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const p = await params
  const r = resolve(p)
  const l = treeLang(p.lang)
  const words = r?.trail.length ? r.trail[r.trail.length - 1].words[l] : null
  return {
    title: words ? `${words.title} — ${p.item}` : p.item,
    description: words?.lead,
    robots: { index: false, follow: false },
  }
}

export default async function Page({ params }: { params: Promise<Params> }) {
  const p = await params
  // 451-2, 528-1: прежние адреса (i2i, f2f, H2H, H2A, A2A, Процесс, Документы, Проектирование) ведут на новые.
  const moved = movedPage(p.page ?? [])
  if (moved) redirect(`/${p.lang}${ARCHITECT_HOME}/${p.item}/${moved}`)
  // 472: у элемента с H2A Telegram-бот живёт в H2A — старый адрес «Строительства» ведёт туда.
  const movedWith = MOVED_WITH[(p.page ?? []).join('/')]
  const movedId = movedWith ? idOfAddress(p.item) : null
  if (movedWith && movedId && effectiveMessengers(movedId)[movedWith.when]) redirect(`/${p.lang}${ARCHITECT_HOME}/${p.item}/${movedWith.to}`)
  const r = resolve(p)
  if (!r) notFound()

  const { lang } = p
  const item = r.draft.id
  // 325-3: у элемента свой адрес — прежний путь по id (и любой, кроме текущего) переадресует на него с той же страницей.
  const slug = addressOf(item)
  if (p.item !== slug) redirect(`/${lang}${ARCHITECT_HOME}/${[slug, ...(p.page ?? [])].join('/')}`)
  const l = treeLang(lang)
  const ui = web4DraftsUi(lang)
  const address = draftAddress(item)
  const dir = `${ARCHITECT_HOME}/${slug}`

  // 319-3: РОДИВШИЙСЯ ЭЛЕМЕНТ — тот, что уже в реестре узла. У него значок «Элемент», настоящий порт в карточке и нет кнопки
  // «Удалить»: она сняла бы только запись черновика, а работающий элемент остался бы без страницы (дверь тоже отвечает 409).
  const entry = getService(item)
  // 582: черновик кнопки «Создать нативный элемент» (`native: true` в файле черновиков).
  const nativeDraft = getDraft(item)?.native === true
  // Рождение дошло до реестра и упало позже (сборка, память): элемент записан, но его процесса нет — карточка порта не
  // утверждает, что он отвечает, а под карточками стоит отказ с подсказкой повторить установку.
  const birth = birthState(item).state
  const brokenBirth = !!entry && (birth === 'failed' || birth === 'running')
  const port = entry && !brokenBirth && typeof entry.port === 'number' ? entry.port : null
  const bar = (
    <div className="mb-4 flex items-center justify-between gap-3">
      <span className="rounded-md border border-border px-2 py-0.5 text-[length:var(--fs-small)] text-muted-foreground" data-item-badge={entry ? 'element' : 'draft'}>
        {entry ? ui.elementBadge : ui.draftBadge}
      </span>
      {!entry && <DeleteDraftButton lang={lang} id={item} address={address} ui={ui} dialogUi={appDialogUi(lang)} />}
    </div>
  )

  // Главная группы — две карточки, как у корня; у черновика под ними — «Родить элемент».
  if (r.trail.length === 0) {
    return (
      <ArchitectPage
        lang={lang}
        path={dir}
        title={address}
        pageTitle={address}
        widget={<>
          {/* 338: вводный текст под заголовком — только пока черновик не рождается и не родился (слово владельца 2026-09-29). */}
          {/* 582: у черновика нативного элемента — пометка владельца о назначении нативных («могут быть использованы любым
              кастомными элементом … вы можете создать контент завод, email маркетинг и другие»). */}
          {!entry && birth !== 'running' && (
            <div className="mb-6 max-w-3xl space-y-3 text-muted-foreground" data-draft-intro={nativeDraft ? 'native' : 'custom'}>
              {(nativeDraft ? ui.nativeDraftIntro : ui.draftIntro).split('\n\n').map((t) => <p key={t}>{t}</p>)}
            </div>
          )}
          {bar}
          {/* 319-4: родившийся и работающий элемент получает ТОТ ЖЕ блок, что root и службы, — порт по факту и «Адрес в
              интернете» с кнопкой подключения поддомена (289). Черновик и упавшее рождение — свои карточки. */}
          {port !== null
            ? <ServicePort serviceId={item} words={servicePortWords(lang, item)} />
            : <DraftCards address={address} ui={ui} port={port} />}
          {/* 495-5 (владелец 2026-10-15): «this statisk must exist in … /ru/roman (item root)» — та же карточка репутации Lagrix,
              что на главной A2A, на главной родившегося элемента. */}
          {/* 544-3: у нативного элемента карточки Lagrix нет — он не продаётся и не связан с сетью. */}
          {/* 551-2 (владелец 2026-10-20): рядом с репутацией — «Кошелёк» элемента и тревога, пока элемент не описан в ядре или без
              визитки A2A; образец выдуманных отзывов 517 снят («Везде»). */}
          {entry && !isNativeElement(item) && (() => {
            const described = registryDescription(item) !== null
            const card = elementPassport(item)?.published != null
            const hu = elementHomeUi(lang)
            const alarm = described && card
              ? null
              : <ElementDiscoveryAlarm ui={hu} described={described} card={card} orderHref={terminalLink({ lang, service: `${slug}/build`, text: DESCRIBE_TASK })} />
            return <ElementHome id={item} rating={lagrixRatingUi(lang)} wallet={nodeWalletUi(lang)} alarm={alarm} alarmMark={hu.alarmMark} />
          })()}
          {(!entry || brokenBirth) && <BirthButton id={item} ui={ui} dialogUi={appDialogUi(lang)} born={!!entry} suggested={nodeType.birthLook({ native: false }, process.cwd()) as "project" | "own"} nodeType={nodeType.readNodeType(process.cwd()) as "project" | "factory"} native={nativeDraft} />}
        </>}
      />
    )
  }

  // 528-1: страница дерева — последнее звено цепочки «раздел → подраздел → страница»; привязки ниже — по её полному пути `key`.
  const node = r.trail[r.trail.length - 1]
  const key = r.trail.map((t) => t.slug).join('/')
  const words = node.words[l]
  // 577-11: «Блоки» — только переадресация на страницу блоков самого элемента (владелец: «мы не строим внутри страницы архитектора блоки»).
  if (key === 'build/blocks') redirect(`${domainRecord(item)?.url ?? `https://${address}`}/${lang}/admin/blocks`)
  // 579-4: «Дизайн» и «Настройки сайта» — тем же путём, на страницы самого элемента (его мастерская и настройки, шаги 579-1, 579-2).
  if (key === 'build/design') redirect(`${domainRecord(item)?.url ?? `https://${address}`}/${lang}/admin/design`)
  if (key === 'build/site-settings') redirect(`${domainRecord(item)?.url ?? `https://${address}`}/${lang}/admin/site-settings`)
  const nodePath = `${dir}/${key}`
  const path = r.service ? `${nodePath}/${r.service}` : nodePath

  // Страница с детьми (раздел или подраздел) перечисляет их и справа — вместе с левым меню (320, 528-1).
  const pageCard = (sp: TreePage) => (
    <li key={sp.slug}>
      <Link
        href={`/${lang}${nodePath}/${sp.slug}`}
        className="flex flex-col gap-1 rounded-lg border border-border p-3 transition-colors hover:bg-muted/60"
      >
        <span className="font-medium text-foreground">{sp.words[l].title}</span>
        <span className="text-[length:var(--fs-small)] text-muted-foreground">{sp.words[l].lead}</span>
      </Link>
    </li>
  )
  const treeCtx = treeContextOf(item)
  const shown = (node.pages ?? []).filter((sp) => treeVisible(sp, treeCtx) && (!sp.doc || hasDoc(item, sp.doc)))
  const list = !r.service && shown.length > 0 ? (
    <nav aria-label={ui.sectionPages} className="flex flex-col gap-2">
      <p className="text-[length:var(--fs-small)] font-medium text-muted-foreground">{ui.sectionPages}</p>
      <ul className="grid gap-2 sm:grid-cols-2">{shown.map(pageCard)}</ul>
    </nav>
  ) : null
  // 435-2/3: абзацы под заголовком. 528-1 (владелец 2026-10-18: «описание длинной ленты не показывать скрывать их в аккордеона») —
  // свёрнуты в общий аккордеон продукта (shadcn), под ним список страниц.
  const slot = SLOT_PAGES[key] && entry && hasSkillGroups(item) ? SLOT_PAGES[key] : undefined
  // 573-4: у платёжного элемента («Платежи» нативного Stripe) — свои абзацы раздела, без Web3 и сети Lagrix.
  const aboutText = r.service || slot ? undefined : (treeCtx.payment && node.aboutPayment ? node.aboutPayment[l] : node.about?.[l])
  const about = aboutText?.length ? (
    <div className="mb-4 max-w-3xl" data-tree-about>
      <AccordionSection
        panels={[{
          id: 'about',
          summary: ui.aboutSummary,
          content: <div className="flex flex-col gap-3 text-sm leading-relaxed">{aboutText.map((t) => <p key={t.slice(0, 40)}>{t}</p>)}</div>,
        }]}
      />
    </div>
  ) : null

  // 319-2: РОДИВШИЙСЯ элемент (он уже в реестре узла) показывает в Preview свой сайт — тот же просмотр, что у служб, с
  // подсветкой и «Найти блок». Черновик, ещё не родившийся, — только заголовок раздела: показывать нечего.
  const preview = key === 'preview' && serviceUrl(item)
    // Терминал рождённого элемента — под `build/` (как у «Описания» ниже); путь служб ядра вёл на ошибку (замерено 356-3).
    // 576-2: выключенный элемент показывает копию из Cloudflare, строка ведёт в его «Опасную зону» (адрес — как у плашки 567 ниже).
    ? <ElementPreview serviceId={item} terminalService={`${slug}/build`} devHref={`/${lang}/${slug}/build/deployments`} offHref={`/${lang}${dir}/settings/danger-zone`} lang={lang} words={elementPreviewWords(lang)} task={previewTaskKit(item, lang)} />
    : null

  // 326-3: «Подписка Claude Code», «Терминал», «Telegram бот» — острова ОБЩЕЙ копии комплекта агента (`../_agent-kit`, 326-1);
  // Claude Code живёт в папке элемента `WEB4-ITEMS/user/<id>`. У черновика — объяснение.
  // 472: Telegram-бот — и в H2A (у элементов с флагом H2A), и в «Строительстве» (у остальных).
  const kitPage = AGENT_PAGES[key]
  const agent = slot ? agentKitWidget('telegram', item, lang, slot) : kitPage
    ? (entry ? agentKitWidget(kitPage, item, lang) : <p className="my-4 text-sm text-muted-foreground">{elementSettingsUi(lang).agentNotBorn}</p>)
    : null

  // 319-5: страница GitHub — связь элемента с репозиторием владельца и выгрузка кнопкой; у нерождённого — объяснение.
  const github = key === 'build/github'
    ? (entry
      ? <ElementGithub id={item} lang={lang} ui={elementGithubUi(lang)} />
      : <p className="my-4 text-sm text-muted-foreground">{elementGithubUi(lang).notBorn}</p>)
    : null

  // 336-1: «Переменные окружения» элемента — имена и пояснения из его `.env.example`, ключ OpenAI с проверкой; у черновика — объяснение.
  const environment = key === 'build/environment'
    ? (entry ? <EnvironmentPanel target={item} lang={lang} /> : <p className="my-4 text-sm text-muted-foreground">{elementSettingsUi(lang).notBorn}</p>)
    : null

  // 321: «Развёртывания» — версии элемента стандартной таблицей каталога (`table`: поиск сверху, страницы снизу, 262).
  const isDeployments = key === 'build/deployments'
  const versions = isDeployments && entry ? elementVersions(item) : null
  const dui = elementDeploymentsUi(lang)
  // 472-2: дашборд H2A · H2H · A2A. У «A2A: ваша работа» собеседники и сделки — из сделок элемента (`listOrders`, тот же источник,
  // что её «Сделки»); у H2A, H2H и «A2A: ваши заказы» источника пока нет — нули и честная строка. Данные — при открытии, без таймеров.
  const dashboardBlocks: Block[] = node.slug === 'dashboard'
    ? (() => {
        const dw = elementDashboardUi(lang)
        const orders = key === 'workflow/a2a-work/dashboard' && entry ? listOrders(item) : []
        const by = new Map<string, { n: number; last: string }>()
        for (const o of orders) {
          const who = o.from || '—'
          const cur = by.get(who) ?? { n: 0, last: '' }
          by.set(who, { n: cur.n + 1, last: o.closed > cur.last ? o.closed : cur.last })
        }
        const rows = [...by.entries()].sort((a, b) => b[1].n - a[1].n).map(([who, v]) => [who, String(v.n), v.last || '—'])
        return [
          { kind: 'metrics', items: [{ value: String(by.size), label: dw.counterparts }, { value: String(orders.length), label: dw.deals }] },
          rows.length ? { kind: 'table', headers: [...dw.headers], rows } : { kind: 'note', text: dw.empty },
          { kind: 'cta', text: dw.note, href: `/${lang}${ARCHITECT_HOME}/${slug}/build/terminal`, label: dw.terminal },
        ] as Block[]
      })()
    : []
  const tables: Block[] = versions
    ? [{
        kind: 'table',
        caption: dui.caption,
        headers: [...dui.headers],
        rows: versions.map((v) => [
          new Date(v.at).toLocaleString(lang === 'ru' ? 'ru-RU' : 'en-GB', { dateStyle: 'short', timeStyle: 'short' }),
          v.hash,
          v.subject,
          [v.running ? dui.running : '', v.exported ? dui.exported : ''].filter(Boolean).join(' · '),
        ]),
      }]
    : []
  // 325: «Настройки» — Danger zone рождённого элемента; у черновика — объяснение.
  const sui = elementSettingsUi(lang)
  // 328: «Настройки» раскрывается — «Опасная зона» (прежняя страница) и «Настройки сайта» (конфигуратор элемента).
  // 443-5: «Настройки → Домен» — главное зеркало и адрес элемента (прежде — в «Опасной зоне»).
  const domainSettings = key === 'settings/domain'
    ? (entry
      ? <ElementDangerZone ui={sui} badge={false} cards={domainRecord(item) && primaryDomain() ? ['mirror', 'address', 'signIn'] : ['mirror', 'address']} actions={{
          // 446-3: оранжевая карточка — только при подключённом своём домене; центр входа — `auth.<зона узла>`.
          signIn: domainRecord(item) && primaryDomain()
            ? <ElementOwnDomainSignIn ui={sui} domain={domainRecord(item)!.domain} center={`auth.${primaryDomain()!.name}`} />
            : null,
          mirror: <ElementDomain id={item} lang={lang} ui={sui} current={domainRecord(item)} />,
          address: <ElementAddress id={item} lang={lang} ui={sui} current={slug} internet={domainRecord(item)?.url.replace("https://", "") ?? address} />,
        }} />
      : <p className="my-4 text-sm text-muted-foreground">{sui.notBorn}</p>)
    : null
  const settings = key === 'settings/danger-zone'
    ? (entry
      ? <ElementDangerZone ui={sui} actions={{
          // 325-2: задание агенту — в окно вставки терминала элемента (`<id>/build/terminal`), отправляет человек.
          describe: <ElementDescribe id={item} lang={lang} ui={sui} current={registryDescription(item)} terminalHref={terminalLink({ lang, service: `${slug}/build`, text: DESCRIBE_TASK })} />,
          // 324-10: «адрес в интернете» — главный адрес элемента (свой домен, если он главный), а не всегда поддомен.
          address: <ElementAddress id={item} lang={lang} ui={sui} current={slug} internet={domainRecord(item)?.url.replace("https://", "") ?? address} />,
          // 324: главное зеркало — второй собственный домен в корне элемента.
          mirror: <ElementDomain id={item} lang={lang} ui={sui} current={domainRecord(item)} />,
          // 324-7: связи с узлом — CONFIG, Дизайн, Блоки.
          config: <ElementLink id={item} kind="config" on={readLinks(item).config} ui={sui} />,
          design: <ElementLink id={item} kind="design" on={readLinks(item).design} ui={sui} />,
          blocks: <ElementLink id={item} kind="blocks" on={readLinks(item).blocks} ui={sui} />,
          // 567: включение элемента — признак «выключен» в реестре узла (кнопка — выбор владельца 2026-10-22).
          power: <ElementPower id={item} lang={lang} ui={sui} dialogUi={appDialogUi(lang)} initial={(() => { const off = power.offOf(entry); return { on: !off, reason: off ? power.reasonIn(off, lang) : null, byDefault: Boolean(off?.byDefault) } })()} />,
          remove: <DeleteElementButton lang={lang} id={item} address={address} ui={sui} dialogUi={appDialogUi(lang)} />,
        }} />
      : <p className="my-4 text-sm text-muted-foreground">{sui.notBorn}</p>)
    : null
  const siteSettings = key === 'settings/site-settings'
    ? (entry
      ? <>
          <ElementSiteSettings lang={lang} ui={sui} siteUrl={domainRecord(item)?.url ?? `https://${address}`} configOn={readLinks(item).config} />
          {/* 567-6: «элемент в сети Web4» — только у кастомного: у нативного сети нет. */}
          {!treeCtx.native ? <ElementWeb4 id={item} ui={sui} dialogUi={appDialogUi(lang)} initialOn={treeCtx.web4 !== false} /> : null}
        </>
      : <p className="my-4 text-sm text-muted-foreground">{sui.notBorn}</p>)
    : null

  // 337-3/4: «Развернуть» и «Предпросмотр» — на своей странице элемента, а не только в ядре (слово владельца 2026-09-29).
  const deployPanel = isDeployments && entry ? (
    <ElementDeploy
      id={item}
      lang={lang}
      ui={elementDeployUi(lang)}
      // 356-3: «Отклонить» спрашивает причину (текст или голос) — окно задачи 336 в режиме «заметка».
      // Терминал рождённого элемента — `<адрес>/build/terminal`, а не путь служб ядра (`terminalLink`): замерено 356-3, тот вёл на ошибку.
      reject={{ ui: rejectTaskUi(lang), dialogUi: appDialogUi(lang), keyHref: openAiKeyHref(item, lang), terminalPath: `/${lang}/architect/${slug}/build/terminal` }}
    />
  ) : null
  // 344-3: итог последней выкладки копии публичных страниц в Cloudflare (`data/services/<id>/static-copy.json`); нет своего
  // домена или выкладок не было — строки нет.
  const copy = isDeployments && entry ? readStaticCopy(item) : null
  const copyReason = copy && !copy.ok
    ? (/403|10000|Authentication|access/i.test(copy.detail ?? '') ? dui.copyNoWorkers : `${copy.reason ?? ''} ${copy.detail ?? ''}`.trim())
    : ''
  const copyNote = copy && !copy.removed
    ? (
      <p className="my-2 text-sm text-muted-foreground" data-static-copy={copy.ok ? 'ok' : 'failed'}>
        {(copy.ok ? dui.copyOk : dui.copyFailed)
          .replace('{time}', new Date(copy.at).toLocaleString(lang === 'ru' ? 'ru-RU' : 'en-GB', { dateStyle: 'short', timeStyle: 'short' }))
          .replace('{files}', String(copy.files ?? ''))
          .replace('{host}', copy.host ?? '')
          .replace('{reason}', copyReason)}
      </p>
    )
    : null

  // 322 (владелец 2026-10-04: «откат новым коммитом», «Сохранить и откатить»): вместо неактивной кнопки 321 — выбор версии из тех же
  // строк, что таблица, и откат по подтверждению. Число несохранённых файлов называется в подтверждении заранее.
  const rollbackDir = isDeployments && entry ? elementDir(item) : null
  const deploymentsNote = isDeployments
    ? (entry && versions
      ? (
        <ElementRollback
          id={item}
          ui={dui}
          dirty={rollbackDir ? elementCodeState(rollbackDir)?.changed ?? 0 : 0}
          versions={versions.map((v) => ({ hash: v.hash, label: `${v.hash} · ${new Date(v.at).toLocaleString(lang === 'ru' ? 'ru-RU' : 'en-GB', { dateStyle: 'short', timeStyle: 'short' })} · ${v.subject.slice(0, 70)}` }))}
        />
      )
      : <p className="my-4 text-sm text-muted-foreground">{dui.notBorn}</p>)
    : null

  // 406-4 (карта меню 406-2, решение владельца): эти страницы показывают разделы паспорта элемента, своей копии у них нет.
  // 528-1: ключ — полный путь; витрина A2A стала «Карточками возможностей» в «A2A: ваша работа».
  const PASSPORT_VIEWS: Record<string, PassportView> = {
    'build/i2i/api': 'api', 'build/i2i/mcp': 'mcp', 'build/i2i/catalog': 'catalog',
    'build/f2f/publish': 'publish', 'build/f2f/find': 'find', [SUBSCRIPTIONS]: 'subscriptions', 'workflow/process/cron': 'cron',
    [BACKUP_TOOLS]: 'subscriptions', 'backup/cron': 'cron',
  }
  const passportView = PASSPORT_VIEWS[key]
  // 412-2: документ элемента — текст спрашивает островок при открытии (страница предрендерена, агент правит файлы в любую минуту).
  // 417: новый паспорт — сверху кнопка генерации и ответ двери элемента (как его получает ядро), ниже README и файл.
  const passportDoor = key === 'build/documents/own-service-props' && entry
    ? <PassportDoor item={item} terminalHref={terminalLink({ lang, service: `${slug}/build`, text: PASSPORT_TASK[lang === 'ru' ? 'ru' : 'en'] })} words={passportDoorUi(lang)} />
    : null
  const doc = node.doc ? <>{passportDoor}<ElementDocIsland item={item} page={node.slug} words={elementDocsUi(lang)} /></> : null
  // 412-6: сводки сделок элемента и беседы за ними; у черновика сделок не бывает. 436-2: «Процесс → Заказы» → «Связи (A2A) → Сделки»;
  // 528-1: «Рабочий процесс → A2A: ваша работа → Сделки». У «A2A: ваши заказы» источника заказов элемента пока нет — честная строка.
  const orders = key === 'workflow/a2a-work/deals'
    ? (entry ? <ElementOrdersIsland item={item} words={elementOrdersUi(lang)} /> : <p className="my-4 text-sm text-muted-foreground">{elementSettingsUi(lang).notBorn}</p>)
    : key === 'workflow/a2a-orders/deals'
      ? <p className="my-4 max-w-3xl text-sm text-muted-foreground" data-orders-empty>{ui.ordersEmpty}</p>
      : null
  // 528-2 (владелец 2026-10-18): «Messenger → Настройки» — тариф первого контакта и правила агента; хранятся в паспорте элемента.
  const messengerSettings = key === 'messenger/settings'
    ? (entry ? <ElementMessengerSettings item={item} lang={lang} ui={messengerSettingsUi(lang)} /> : <p className="my-4 text-sm text-muted-foreground">{messengerSettingsUi(lang).notBorn}</p>)
    : null
  // 536-1 (владелец 2026-10-18): «Продуктовый квиз» — живое описание продукта из `development-docs/product/` элемента; страница
  // только читает, меняет квиз агент элемента в разговоре. 556-10: «Начать квиз», «Продолжить квиз» и 💬 открывают справа терминал
  // агента элемента (`_tools/terminal-drawer`); Telegram со страницы снят.
  const productQuiz = key === 'product-design/quiz'
    ? <ProductQuizIsland item={item} lang={lang} words={productQuizUi(lang)}
        task={{ ui: quizTaskUi(lang), terminalWords: agentTerminalWords(lang), dialogUi: appDialogUi(lang), keyHref: openAiKeyHref(item, lang) }} />
    : null
  // 539-3, переделано 556-9 (владелец 2026-10-23: «Представь все просто в формате карточек аккордеон»): карточки адреса и страниц,
  // «Начать реверс-инжиниринг» — справа терминал главного агента узла (`build`); одна страница ядра для каждого элемента.
  const reverseEngineering = key === 'product-design/reverse-engineering'
    ? <ReverseEngineering item={item} lang={lang} words={reverseEngineeringUi(lang)}
        kit={{ terminalWords: agentTerminalWords(lang), dialogUi: appDialogUi(lang), keyHref: openAiKeyHref('build', lang) }} />
    : null
  // 530-1 (владелец 2026-10-18): «Настройки → Платежи» — Web2 (ключи Stripe элемента) и Web3. 532: Web3 — кошелёк элемента: наследует
  // кошелёк узла, свой добавляется и удаляется (снова кошелёк узла) — слово владельца в `lib/web4-items/node-wallet.ts`.
  const pw = paymentsUi(lang)
  const payments = key === 'settings/payments/web2'
    // 551-5 (владелец 2026-10-20): Web2 — платёжные элементы узла аккордеоном с «Подключить»; у самого платёжного элемента — его ключи.
    ? (entry
      ? (paymentOf(item)
        ? <PaymentSelf item={item} tool={paymentOf(item)!.tool} lang={lang} ui={paymentElementsUi(lang)} />
        : <PaymentElements item={item} address={slug} lang={lang} ui={paymentElementsUi(lang)} table={tableUi(lang)} />)
      : <p className="my-4 text-sm text-muted-foreground">{pw.notBorn}</p>)
    : key === 'settings/payments/web3'
      ? (entry ? <NodeWalletCard words={nodeWalletUi(lang)} note={pw.web3ElementNote} element={item} /> : <p className="my-4 text-sm text-muted-foreground">{pw.notBorn}</p>)
      : null
  // 436-3 (владелец 2026-10-09): рейтинг элемента в Lagrix; 528-1 — на главной «Рабочего процесса», куда переехал A2A.
  const lagrix = key === 'workflow' && !isNativeElement(item) ? <LagrixRating words={lagrixRatingUi(lang)} /> : null
  // 435-3: «Каталог» показывает и элементы узла — из того же реестра, по которому элементы ищут соседей (`nodeEntries`);
  // у элемента без визитки — только адрес.
  const nodeElements: NodeElementRow[] | undefined = passportView === 'catalog'
    ? (() => {
        const known = new Map(nodeEntries().map((e) => [e.id, e]))
        return (listServices() as unknown as { id: string }[]).map((s) => {
          const e = known.get(s.id)
          return { id: s.id, address: addressOf(s.id), name: e?.name ?? addressOf(s.id), description: e?.description ?? '', self: s.id === item }
        })
      })()
    : undefined
  // 463: страница одного внешнего сервиса — `service`; ссылки списка «Подписки» строятся от `subscriptionsHref`.
  const passport = passportView ? <ElementPassport view={passportView} passport={entry ? elementPassport(item) : null} ui={key === 'backup/cron' ? { ...elementPassportUi(lang), cron: backupCronUi(lang, elementPassportUi(lang).cron) } : elementPassportUi(lang)} lang={lang} nodeElements={nodeElements} service={r.service} subscriptionsHref={`/${lang}${dir}/${key.startsWith(BACKUP_TOOLS) ? BACKUP_TOOLS : SUBSCRIPTIONS}`} item={item} /> : null
  // 551-4 (владелец 2026-10-20): «Карточки возможностей» — одна оранжевая «Образец»: описание через ИИ (задача в терминал элемента) и три
  // цены; хранятся в паспорте элемента (`payments.web3["a2a-card"].sample`). Девять дверей визитки шаблона живут в визитке и в i2i → API.
  const cardUi = capabilityCardUi(lang)
  const capabilities = key === 'workflow/a2a-work/capabilities'
    ? (entry
      ? <CapabilityCards item={item} ui={cardUi} describeHref={terminalLink({ lang, service: `${slug}/build`, text: cardUi.describeTask })} web2Href={`/${lang}${dir}/settings/payments/web2`} />
      : <p className="my-4 text-sm text-muted-foreground">{elementSettingsUi(lang).notBorn}</p>)
    : null

  // 558: «Резервное копирование → Настройки» — задача агенту элемента голосом; терминал встроенного — `architect/<id>/terminal` (557),
  // рождённого — под `build/`.
  const backupSettings = key === 'backup/settings'
    ? <ScheduleTask lang={lang} service={builtInIds().includes(item) ? item : `${slug}/build`} words={backupTaskWords(lang)} />
    : null
  // 559: «Пользователи» элемента входа — все люди узла; таблицу спрашивает островок у двери ядра `/api/node/users`.
  const users = key === 'users' ? <NodeUsers lang={lang} ui={nodeUsersUi(lang)} table={tableUi(lang)} dialogUi={appDialogUi(lang)} /> : null

  // 567: выключенный элемент — плашка на каждой его странице: страницы, Preview и двери молчат намеренно, а не сломаны.
  const offNow = entry ? power.offOf(entry) : null
  const offNote = offNow ? (
    <div role="status" className="my-4 rounded-lg bg-warning/10 px-4 py-3 text-sm text-foreground ring-1 ring-warning/50" data-element-off>
      <span className="font-semibold">{sui.powerDialog.stateOff}</span> {power.reasonIn(offNow, lang)} · {sui.power.title}: <a className="underline" href={`/${lang}${dir}/settings/danger-zone`}>{sui.badge}</a>
    </div>
  ) : null
  return (
    <ArchitectPage
      lang={lang}
      path={path}
      title={words.title}
      lead={words.lead}
      pageTitle={address}
      widget={<>{offNote}{bar}{lagrix}{about}{list}{preview}{github}{deployPanel}{copyNote}{deploymentsNote}{environment}{domainSettings}{settings}{siteSettings}{agent}{passport}{capabilities}{doc}{orders}{messengerSettings}{payments}{productQuiz}{reverseEngineering}{backupSettings}{users}</>}
      children={[...dashboardBlocks, ...tables]}
    />
  )
}
