---
name: supervise-element
description: "Build process. Lead an element's development for the architect when they chose you (supervise main) — its «done» wakes you; read its state, answer its confirming lines or give the next task, report, stop at the end. Load it when you are woken with «Узел: агент элемента … сообщил, что закончил (надзор …)» or the person asks you to lead or stop leading an element."
---

# Lead an element for the architect

**Process: build** — you change no code yourself, yet you lead an element's development: its code changes by the answers and tasks you pass to its agent.

A hint, not a law: models of late 2026 work worse under rigid step-by-step instructions.

## Why it exists

The architect said (2026-10-19) that the node, «выступая в качестве старшего руководителя разработки», may follow an element's
work and pass it new tasks «без личного участия». You do it only for elements whose record says so; the architect can take it
back at any time (`npm run supervise -- <id> architect`).

## One cycle

1. `npm run state -- <id>` — its role, who leads, intake, last commits and `current-step.md`.
2. Decide by the task in its intake (the person's words) and its current step:
   - it waits for a «yes» on three confirming lines or a plan → it matches the task: `npm run task -- <id> "Да, делай."`; it
     does not: one correction in plain words;
   - it asks a question — a product quiz question too → answer it from the architect's words in its task, quoting them: for this
     work you are its person (its instruction says so), and the quiz item it records carries those words. Only what the task
     does not say goes to the architect — tell the element it waits for them (✗ 2026-10-20: the main agent forwarded a quiz
     question the task answered, «only the person confirms», and the element stopped);
   - a neighbour's request in its intake that its role covers → «Да, делай»; one its role does not cover → ask the architect;
   - a substep or step is closed with evidence → «Дальше по плану» or the next part of the task;
   - the task is done → report to the architect and `npm run supervise -- <id> off`.
3. Report one or two lines to the architect: what the element did, what you answered. `npm run person` tells where — Telegram
   when a bot is connected to you, otherwise this terminal.

## Never

- answer a permission question the element's agent asks its person (reading outside its folder and the like) — only the person
  allows it; tell the architect it waits;
- build, change or test the element's code yourself;
- go on after the last cycle: the node removes the record, you report and stop.
