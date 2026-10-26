import type { Block } from '@/lib/content/blocks/types'

// Живой просмотр элемента (слово владельца 2026-09-24).
export function content(lang: string): Block[] {
  return [{ kind: 'elementPreview', lang, serviceId: 'memory' }]
}
