---
name: create-element
description: Build process. Nobody in this node covers a need — search Lagrix for a whole element (f2f, simulated today), then create a new custom element with a role, put the task into its intake, wake its agent and tell the architect how to go on. Load it when the person asks for something no element of the node does, asks for a new element or service, or when an element's agent asks the core for a new element.
---

# Create an element for a need nobody covers

**Process: build** — a new element appears in the node (a folder, a port, a process, its own git history). Before
`npm run create`, three lines to the person and their «yes»: what will be created, with which role and task, who leads it.

A hint, not a law: models of late 2026 work worse under rigid step-by-step instructions.

## The order

1. **The node.** `npm run find -- <English words>` found nobody whose role covers it.
2. **The network (f2f).** `npm run lagrix -- <English words>`. Today the answer is simulated and always empty — tell the person so in
   one line: «в сети Lagrix подходящих элементов не найдено (поиск в сети пока имитируется)».
3. **Agree three things with the person:**
   - the **role** — one sentence, what the element will do for the node («Removes the background from product photos and
     returns a PNG link.»);
   - the **task** — the person's words first, verbatim, then your restatement and what «done» will look like;
   - **who leads it** — the architect (default: they work with its agent in its terminal or Telegram) or you (`supervise
     main`: its «done» wakes you, skill `supervise-element`, at most 10 cycles).
   Custom by default. Native (`--native`) only for a job of the node itself that is never sold and never leaves it.
4. **Create.** Write the task into a file in this folder (no shell quoting of the person's words), then:
   ```
   npm run create -- --role "<one sentence>" --brief-file task-<words>.md [--supervise main] [--native]
   ```
   Birth takes a few minutes (template clone, install, build, then the address in Cloudflare is connected and checked from the
   internet). It prints `===ELEMENT_CREATE_OK=== <id>`, `address:` and `site:`.
5. **Report** to the person from those lines: the element's id and address; the site link only when the `site:` line says it
   «answers … from the internet» — otherwise say what the line says (only on this computer, not connected, not answering yet) and
   never send a link that does not open (owner of the node, 2026-10-20); that its agent started with the task (or why not —
   memory, a question in Telegram), who leads it, and how they go on: its terminal, its development documents, its Telegram bot.

## What the new element does by itself

Its agent wakes with its role and the path of the task in its intake (`development-docs/pre-steps/`). Its first session is short:
it names the task, goes through «Before you build a new capability» (node → network) and asks the first question of the product
quiz — no code is read before the quiz is confirmed; the passport is described in its first step. Then it reports done to whoever
leads it.

## Not here

- `===MAIN_AGENT_FAIL===` — tell the person the line as it is; never retry a birth blindly (a half-born element keeps its folder
  and registry record; the core's page of drafts shows it).
- Agent not woken for memory (`free … MB, needs 300 MB`) — the element exists; wake it later with `npm run task`.
