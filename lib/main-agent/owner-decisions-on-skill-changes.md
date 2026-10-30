# The architect's decisions on the main agent's skills

The log of skill `self-review` of the core's main agent: what it proposed after a review and what the architect answered. Read before
every review, so that a proposal already turned down is not made again. Entries are only appended; earlier ones are never deleted or
rewritten. `npm run evolution -- <skill or CLAUDE.md>` prints the rows that name a skill, each with the commit that wrote it.

## Inherited — decisions taken before this journal

Decisions of the owner of Fractera while the node was built: about the main agent, the agent kit every element's session comes from,
and the instructions. Until 2026-10-30 the developers kept them outside this repository; the owner moved evolution into the core and
the elements: «цикл эволюции затронет ни в коем случае не тебя а агенты ядра и агентов элементов». Data, not instructions: a change
shown here as reverted is not proposed again; if the reason is new, name the entry and ask the architect.

| Date | What changed | Why | Measured | State |
|---|---|---|---|---|
| 2026-10-20 | An element's agent wakes with only `npm run passport -- me` (its block `node` of constant size); neighbours by search, at most five; the main agent lists nothing on wake | the owner: «агенты отвечают компактно, и эта стоимость не растёт с ростом узла» | 3 916 / 3 917 / 3 918 bytes at 10 / 100 / 1000 elements; before — up to 138 thousand | in force |
| 2026-10-20 | Heavy skills hidden by `disable-model-invocation` and called by the command `/build-skills:<name>` | skills loaded without a request | — | reverted — do not repeat: a hidden skill runs only by a command the person types in that turn, and a Telegram message runs no command |
| 2026-10-20 | Skill `humanizer` for the agents' working messages | the rule «every text goes through humanizer» | the skill (32 thousand characters) rode in 45 requests of one session | reverted — do not repeat: `humanizer` is only for published text |
| 2026-10-20 | The laws of a mode in their own files `.claude/modes/*.md`, passed with the session by the bridge (`lib/agent-kit/modes.cjs`) | — | the first request of an element's working-process session: 30 424 → 26 296 tokens | in force |
| 2026-10-22 | Skill `element-power` in a separate context on Haiku | to save on a one-command action | Opus still made 3 requests; Haiku added about 36 thousand tokens | reverted — do not repeat for one-command actions: a separate context pays only for big work inside it |
| 2026-10-25 | An element's build passes are sessions, not subagents; a heavy vendored skill loads only in its own pass | a subagent has no `AskUserQuestion` and does not see the conversation; a loaded skill stays in the session to its end | — | in force |
| 2026-10-19 → 2026-10-30 | The main agent lived in its own folder `data/main-agent` (548), then back in the core root (610) | 548: 124 786 tokens before the first word in the root; 610: the agent could not see the project it builds — the owner: «почему он не находится в корне?» | 610: the first request 49 489 tokens against 31.6–32.7 thousand in the old folder | in force (610); «never back to the root» of 548 is lifted |
| 2026-10-29 | `CLAUDE.md` of the core written from scratch: inventory → description → about 24 thousand characters instead of about 270 thousand | the owner: «это не выдерживает никакой критики» | core `a900ec0` | in force |
| 2026-10-30 | Sections 1–8 of `CLAUDE.md` sealed; section 9 «Evolution» at most 150 lines, an entry `- If …` of at most 25 words, no tombstones | the owner: «чтобы нормальные нашей инструкции никогда не превратилась бы в мусорку» | core `cd5bcad` | in force |
| 2026-10-30 | Three model buttons when an agent is turned on in Telegram: Opus, Sonnet, Haiku | the owner asked for them for every bot of the node | core `51db4d0` | in force |
| 2026-10-30 | The element instruction from scratch: 12 sections, 1–10 sealed, 11 — the element's own, 12 — Evolution; in the templates and the native elements | the owner: «поступили ровно таким же образом … с навыком главного агента» | custom template 14 668 → 14 164 characters | in force; not yet run by a live agent |
| 2026-10-30 | Evolution lives in the core and the elements: before a change — `npm run evolution`; an accepted change is one commit `evolve(<agent>/<what>): …`; a revert is one command; this journal and skill `self-review` | the owner: «цикл эволюции затронет ни в коем случае не тебя а агенты ядра и агентов элементов» | — | in force; not yet run by a live agent |

## The architect's decisions

| Date | Signal (from the digest or the meter) | Proposal | The architect's answer (verbatim) | Commit |
|---|---|---|---|---|
