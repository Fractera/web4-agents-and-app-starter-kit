"use client"

import { useRef, useState } from "react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

// 599-1 (owner 2026-10-26): a word of the glossary inside a text — highlighted, its definition in a tooltip. Hover opens it on a computer;
// a tap opens and closes it on a phone, where a plain tooltip never opens (the behaviour of IndicatorHint, 495-5).
//
// 🛑 Radix closes an open tooltip on pointerdown, before the click. A tap therefore decides from the state AT pointerdown, otherwise the
// second tap would open the tooltip again instead of closing it. A mouse click keeps the definition open: hover has already shown it, and a
// click that hid it would read as «the hint disappeared». A keyboard click (no pointerdown) toggles.
export function TermHint({ form, word, text }: { form: string; word: string; text: string }) {
  const [open, setOpen] = useState(false)
  const tap = useRef<{ wasOpen: boolean; touch: boolean } | null>(null)
  return (
    <TooltipProvider>
      <Tooltip open={open} onOpenChange={setOpen}>
        <TooltipTrigger asChild>
          <button
            type="button"
            data-block="term-hint"
            className="cursor-help rounded-sm font-medium text-foreground underline decoration-primary decoration-dotted decoration-2 underline-offset-4 hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            onPointerDown={(e) => { tap.current = { wasOpen: open, touch: e.pointerType !== "mouse" } }}
            onClick={(e) => {
              e.preventDefault()
              const t = tap.current
              tap.current = null
              setOpen(t ? (t.touch ? !t.wasOpen : true) : !open)
            }}
          >
            {form}
          </button>
        </TooltipTrigger>
        <TooltipContent data-block="term-hint-text" className="max-w-xs text-left text-sm leading-relaxed text-pretty">
          <strong className="font-semibold">{word}</strong> — {text}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
