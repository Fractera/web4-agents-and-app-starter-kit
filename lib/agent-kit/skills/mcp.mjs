// THE NODE'S SKILLS MEMORY AS A TOOL (node step 595-4): an MCP server of the core over stdio — JSON-RPC, one message per line, no SDK.
// The bridge gives it (`modes.mcpArgs`, its own --mcp-config) to every session the architect talks to: the main agent and the build
// sessions of elements; a working-process session (orders of other agents) does not get it. One tool, skills_find: how other projects
// solved it. The node key is read here, never shown to the agent; nothing is written. 🛑 It must never fail at start — Claude Code keeps
// one failure cache per server name for the whole machine (node law 548-20): a refusal goes into the tool's answer instead.
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { findSkills } from './find.mjs'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..')
const send = (message) => process.stdout.write(`${JSON.stringify(message)}\n`)

const TOOL = {
  name: 'skills_find',
  description: 'How other projects solved it: skills of other projects in the node\'s memory. Call it when you are asked for an opinion and ' +
    'when you plan a new task, before deciding. Give the task in one sentence and a few English themes and terms. Returns at most three ' +
    'fragments with the skill, its source and licence, or says that nothing is close enough. Speak of what you took in your own words; ' +
    'a skill\'s text or code goes into a project only with its source and licence.',
  inputSchema: {
    type: 'object',
    properties: {
      query: { type: 'string', description: 'The task or the question, one sentence.' },
      themes: { type: 'array', items: { type: 'string' }, description: '2–4 broad English themes, for example "delivery orders".' },
      terms: { type: 'array', items: { type: 'string' }, description: '2–6 concrete English terms, for example "geocoding".' },
    },
    required: ['query'],
  },
}

async function call(args) {
  try {
    const r = await findSkills(ROOT, { query: args?.query ?? '', themes: args?.themes, terms: args?.terms })
    if (r.error) return { content: [{ type: 'text', text: `The skills memory did not answer (${r.error}). Go on without it and say so.` }], isError: true }
    const answer = r.found ? r.text : 'No skill of another project is close enough to this task.'
    return { content: [{ type: 'text', text: r.notice ? `${answer}\n\n${r.notice}` : answer }] }
  } catch (error) {
    return { content: [{ type: 'text', text: `The skills memory did not answer (${error instanceof Error ? error.message : String(error)}). Go on without it.` }], isError: true }
  }
}

async function handle(line) {
  let m
  try { m = JSON.parse(line) } catch { return }
  if (m.method === 'initialize') {
    send({ jsonrpc: '2.0', id: m.id, result: { protocolVersion: m.params?.protocolVersion ?? '2025-06-18', capabilities: { tools: {} }, serverInfo: { name: 'node-skills', version: '1.0.0' } } })
  } else if (m.method === 'tools/list') {
    send({ jsonrpc: '2.0', id: m.id, result: { tools: [TOOL] } })
  } else if (m.method === 'tools/call') {
    if (m.params?.name !== TOOL.name) send({ jsonrpc: '2.0', id: m.id, error: { code: -32602, message: `unknown tool ${m.params?.name}` } })
    else send({ jsonrpc: '2.0', id: m.id, result: await call(m.params.arguments) })
  } else if (m.method === 'ping') {
    send({ jsonrpc: '2.0', id: m.id, result: {} })
  } else if (m.id !== undefined && m.method) {
    send({ jsonrpc: '2.0', id: m.id, error: { code: -32601, message: `${m.method} is not supported` } })
  }
}

let buffer = ''
process.stdin.setEncoding('utf8')
process.stdin.on('data', (chunk) => {
  buffer += chunk
  let i
  while ((i = buffer.indexOf('\n')) >= 0) {
    const line = buffer.slice(0, i).trim()
    buffer = buffer.slice(i + 1)
    if (line) handle(line)
  }
})
process.stdin.on('end', () => process.exit(0))
