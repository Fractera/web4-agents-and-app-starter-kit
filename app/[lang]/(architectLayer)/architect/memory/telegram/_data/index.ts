import type { WorkspacePageData } from '@/lib/collection/types'
import { meta } from './meta'
import { en } from './en'
import { ru } from './ru'

export const data: WorkspacePageData = { meta, en, overrides: { ru } }
