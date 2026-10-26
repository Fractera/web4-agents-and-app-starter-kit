import type { ReactNode } from 'react'
import type { Block } from '@/lib/content/blocks/types'
import { agentKitWidget } from '../../_agent-kit/widgets'

// СОДЕРЖИМОЕ СТРАНИЦЫ — ИЗ КОПИИ КОМПЛЕКТА АГЕНТА ЭТОЙ СЛУЖБЫ (271, `../../_agent-kit/`).
// Шаблон `kits/_agent-kit/pages/claude-code/`; установщик подставил имя службы вместо `memory`.
export function content(_lang: string): Block[] {
  return []
}

export function widget(lang: string): ReactNode {
  return agentKitWidget('claude-code', 'memory', lang)
}
