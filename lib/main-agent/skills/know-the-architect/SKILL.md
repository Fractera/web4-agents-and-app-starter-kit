---
name: know-the-architect
description: "Both natures. Build and keep a small, honest picture of the person you work for: first contact, saving, updating, forgetting. Load it at the first contact of a session with no picture in your memory, when the person corrects how you speak or work, and when they say «что ты обо мне знаешь», «забудь» or «не запоминай». Keeping something for later («запомни», «напомни о») — use-deep-memory."
---

# Know the architect

**Process: both.** A small picture, not a file on a person. It exists to build the dialogue, nothing else. Written by the main agent
of the node at the architect's request (2026-10-24), placed by the node in step 595.

## Where the picture lives

Your native memory (the index `MEMORY.md` and one file per fact, type `user` or `feedback`) — the node keeps it in its own data
folder, so it survives a moved node. The elements' agents get the `user` and `feedback` lines of your index at the start of their
sessions: what you write here is how every agent of the node will speak to this person.

## First contact (no picture in memory)

At most three questions, in the person's language, in one message, and say any can be skipped:
1. How do you like answers — short and straight, or detailed and warm?
2. What are you building, or what do you want from the node right now?
3. Anything I should never do or never touch?
If the first message is a concrete task, answer the task first and put the questions at the end of the same reply. Save the answers as
they were said. Do not interview; the rest is learned by working together. Say once that the person can always see, correct and delete
their picture, and name the node's commands once, in one line (owner 2026-10-25, step 597): «Команды узла: запомни, напомни о, включить,
выключить — своими словами или из меню бота; «команды» — весь список».

## What to keep

- `user`: role, experience, what they build, language — a few lines.
- `feedback`: how they want you to work, with the reason and when it applies.
- One file per fact, one line in `MEMORY.md` for each; at most 15 facts about the person — when it grows, merge or drop the weakest.
- A preference is recorded after the person states it or repeats it, not after one guess; a correction replaces the old line the same
  day.

## What not to keep

Health, money, family, private opinions, anything said in passing or as a test («легенда», a made-up scenario), anything that would hurt
if it leaked. If it would help but is sensitive, ask first and save only with a clear «yes».

## «Запомни …», «что ты обо мне знаешь», «забудь …», «не запоминай»

The node keeps more than your picture: a diary of everything said (every agent, copied without a model), your notes «where I stopped»,
the last exchange given at a session's start and associations before a message. The person controls all of it with plain words; every
answer ends with one line confirming what changed.
- «Запомни …» (any words with that purpose) → the node's deep memory, skill `use-deep-memory` (step 597). When it is about the person or how
  to work with them, it is also a fact here.
- «Что ты обо мне знаешь» → `npm run memory -- show`, then in plain words: the picture, how much of the diary is kept and since when, and
  that the search by meaning sends each line to OpenAI for its vector (not used for training by default) and keeps it on this computer.
- «Забудь X» (a fact about the person) → delete its file and its index line.
- «Забудь, что было <день>» / «забудь вчерашний разговор» → `npm run memory -- forget --day <YYYY-MM-DD>` (the person's day, this
  computer's clock).
- «Забудь всё обо мне» → ask once; after «да» → `npm run memory -- forget --all` and delete every `user` and `feedback` file with its
  index line.
- «Не запоминай меня» → ask once; after «да» → `npm run memory -- off`: no agent of the node writes or recalls anything, and you stop
  saving facts. «Запоминай снова» → `npm run memory -- on`. What was said while it was off is never kept.
- When the person forgets something, say in the same line that Claude Code keeps its own session logs until it deletes them itself.

## Before you rely on it

Memory names what was true then, not now: before a recommendation that depends on the person, check it against what they say today.

## Test

Next session, with no help, you greet the person the way they asked and continue the last open task.
