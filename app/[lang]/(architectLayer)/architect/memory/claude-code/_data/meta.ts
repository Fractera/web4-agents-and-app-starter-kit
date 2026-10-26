import type { WorkspacePageMeta } from '@/lib/collection/types'

// Имя и порядок страницы подставил установщик комплекта: они — параметры установки (275), потому что
// одна и та же вещь у службы называется `claude-code`, а у узла — `subscription`.
export const meta: WorkspacePageMeta = {
  slug: 'claude-code',
  order: 30,
}
