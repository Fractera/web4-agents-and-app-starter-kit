# development-docs — the register of development documents

A pointer to everything this node knows about how it is built. One document — one line: its name, when it is opened, what is inside.
A line appears here in THE SAME edit that creates the document: a register filled in «later» stops being one by its second document,
and the missing line gives itself away nowhere.

## Documents

| Document | When it is opened | What is inside |
|---|---|---|
| [`ANTI-PATTERNS.md`](ANTI-PATTERNS.md) | before a core rebuild, before moving folders, before work with processes and ports | dead ends already paid for: symptom, cause, cure |
| [`TRANSLATION-DEBT.md`](TRANSLATION-DEBT.md) | building a capability with words for a person | what lives on an incomplete set of languages and why; read by the guard `check-content` — its format is a contract |
| [`API-MAP.md`](API-MAP.md) | when the node is called from outside or calls a neighbour | the map of doors; built by `npm run build:api-map`, never edited by hand |
| [`GLOSSARY.md`](GLOSSARY.md) | meeting an unknown word — **before guessing** | the project's words; same-named things of different layers are told apart here |
| [`BACKLOG.md`](BACKLOG.md) | when the area it names comes up — **never at session start** | half-built, promised, unexplained work of this node; arrives empty |
| [`CANCELLED.md`](CANCELLED.md) | meeting a rule that is gone | what was cancelled, when, and what replaced it; arrives with this node's own entries only |
| [`development-steps/`](development-steps/) | **first in every session** | `current-steps.md` — where the work is now; plans, outcomes, the inbox of requests (its `README.md`) |
| [`reports/`](reports/) | when a detailed analysis is needed | `errors-…` — one failure in full; `feature-…` — a finished capability |

The node's passport (who it is, what it can do) is not a file here: it is the Passport group of pages (`/architect/passport`), built from
the registry and the elements' own passports.

## Every document has its own page in the architect layer (255-2, 2026-09-19)

The owner's decision: a document the agent keeps must be visible to the person as a page, not only as a file in the repository — a document
without a page is read only by whoever knows its path. File and page are two halves of one piece of knowledge: a new document gets its page
in the same edit.

| Document | Its page |
|---|---|
| `GLOSSARY.md` | `/architect/build/glossary` |
| `ANTI-PATTERNS.md` | `/architect/build/anti-patterns` |
| `TRANSLATION-DEBT.md` | `/architect/build/translation-debt` |
| this register | `/architect/build/docs-registry` |
| `BACKLOG.md` | `/architect/build/backlog` |
| `CANCELLED.md` | `/architect/build/cancelled` |
| `API-MAP.md` | `/architect/build/api-map` |
| `development-steps/` | `steps-new` · `steps-done` · `step-current` · `task-add` |

**Single-language development is a rule, not carelessness:** a capability is written in ONE language and translations run as a separate
cycle, often on a cheaper model. `TRANSLATION-DEBT.md` is the working organ of that cycle: it keeps the addresses of what waits for
translation.

## What is not here on purpose

The agent's instruction (`CLAUDE.md` in the root) is not in this register: a program reads it automatically, by the mere fact that it lies
in the working folder. It is not a document about development but the identity of whoever develops.
