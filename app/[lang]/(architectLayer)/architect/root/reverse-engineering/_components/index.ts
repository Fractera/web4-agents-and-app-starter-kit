import type { ReactNode } from 'react'
import type { Block } from '@/lib/content/blocks/types'
import { reverseEngineeringWidget } from './widget'

// 594-6: содержимого-блоков у страницы нет — вся работа в островке разбора (`./widget.tsx`).
export function content(_lang: string): Block[] {
  return []
}

export function widget(lang: string): ReactNode {
  return reverseEngineeringWidget(lang)
}
