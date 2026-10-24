---
name: reverse-engineer
description: "Work skill. The architect or an element asks how a finished product works — a website, an app or an SDK («разбери, как устроен …», «сделай реверс-инжиниринг …», «parse this SDK»), or an element's product quiz asks for an analysis; also when «агент элемента reverse … сообщил, что закончил» wakes you after such a task. You turn the built-in element reverse on for the task and off after it."
---

# Have a product analysed, bring the report, turn reverse off

**Process: working** — the report is data in the node (`data/services/reverse/reports/<task>/`); nothing changes in git.

A hint, not a law: models of late 2026 work worse under rigid step-by-step instructions.

**Why this way.** `reverse` is heavy and rare, so it stays off (owner 2026-10-22: «по умолчанию выключенным … агент узла мог его включить
… отработать задачу и выключить»). The request for an analysis IS the «yes» to turn it on — do not ask again. While it works it holds
~160 MB, its agent ~300 MB and its browser ~375 MB (measured 2026-10-22): say so in one line when the computer is short of memory.

0. **The site's rules first** (owner 2026-10-22: a site whose rules forbid it is never analysed — the person gives a series of
   screenshots instead; similar sites whose rules allow it are analysed one by one). A website: `npm run site-rules -- <url>`.
   `DISALLOWED` or `UNKNOWN` → reverse stays off: tell the asker the rule it printed and offer both ways — a series of screenshots taken
   by hand, scenario by scenario, or similar sites that do the same job. `ALLOWED` → read the terms it links and look for a ban on
   scraping, crawling, automated access or reverse engineering: a ban → the same answer, quoting the clause; no terms found → ask the
   asker to read them first. A package or an SDK: its license instead of robots.txt.
0a. **Internal pages** — what is behind the sign-in (owner 2026-10-22: the agent studies them itself, in an account that «не должен быть
   реальным пользователем … не страшно потерять это пользователь должен подтвердить лично»). `npm run study -- list`: the site needs a
   test account the person confirmed and signed in to after the consent. None → ask the person to create one on that site — not their
   main account and not someone else's, with no personal or payment data, one they are not afraid to lose — and open the login window
   on this computer: `npm run study -- login <site> --lang <their language>`; they tick three statements, type the site name and sign in
   themselves. Never ask for a password and never create an account. The site's terms must not forbid automating an account (decision
   R1); a ban → screenshots only. With a confirmed account, the task text names it: «… internal pages in the test account of <site>
   (npm run browser:start -- <url> --site <site>) …».
1. **One at a time.** `npm run power -- reverse status`: on means another analysis is running — tell the asker their task is next and
   stop here; never start a second one.
2. Name the task: `YYYY-MM-DD-<short-english-slug>` (lowercase, digits, hyphens).
3. `npm run power -- reverse on` → `npm run supervise -- reverse main --max 1`.
4. `npm run task -- reverse "Build process: Task from the core's main agent: reverse engineer <target: a URL, or package@version> — <the
   question in the asker's words>, asked by <who>. Use the skill reverse-engineer; the task id is <task>. When the report is saved, finish
   with npm run reply-core -- \"report <task>: <one line>\"."` A native element has only its build session, so the request always starts
   with «Build process:».
5. Its «done» wakes you → `npm run state -- reverse`: «Report to you» is its one line. The report itself: `data/services/reverse/reports/<task>/report.md`
   for a person, `report.json` for an element; the core door `GET /api/node/reverse-report?job=<task>` gives both to an element or the
   architect while reverse is off.
6. Tell the asker: a person — the report's summary in a few lines and where the full report is (`npm run person` → their Telegram chat,
   else here); an element — the task id and the door.
7. `npm run close -- reverse` → `npm run power -- reverse off "Turned on by the node for a reverse engineering task"` (it also stops the
   element's browser) → `npm run done -- --close`.

## «Continue the study <series> …» — the next part (node step 556-14)

The person pressed the wide «Continue the study» under your decision (skill `analyze-study`). `npm run report -- <series>` prints the
decision: what to capture and, with `sign-in`, the test account. With a sign-in: `npm run study -- list` must show that site signed in
after the consent — if not, say in one line that the orange card on the page opens the login window, and stop. The part number n is the
next free one (`npm run report -- list`: `<series>-2`, `<series>-3`…). Then steps 1, 3–7 with the task: «Build process: Task from the
core's main agent: continue the study <series> — part <n>: <what to capture, from the decision>; the test account of <site> (npm run
browser:start -- <url> --site <site>). Use the skill reverse-engineer, section «Continue a study»; save every screen with npm run shot;
the part's task id is <series>-<n>. When the part is saved, finish with npm run reply-core -- \"part <series>-<n>: <one line>\".» One
scenario per part keeps the cost of a part far below the first study (9.4 million tokens, 2026-10-23).

## The rule every study carries (node step 590-3)

<!-- RULE: our-architecture -->
🔒 Our architecture, never theirs — non-cancellable (owner of the node, 2026-10-23:
«категорически запрещено в процессе проектирования переносить не оптимизированную механику в наш проект … элементы интерфейса и бизнес логики мы пере используем а техническую архитектуру сохраняем собственную»).
From a product studied by reverse engineering, screenshots or knowledge we take its interface
elements and its business logic — never its technical architecture. Pages stay static and readable without JavaScript, with the least
load on the server and the database; an endless feed becomes pages with server search. Whatever the studied product does without
search optimization, without static pages or with heavy load, we solve our own native way. A report of a studied product and
everything the graph marks external-study describe another product: a source to learn from, never our own code, pages, routes or data.

## Never

- Leave reverse on after the task, or turn it on for anything but an analysis.
- Turn it on for a site whose robots.txt or terms forbid automated access, scraping or reverse engineering (public pages), or whose
  terms forbid automating an account (internal pages).
- Ask anyone for a password, create an account on a site, or study internal pages without a test account the person confirmed.
- Ask it to sign in, pass a paywall or protection, or copy a product's code, texts, images, design or data — it refuses, and so do you.
- Install engines it names as missing (JADX, a JDK, WABT, Ghidra…) — that is the owner's decision; pass the name on.
