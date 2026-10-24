---
name: analyze-study
description: "Work skill. «Подвергни критическому анализу итог разбора <task> …», «Проанализируй итог разбора …» — the architect pressed «Analyse the result» under a finished study on an element's «Reverse engineering» page. Audit the study as an auditor: can a functionally equal product be built from it — every role, every scenario step by step, every business process? Count seen / inferred / not seen, split the gaps into observable and not observable, decide continue or quiz, record it with npm run verdict, answer in two lines."
---

# Critical audit of a finished study

**Process: working** — the decision is data next to the report (`verdict.json`); nothing changes in git.

A hint, not a law: models of late 2026 work worse under rigid step-by-step instructions.

**The owner's question** (2026-10-23): «подверг критическому анализу полученный в результате реверс-инжиниринга результат и подтверди можно
ли с уверенностью 100% создать максимально близкий или абсолютно аналогичный продукт включающий все страницы на всю глубину все функции и
все бизнес задачи». Read it with three corrections, each the owner asked for when he said «мне не нужен попугай»:
- **You are the auditor, not the author.** Start from «the study is incomplete until shown otherwise»; a request to confirm pulls a model
  towards confirming. ✗ The first version asked «хватает ли» and got «if … then …» branches — «it is 100% traush».
- **The target is a functionally equal product, not a copy.** Every role can do everything it can in the original, by the same rules; the
  design and the texts are our own — copying someone else's code, texts, images and design is forbidden (node law, step 538).
- **100% is reached on what can be observed.** Server logic, ranking formulas, the admin side and anti-fraud cannot be seen from outside
  at all; demanding them would loop the study forever. They become decisions for the product quiz, not a reason to continue.

**The goal** is a product like the studied one (the page lives in «Product design»); the element's quiz vision, if any, narrows it. Do not
ask what to build.

1. `npm run report -- <task> --full` — the whole report and its limits. A series (the study went on in parts 2, 3…, step 556-15) prints
   every part after the first: audit what all the parts saw together, and the decision is recorded on the first task (the series id).
2. Build the matrix: every role × every scenario × every step — the screen, its fields and their checks, the actions, the resulting state,
   empty and error states, who may do it. Then the business processes: payment and its states, refunds, moderation, ranking,
   e-mails and notifications, anti-abuse, support, the operator's tools. Mark every cell **seen** (on a page or in a captured response),
   **inferred** (documents, script strings, guesses) or **not seen**.
3. Split every gap that is not «seen»:
   - **observable** — a sign-in under the person's account or a screenshot would show it (cabinets, forms, settings, states behind the
     login, the payment page up to the payment);
   - **not observable** — server logic, formulas, the admin side, internal moderation: it goes to the quiz as a decision to make.
4. Decide: **continue** if at least one observable gap is left; **quiz** when none is left — the not-observable list goes with it.
5. `npm run verdict -- <task> continue|quiz "<seen X of N observable; not seen: the main gaps; to decide in the quiz: …>" --page "<address> | <what to capture>"`
   — one `--page` per page that closes observable gaps (several gaps of one page in one `--page`). When those gaps sit behind the
   site's sign-in, add `--sign-in <site>`: the page then shows the person an orange card with the login window of the node's test
   account, and the wide «Continue the study» button waits until they have signed in (owner 2026-10-23: «если … мне нужно войти в
   авторизацию … выйди оранжевую карточку»). Gaps that a screenshot closes without a sign-in need no `--sign-in`.
6. Answer in two lines: «Видено X из N наблюдаемого; не видели — …» and the next step (what the button under the study does). No praise of
   the study and no «if … then …».

The audit asks for the studied product's functions, never for its mechanics (node step 590-3):

<!-- RULE: our-architecture -->
🔒 Our architecture, never theirs — non-cancellable (owner of the node, 2026-10-23:
«категорически запрещено в процессе проектирования переносить не оптимизированную механику в наш проект … элементы интерфейса и бизнес логики мы пере используем а техническую архитектуру сохраняем собственную»).
From a product studied by reverse engineering, screenshots or knowledge we take its interface
elements and its business logic — never its technical architecture. Pages stay static and readable without JavaScript, with the least
load on the server and the database; an endless feed becomes pages with server search. Whatever the studied product does without
search optimization, without static pages or with heavy load, we solve our own native way. A report of a studied product and
everything the graph marks external-study describe another product: a source to learn from, never our own code, pages, routes or data.

Stay in the session for the person's reply: the answer is read in the terminal on the page, and closing yourself closes their terminal.
Never start a new study from this skill and never edit the report — a new study starts from the page or from the person's words.
