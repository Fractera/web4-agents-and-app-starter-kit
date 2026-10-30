import { BanIcon, ClipboardListIcon, MessageSquareDashedIcon, MessageSquareWarningIcon, ShieldAlertIcon, StarIcon, ThumbsDownIcon, ThumbsUpIcon } from "lucide-react"
import type { ComponentType, ReactNode } from "react"
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Eyebrow, Small } from "@/components/ui/typography"
import { AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { IndicatorHint } from "./indicator-hint.client"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

// THE ELEMENT'S REPUTATION IN Lagrix (step 436-3) — on the home page of «Links (A2A)» and on the node passport (478-1).
//
// Until an element is connected to the network there is no source of these numbers, so every value is «—», never an invented number
// (the same rule as «—» on Dashboard → Projects, owner 2026-09-30).
//
// 495-1 (owner 2026-10-15): «под каждую позицию нужна своя карточка … в два ряда … на телефоне они стояли в колонку». Six indicators of
// the protocol (changelog entries 43 and 44), each a pair «count · sum»: all orders, likes, dislikes, cancelled orders, unreviewed, and (511) negative ratings.
// Likes and dislikes are weight (the fee paid, USDC); all orders, cancelled and unreviewed are sums of the deals' network parts.
// Under them the «proven violation as a super-node» line. No balance: the card shows reputation, not money. The passport passes its own
// title, lead, a marker before the title and a slot under the header; the A2A home page passes nothing.
//
// 495-5 (owner 2026-10-15): «после каждого слова все заказы … рисует Tул тип для того чтобы объяснить что это такое» — a hint after every
// indicator and after the violation line, worded from changelog entries 43 and 44. «Все указанные блоки карточек это аккордеон» — with
// `item` the card becomes one item of the caller's Accordion: the whole header opens and closes it (the toggle is stretched over the
// header; a link in the title stays a link above it), the body collapses.
//
// 511 (owner 2026-10-16): «устаревшие карточка называется сгорела вот туда … ставь заглушку: негативные оценки(?)». The «burned» tile is
// gone (burned left the protocol, step 500 decided); its place takes «negative ratings» — how the element rates its partners: the share of
// its orders, by weight (the fee paid), that ended with its own dislike. Big «— %», under it the pair «count · weight» of the dislikes it
// gave: a count is never shown without its sum (entry 43), and 100 % of one deal must not look like 100 % of a hundred.
//
// 🪦 517-1 (owner 2026-10-17) put a mockup «Reviews» card of invented orders under the violation line. Removed everywhere in 551-2
// (owner 2026-10-20: «аккордеон который показывает фейковые отзывы. По умолчанию и быть не должно», and «Везде»): reviews come from the network.

export type LagrixRatingWords = {
  eyebrow: string
  title: string
  lead: string
  orders: string
  likes: string
  dislikes: string
  negative: string
  cancelled: string
  unreviewed: string
  /** «count · weight» — under likes and dislikes. */
  weightUnit: string
  /** Under «negative ratings»: the percent by weight, then «count · weight» of the dislikes given (511). */
  percentUnit: string
  /** «count · sum» — under all orders, cancelled and unreviewed. */
  sumUnit: string
  violation: string
  /** Hints after each indicator name and after the violation line (495-5). */
  hints: Record<"orders" | "likes" | "dislikes" | "negative" | "cancelled" | "unreviewed" | "violation", string[]>
  /** Accessible name of the hint button, «What it means». */
  hint: string
  /** Accessible name of the card's open/close toggle in accordion mode. */
  toggle: string
  empty: string
  note: string
}

type Indicator = { key: "orders" | "likes" | "dislikes" | "negative" | "cancelled" | "unreviewed"; Icon: ComponentType<{ className?: string; "aria-hidden"?: boolean }>; tone: string; unit: "weightUnit" | "sumUnit" | "percentUnit" }
const INDICATORS: Indicator[] = [
  { key: "orders", Icon: ClipboardListIcon, tone: "text-primary", unit: "sumUnit" },
  { key: "likes", Icon: ThumbsUpIcon, tone: "text-primary", unit: "weightUnit" },
  { key: "dislikes", Icon: ThumbsDownIcon, tone: "text-muted-foreground", unit: "weightUnit" },
  { key: "negative", Icon: MessageSquareWarningIcon, tone: "text-destructive", unit: "percentUnit" },
  { key: "cancelled", Icon: BanIcon, tone: "text-destructive", unit: "sumUnit" },
  { key: "unreviewed", Icon: MessageSquareDashedIcon, tone: "text-muted-foreground", unit: "sumUnit" },
]

export function LagrixRating({ words, title, lead, marker, children, id, item, star, plain = false }: {
  words: LagrixRatingWords
  title?: ReactNode
  lead?: ReactNode
  marker?: ReactNode
  children?: ReactNode
  id?: string
  /** Accordion item value: the card collapses inside the caller's `Accordion` (495-5). */
  item?: string
  /** 567-7 (owner 2026-10-22: «используй большую звёздочку … закрасить или не закрасить … перенеси подсказки»): the big star on the right
   *  says whether the element is in the Web4 network — filled or empty, with the owner's words in a tooltip. Without it — the plain star. */
  star?: { on: boolean; hint: string }
  /** 566 (owner 2026-10-22: «если элемент не используется в Lag Rx то не нужно показывать его рейтинги достаточно показать просто его
   *  описание»): the card without the indicators, the violation line and the note — its header and the caller's children only. */
  plain?: boolean
}) {
  const body = plain ? (
      <CardContent className="flex flex-col gap-4">{children}</CardContent>
  ) : (
      <CardContent className="flex flex-col gap-4">
        {children}
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3" data-lagrix-indicators>
          {INDICATORS.map(({ key, Icon, tone, unit }) => (
            <div key={key} className="flex flex-col gap-3 rounded-lg border border-primary/20 bg-background/70 p-4" data-lagrix-indicator={key}>
              <Small className="flex items-center gap-2 font-medium text-foreground">
                <Icon aria-hidden className={`size-4 ${tone}`} />
                {words[key]}
                <IndicatorHint label={`${words[key]}: ${words.hint}`} text={words.hints[key]} />
              </Small>
              {unit === "percentUnit" ? (
                <div className="flex flex-col gap-1" aria-label={`${words[key]}: ${words[unit]}`}>
                  <p className="flex items-baseline gap-1 font-mono text-4xl font-black tracking-tight tabular-nums text-foreground">
                    {words.empty}
                    <span aria-hidden className="text-2xl font-semibold text-muted-foreground">%</span>
                  </p>
                  <p className="flex items-baseline gap-2 font-mono text-lg font-bold tabular-nums text-muted-foreground">
                    {words.empty}
                    <span aria-hidden>·</span>
                    {words.empty}
                  </p>
                </div>
              ) : (
                <p className="flex items-baseline gap-2 font-mono text-4xl font-black tracking-tight tabular-nums text-foreground" aria-label={`${words[key]}: ${words[unit]}`}>
                  {words.empty}
                  <span aria-hidden className="text-2xl font-semibold text-muted-foreground">·</span>
                  {words.empty}
                </p>
              )}
              <Small>{words[unit]}</Small>
            </div>
          ))}
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-destructive/30 bg-background/70 px-4 py-3" data-lagrix-violation>
          <Small className="flex items-center gap-2 font-medium text-foreground">
            <ShieldAlertIcon aria-hidden className="size-4 text-destructive" />
            {words.violation}
            <IndicatorHint label={`${words.violation}: ${words.hint}`} text={words.hints.violation} />
          </Small>
          <span className="font-mono text-lg font-bold tabular-nums text-foreground">{words.empty}</span>
        </div>
        <Small>{words.note}</Small>
      </CardContent>
  )

  const card = (
    <Card className={`${item ? "my-4" : "my-6"} bg-primary/5 ring-primary/40`} data-lagrix-rating="placeholder" data-rating-of={id}>
      <CardHeader className={item ? "relative" : undefined}>
        <Eyebrow>{words.eyebrow}</Eyebrow>
        <CardTitle className="flex items-center gap-2 text-xl font-semibold">{marker}{title ?? words.title}</CardTitle>
        <CardDescription>{lead ?? words.lead}</CardDescription>
        <CardAction className="flex items-center gap-2">
          {star ? (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button type="button" className="relative z-10 inline-flex" aria-label={star.hint} data-passport-web4={star.on ? "on" : "off"}>
                    <StarIcon aria-hidden className={star.on ? "size-6 fill-primary text-primary" : "size-6 text-muted-foreground"} />
                  </button>
                </TooltipTrigger>
                <TooltipContent>{star.hint}</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ) : (
            <StarIcon role="img" aria-hidden className="size-6 text-primary" />
          )}
          {item && <AccordionTrigger aria-label={words.toggle} className="py-0 after:absolute after:inset-0 after:content-['']" />}
        </CardAction>
      </CardHeader>
      {item ? <AccordionContent className="pb-0">{body}</AccordionContent> : body}
    </Card>
  )
  return item ? <AccordionItem value={item} className="border-b-0" data-lagrix-item={item}>{card}</AccordionItem> : card
}
