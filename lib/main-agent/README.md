# The node's main agent — source

Node step 548-4 (owner, 2026-10-19). The core's agent (service `build`, the core's menu «Main agent») routes requests to the
elements of the node, creates a new element when nobody covers a need, and can lead an element's work for the architect.

## Why its own folder

Claude Code loads every `CLAUDE.md` above the folder it starts in, and project skills from that folder and every parent up to the
repository root (code.claude.com/docs/en/memory, …/skills). Started in the node's root, the core's agent loaded the node's
`CLAUDE.md` (252 361 characters, about 95 thousand tokens) and the 61 skills of the root on every request: 124 786 tokens before the
first word. This folder is installed as its own git repository at `data/main-agent` (outside the node's git): only its own
instruction and its three skills load, and the node's `CLAUDE.md` is excluded by `claudeMdExcludes`.

## What is here

| File | Installed as |
|---|---|
| `main-agent-instruction.md` | `data/main-agent/CLAUDE.md` |
| `skills/<name>/SKILL.md` — `route-to-element`, `create-element`, `supervise-element` | `data/main-agent/.claude/skills/<name>/SKILL.md` |
| `package.json` — `npm run contacts · find · lagrix · create · task · state · role · supervise · person` | `data/main-agent/package.json` |

Every command is `scripts/main-agent-cli.mjs` of the node. Supervision lives in `lib/web4-items/supervision.cjs` and
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
