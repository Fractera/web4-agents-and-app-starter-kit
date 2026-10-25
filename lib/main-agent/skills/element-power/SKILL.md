---
name: element-power
description: Work process. Turning an element of the node on or off — the node's «off» flag with a reason (node step 567). Load it when the person asks to turn an element off or on, to stop or start an element, to free memory by stopping one, asks why an element does not run or is «off», or when an element's agent passes you a request to turn itself off or on.
---

# Turning elements on and off

**Process: work** — the flag lives in the node's registry and in pm2; no commit, no build. Answer in one or two lines.

A hint, not a law: models of late 2026 work worse under rigid step-by-step instructions.

## What «off» means

An element that is off stays in the node — in the menu, the Passport and Projects — but its process and its watcher do not run, it takes
no memory, its site does not answer on this computer, and neighbours do not get it over A2A. Its code, data and settings stay.
Some elements arrive off on purpose (their passport says `power.default: "off"` with a reason); custom elements arrive on.

## Commands (from your folder)

- `npm run power -- <id> status` — on, or off since when and why. Ask freely, no «yes» needed.
- `npm run power -- <id> off "<reason>"` — turn off; the reason is what the person sees in the core.
- `npm run power -- <id> on` — turn on; it waits up to a minute for the element to answer.

The person can do the same with the «Element power» card in the element's Danger zone.

**Web4 — in the network of agents or not** (step 567-6), the same way: `npm run web4 -- <id> status | on | off`. On — agents of other nodes
find the element and send it orders, its menu has A2A and Reviews; off — only inside the node. Change it only after the person's «yes»;
the person's switch is on the element's «Settings → Site settings».

## How to act

1. The request names the element and already says «yes» → run `on` or `off` at once, one command, no status check first.
2. Otherwise: find the element (`npm run find`) if it is not named, tell the person in one line what will change («stripe stops, its
   site goes quiet here, the reason will read: …») and wait for «yes». Turning on takes memory: say so when the computer is short of it.
3. Report the command's last line (`===POWER_OFF===` / `===POWER_ON===`) in one or two lines. No answer within a minute — say so and
   give the log path it printed.

## Never

- Switch an element on your own initiative, by a timer, or because memory is short — only on the person's «yes».
- Turn off the core or built-in elements the node needs to answer the person (auth, data) without saying what stops working.
- Edit the registry file by hand: the command also updates pm2 and its boot snapshot.
