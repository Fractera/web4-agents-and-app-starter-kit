// THE NODE'S SKILLS MEMORY — a skill folder becomes a ready graph for the graph element, without a language model (node step 595-3).
// The owner, 2026-10-25: «кроме описания и памяти ещё одним слоем твоего внутреннего я будет нативная умение подсматривать Skills
// которые должны существовать в lightRag» — the skills of other projects, looked at when an agent is asked for an opinion or plans a task.
// Chunks are the sections of SKILL.md and of its reference files; entities are the skill, its sections and the tools named in backticks;
// every item carries file_path `skill:<source>:<skill>` — no slash: LightRAG keeps only the part after the last slash (measured 595-1).
// The same converter will take the large base shipped with every clone (step 598): it costs no model turn.
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { basename, join } from 'node:path'

const MAX_CHUNK = 1800
export const markOf = (source, skill) => `skill:${source}:${skill}`.slice(0, 300)
export const isSkillMark = (where) => typeof where === 'string' && where.startsWith('skill:')

function frontmatter(text) {
  const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/)
  if (!m) return { meta: {}, body: text }
  const meta = {}
  for (const line of m[1].split(/\r?\n/)) {
    const kv = line.match(/^([A-Za-z_-]+):\s*(.*)$/)
    if (kv) meta[kv[1]] = kv[2].replace(/^["']|["']$/g, '')
  }
  return { meta, body: text.slice(m[0].length) }
}

// Sections by markdown headings (# … ###); a long section is cut at paragraph borders.
function sections(text, file) {
  const found = []
  let head = file
  let lines = []
  const flush = () => {
    const t = lines.join('\n').trim()
    if (t) found.push({ head, text: t })
    lines = []
  }
  for (const line of text.split(/\r?\n/)) {
    const h = line.match(/^(#{1,3})\s+(.+?)\s*#*$/)
    if (h) { flush(); head = h[2].trim(); continue }
    lines.push(line)
  }
  flush()
  const pieces = []
  for (const s of found) {
    if (s.text.length <= MAX_CHUNK) { pieces.push(s); continue }
    let cur = ''
    for (const para of s.text.split(/\n{2,}/)) {
      if (cur && cur.length + para.length > MAX_CHUNK) { pieces.push({ head: s.head, text: cur.trim() }); cur = '' }
      cur += `${para}\n\n`
    }
    if (cur.trim()) pieces.push({ head: s.head, text: cur.trim() })
  }
  return pieces
}

// A tool, an API, a library or a command named in backticks — not a sentence, a flag or a path.
function toolsIn(text) {
  const names = new Set()
  for (const m of text.matchAll(/`([A-Za-z][A-Za-z0-9 ._-]{2,40})`/g)) {
    const name = m[1].trim()
    if (/\s{2,}/.test(name) || /^[a-z0-9_.-]+$/.test(name) && !/api|sdk|cli/i.test(name)) continue
    names.add(name)
  }
  return names
}

/** A skill folder (SKILL.md, references/*.md) → { mark, skill, graph: { chunks, entities, relationships } } for graph-insert. */
export function skillGraph(dir, { source, name, license, url }) {
  const { meta, body } = frontmatter(readFileSync(join(dir, 'SKILL.md'), 'utf8'))
  const skill = name || meta.name || basename(dir)
  const mark = markOf(source, skill)
  const files = [['SKILL.md', body]]
  // 598-1: `reference/` too — impeccable keeps its whole design knowledge there.
  for (const sub of ['references', 'reference']) {
    const refs = join(dir, sub)
    if (!existsSync(refs)) continue
    for (const f of readdirSync(refs).filter((f) => f.endsWith('.md')).sort()) files.push([`${sub}/${f}`, readFileSync(join(refs, f), 'utf8')])
  }
  const chunks = []
  const entities = []
  const relationships = []
  const skillEntity = `Skill ${skill}`
  const tools = new Set()
  let n = 0
  for (const [file, text] of files) {
    for (const s of sections(text, file)) {
      const id = `${skill}#${++n}`
      chunks.push({ content: `${skill} — ${s.head}\n\n${s.text}`, source_id: id, file_path: mark })
      const practice = `${skill}: ${s.head}`.slice(0, 120)
      entities.push({ entity_name: practice, entity_type: 'practice', description: s.text.replace(/\s+/g, ' ').slice(0, 300), source_id: id, file_path: mark })
      relationships.push({ src_id: skillEntity, tgt_id: practice, description: `${skill} teaches: ${s.head}`, keywords: s.head, source_id: id, file_path: mark })
      for (const tool of toolsIn(s.text)) {
        if (!tools.has(tool)) {
          tools.add(tool)
          entities.push({ entity_name: tool, entity_type: 'tool', description: `${tool}, named in the skill ${skill} (${s.head}).`, source_id: id, file_path: mark })
        }
        relationships.push({ src_id: practice, tgt_id: tool, description: `${s.head} uses ${tool}`, keywords: tool, source_id: id, file_path: mark })
      }
    }
  }
  if (!chunks.length) throw new Error(`no sections in ${dir}`)
  const about = `${meta.description || skill}. Source: ${source}${url ? ` (${url})` : ''}. Licence: ${license || 'unknown'}.`
  entities.unshift({ entity_name: skillEntity, entity_type: 'skill', description: about.slice(0, 1500), source_id: chunks[0].source_id, file_path: mark })
  return { mark, skill, graph: { chunks, entities, relationships } }
}
