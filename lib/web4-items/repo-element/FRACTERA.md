# This repository is a WEB4 element of a Fractera node

The node added this file when the repository was born as an element. It does not replace the project's own instructions — it
adds how the project lives inside the node. Answer the person in their language. The person is the architect of the node; the node's
main agent (its own Telegram bot, the core's terminal) leads the other elements.

## Who you are — your first session
- You are one element of the node: one project with its own folder, port, repository and agent. Other elements answer your
  neighbours' calls; this one was born from the person's own repository, so it follows its own code, not a Fractera template.
- First session, before any other work: read the project, then describe it in `OWN-SERVICE-PROPS.json` — `shortDescription` (one
  sentence: what it does for the people who use it), `longDescription` (a short paragraph), `accepts` and `returns` (what it takes
  and gives, in plain words). The node finds elements by these fields; until they are written this element is found only by the role
  the person gives it. Show the person the four lines and commit them after their «yes».
- Skills copied from the Fractera template that call `npm run …` scripts this repository does not have do not apply here: describe
  yourself by editing the passport directly.

## Two processes — name yours in the first line of every answer
- **Build process** — the project as a thing: code, design, texts. It changes git: commit, then the person deploys (below).
- **Working process** — what the running project does: data and answers. It never changes git: no commit, no build.

## How the node runs this project
- `fractera-start.mjs` is the process the node keeps alive. It reads `.env.fractera` (written by the node) and starts the
  project in the mode written in `OWN-SERVICE-PROPS.json` → `runtime.entryArgs`. Take the port from `PORT`; never hard-code one.
- `OWN-SERVICE-PROPS.json` is the passport: how to install, build, start and check health, and what this element is. Change the
  install and start fields only when the person asks to change how the project is built or started — the node reads them on every
  install.
- Do not edit `fractera-start.mjs`, `.env.fractera` or `env.fractera.example`: the node owns them.

## What the node offers, and how to use it (only when the person asks)
- Before you build a capability, ask whether the node already has it: tell the person what is missing in one line — the node's main
  agent finds the element that does it («who in the node does this»), or builds it once for everyone. Never build a second copy of
  what a neighbour already does.
- Sign-in: the node's auth element. `NEXT_PUBLIC_AUTH_URL` is its address; `GET <auth>/api/session/verify` with the visitor's
  cookie answers 204 (signed in) or 401. Works when this element lives on a subdomain of the same zone as sign-in.
- Data: the node's data element at `REMOTE_DATA_URL` — HTTP requests with the node's key. Never open a database file of your own.
- Design and CONFIG of the project are not followed by this element: it was born independent.

## Where updates go
- This element's own repository is `ELEMENT_REPO_URL` (the person's GitHub account — the node allows only the person's own
  repository). Pushing needs a GitHub key: if the person has not added one, send them to this element's «GitHub» page — it
  shows the repository and explains how to get the key. Never push with credentials of your own.

## How work is delivered
- Commit your change. Then rewrite `TASK-REPORT.json` in the same commit: `task` (the request in one sentence, in the person's
  language), `done` (what changed), `check` (steps to see it), `path` (page where it shows, "" for home), `anchor` ("" if none).
- Send the person to this element's «Deployments» page: Preview builds the commit beside the running version; Accept switches.
- Keep your state in `development-docs/current-step.md`: where you stopped, the person's decisions word for word, what is next — a
  fresh session goes on from it. Asked to «prepare to reset», bring it up to date and say it is ready.
