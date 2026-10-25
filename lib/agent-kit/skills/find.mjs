// THE NODE'S SKILLS MEMORY — look at how other projects solved it (node step 595-3; the tool skills_find of step 595-4 calls the same).
// The graph element answers by meaning with the caller's keywords (it calls no language model); only items marked skill:… come back,
// at most three fragments and 3 KB, each with its skill, source and licence. Nothing close enough → found: false, never a guess.
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { isSkillMark } from './to-graph.mjs'

const LIMIT = 3000

export function nodeAccess(root) {
  let key = ''
  try {
    for (const line of readFileSync(join(root, '.env.local'), 'utf8').split(/\r?\n/)) {
      const m = line.match(/^SETTINGS_SECRET=(.*)$/)
      if (m) key = m[1].trim().replace(/^["']|["']$/g, '')
    }
  } catch { /* no key — the graph refuses */ }
  let port = 24689
  try {
    const reg = JSON.parse(readFileSync(join(root, 'WEB4-ITEMS-REGISTRY', 'web4-items.json'), 'utf8'))
    const list = Array.isArray(reg) ? reg : reg.items ?? reg.services ?? Object.values(reg)
    port = list.find((x) => x && x.id === 'graph')?.port ?? port
  } catch { /* the default port of the graph element */ }
  return { key, url: `http://127.0.0.1:${port}` }
}

export async function graphCall(root, door, body, timeout = 120_000) {
  const { key, url } = nodeAccess(root)
  const r = await fetch(`${url}/api/${door}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Node-Key': key },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(timeout),
  })
  let json = null
  try { json = await r.json() } catch { /* not JSON */ }
  return { status: r.status, body: json }
}

const words = (v) => (Array.isArray(v) ? v : String(v ?? '').split(',')).map((w) => String(w).trim()).filter(Boolean).slice(0, 12)

/** { query, themes?, terms? } → { found, fragments: [{ skill, source, licence, section, text }], text } */
export async function findSkills(root, { query, themes, terms }) {
  const hl = words(themes)
  const ll = words(terms)
  if (!hl.length && !ll.length) ll.push(...words(String(query).split(/\s+/).filter((w) => w.length > 3)))
  const { status, body } = await graphCall(root, 'graph-query', { query: String(query).slice(0, 2000), mode: 'mix', hl_keywords: hl, ll_keywords: ll, top_k: 20, chunk_top_k: 8 })
  if (status !== 200 || !body) return { found: false, error: `graph ${status}${body?.error ? ` ${body.error}` : ''}`, fragments: [], text: '' }
  const about = new Map()
  for (const e of body.entities ?? []) {
    if (isSkillMark(e.file_path) && e.entity_type === 'skill') about.set(e.file_path, e.description ?? '')
  }
  const fragments = []
  let size = 0
  for (const c of body.chunks ?? []) {
    if (!isSkillMark(c.file_path)) continue
    const [, source, skill] = c.file_path.split(':')
    const text = String(c.content ?? '').trim()
    const piece = Math.min(text.length, Math.max(0, LIMIT - size))
    if (piece < 200) break
    // «Licence: Apache-2.0.» — the version keeps its dot, the sentence's dot goes.
    const licence = (about.get(c.file_path) ?? '').match(/Licence: (\S+?)\.?(?:\s|$)/)?.[1] ?? 'see the skill entity'
    fragments.push({ skill, source, licence, section: text.split('\n')[0], text: text.slice(0, piece) })
    size += piece
    if (fragments.length >= 3) break
  }
  const text = fragments.map((f) => `### ${f.skill} (${f.source}, licence ${f.licence})\n${f.text}`).join('\n\n')
  return { found: fragments.length > 0, fragments, text }
}
