# `/architect/memory` — the Deep memory element's section

Step 596 (owner, 2026-10-25: «ничего не мешает нам установить эту память как нативный элемент»): the deep memory of the node —
**memory** (`WEB4-ITEMS/core/memory`, repository `fractera-memory-starter`, v2.0.0 on the native element template). It keeps what a
person says — phrases, photos, documents, voice notes — in the node's data layer (data, storage, vectors, and its own space `memory` of
the graph element) and answers «remind me about» with the date, the source and how sure it is. Its contract is `/v1/*` with the node
key — the element's README, «Using the memory». The passport turns it off by default: the main agent turns it on for a memory task.

| Path | What |
|---|---|
| `page.tsx`, `_data/` | the section page and its words (en, ru); icon `memory`, order 25 — in the Memory group after the fast store |
| `_components/index.ts` | one block `servicePort` with `serviceId: 'memory'` |
| `preview/` | the live preview of the element |
| `claude-code/`, `terminal/`, `telegram/`, `agent-api/`, `_agent-kit/`, `agent-kit.json` | the agent kit — `npm run agent-kit:add -- memory`; never edited by hand |
