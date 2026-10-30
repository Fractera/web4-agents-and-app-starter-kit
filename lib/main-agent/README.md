# The node's main agent — source

Node step 548-4 (owner, 2026-10-19). The core's agent (service `build`, the core's menu «Main agent») routes requests to the
elements of the node, creates a new element when nobody covers a need, and can lead an element's work for the architect.

## Where it lives (node step 610, 2026-10-30)

🪦 From step 548-4 to 610 the main agent lived in its own repository folder `data/main-agent`: the node's `CLAUDE.md` was then 252 361
characters and the root's 61 skills cost 124 786 tokens before the first word. The owner, 2026-10-29, on learning that the agent could not
see the project it builds: «почему он не находится в корне?» — and «yes to do it». Now the service `build` runs in the core root
(`workspace: node` in `architect/build/agent-kit.json`), reads the core's `CLAUDE.md` (step 608, about 28 thousand characters) and the
core's code, and runs on Opus (owner, 2026-10-30).

## What is here

| File | What it is |
|---|---|
| `root-skills-off.json` | skills of the core root the main agent does not get — written as `skillOverrides: off` into the root's `.claude/settings.local.json` by `npm run main-agent:install` |
| `OWN-SERVICE-PROPS/` | its Automated management catalogues, installed into `data/main-agent/OWN-SERVICE-PROPS` (its data folder) |

Its skills live in the core's `.claude/skills/` (`route-to-element`, `create-element`, `supervise-element` and eleven more), its commands
in the core's `package.json` (`npm run contacts · find · card · create · task · state · supervise · person · done …`). Every command is `scripts/main-agent-cli.mjs` of the node. Supervision lives in `lib/web4-items/supervision.cjs` and
`data/node/supervision.json`; roles in `WEB4-ITEMS-REGISTRY/roles.json` (services) and `data/node/roles.json` (assigned).

## Memory (node step 595)

The main agent's session gets the node's memory through the bridge (`lib/agent-kit/modes.cjs`, the core's `CLAUDE.md`, step 595): the
description of its memory after the soul in its prompt, its native memory in `data/services/build/memory` (the picture of the person,
skill `know-the-architect`), its last exchange and note at the start, up to three lines of the past found by meaning before each
message, and the tool `skills_find`. Its commands: `npm run done -- --note "<where you stopped>"` (the next session starts with it) and
`npm run memory -- show | forget --day <YYYY-MM-DD> | forget --all | off | on | vectors` on the person's words.

## Install and update

`npm run main-agent:install` in the node's root — copies these files, makes the folder its own repository, writes
`.claude/settings.local.json` (the node's `CLAUDE.md` excluded, reads outside the folder blocked, foreign skills, plugins and
connectors off). It also runs from `npm run elements:isolate`. Edit the files here, never in `data/main-agent`: the next install
overwrites them.

## What it does not do

It does not change the core's code and does not build an element's work; a Telegram bot for it is connected by the person on the
core's page «Main agent → Messenger → H2A → Telegram» — without one it answers in the core's terminal.
