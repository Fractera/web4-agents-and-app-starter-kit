---
name: core-schedule
description: "Work process. The main agent's own clock (node step 558-3). Load it when the person asks to do something on a schedule, every day or week, at a time, to remind, or to automate a recurring job of the node."
---

# Your schedule

**Process: work** — the schedule is data in `data/cron.json` of this folder, never code; no commit, no build.

The core wakes you on a clock: entries in `data/cron.json`, event `agent-task`; an entry's `message` is your task when it fires
(ordered by the owner, step 558-3).

- Fields: `time` HH:MM, `repeat` once | daily | weekdays | weekly | monthly, `start` YYYY-MM-DD, `enabled`, `message`.
- Write the entry only after the person's «yes» to one line: what, when, how often.
- When it fires, the work goes to the element that does it (`npm run task -- <id> "<task>"`), not to you.
- The core shows it in «Automated management → Cron events».
- No personal data in git — the schedule file is outside it.
