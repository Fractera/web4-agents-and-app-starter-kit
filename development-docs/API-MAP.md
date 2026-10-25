# API map

> **Собирается командой `npm run build:api-map` — не правьте руками.** Имена живут в самих маршрутах
> первой строкой (`// @api …`), потому что рядом с кодом они не расходятся с ним. Написанное здесь
> вручную исчезнет при следующей сборке.

Имя маршрута — то, чем его находят: 6–12 слов, глагол первым. Правило проверяется `npm run check:api`,
который стоит в `prebuild` — маршрут без имени роняет сборку.

Всего маршрутов: **90**

| Адрес | Методы | Что делает | Продукт |
|---|---|---|---|
| `/api/agents/done` | POST | woken element agent reports work done or closes its terminal | — |
| `/api/agents/person-lang` | POST | element agent reports the language its person now writes in | — |
| `/api/agents/sessions` | GET, POST | list and stop the live Claude Code terminals of born WEB4 elements | — |
| `/api/agents/telegram` | POST | list an element's Telegram bots or write through one | — |
| `/api/agents/wake` | POST | wake the Claude Code agent of a node element without a browser | — |
| `/api/architect/design-config` | GET, POST | read and change the site element's design settings from the core | — |
| `/api/architect/drafts` | GET, POST | create a new microservice draft with its own architect page group | — |
| `/api/architect/drafts/[id]` | DELETE | delete a microservice draft after its address is typed back | — |
| `/api/architect/drafts/[id]/birth` | GET, POST | start a draft's birth into an element and report its progress | — |
| `/api/architect/environment` | GET, POST | read which environment variables are set and save the OpenAI key | — |
| `/api/architect/items/[id]` | GET, DELETE | delete a born WEB4 element after its address is typed back | — |
| `/api/architect/items/[id]/address` | GET, POST | check and set the core address of a born WEB4 element | — |
| `/api/architect/items/[id]/describe` | POST | take the agent-written element description into the core registry | — |
| `/api/architect/items/[id]/domain` | GET, POST, PATCH, DELETE | check or attach an own second domain for a born element root | — |
| `/api/architect/items/[id]/github` | GET, POST, DELETE | connect a born element to its owner's GitHub repository | — |
| `/api/architect/items/[id]/github/import` | GET, POST | replace an element's code from another GitHub repository | — |
| `/api/architect/items/[id]/github/push` | POST | export a born element's folder to its connected GitHub repository | — |
| `/api/architect/items/[id]/github/rename` | POST | rename an element's GitHub repository and record the new name | — |
| `/api/architect/items/[id]/links` | PATCH | turn an element's sync with CONFIG, Design or Blocks on or off | — |
| `/api/architect/items/[id]/preview` | GET, POST | build an element preview beside the live one, accept or reject | — |
| `/api/architect/items/[id]/redraw` | POST | redraw an element's pages now, from the core's own server | — |
| `/api/architect/items/[id]/rollback` | POST | roll a born element back to a chosen version by new commit | — |
| `/api/architect/items/[id]/update` | GET, POST | merge a new Fractera tag into an element's own history | — |
| `/api/auth/providers/google` | GET, POST, DELETE | read and set the Google sign-in keys of this node's auth service | — |
| `/api/auth/providers/resend` | GET, POST, DELETE | read and set the Resend sign-in letter key of the auth service | — |
| `/api/config-image/[slot]` | GET | serve a settings image slot at one stable address | — |
| `/api/domain/activate` | POST | create the named tunnel and the DNS record, then remember what happened | — |
| `/api/domain/check` | POST | check publicly whether the domain already points at Cloudflare nameservers | — |
| `/api/domain/key` | POST | accept the Cloudflare API token and remember it on the node | — |
| `/api/domain/list` | GET, POST, PUT, DELETE | list add recheck and remove the node's own domains | — |
| `/api/domain/records` | GET, POST | add mail-service DNS records to the node's own Cloudflare zone, never overwriting | — |
| `/api/domain/state` | GET | state of the own-domain connection: what is done and what is next | — |
| `/api/domain/static-copy` | GET, POST | list and refresh the Cloudflare copy of every node address | — |
| `/api/health` | GET | report liveness and which build of this application answers | — |
| `/api/i18n/translate` | POST | translate one record's fields without exposing the model key | — |
| `/api/me` | GET | tell the browser who is signed in and with which roles | — |
| `/api/media-proxy/[...path]` | GET | proxy media files the browser cannot reach directly | — |
| `/api/media/[id]/file` | GET | stream one stored media file to the visitor | — |
| `/api/media/icons/[setId]/file/[name]` | GET | stream one generated application icon from its set | — |
| `/api/media/upload` | POST | upload a file into the platform media store | — |
| `/api/node/a2a` | GET | find which node element can do a job and where | — |
| `/api/node/a2a-log` | GET, POST | write and read the log of agent-to-agent calls between node elements | — |
| `/api/node/a2a-log/pin` | POST | pin one agent conversation so the log keeps it | — |
| `/api/node/attention` | GET | list open element terminals and previews waiting for the architect | — |
| `/api/node/automation` | GET, POST | read and switch the cron automation of an element in its passport | — |
| `/api/node/catalog` | GET, POST | the node elements catalog for the All projects tab | — |
| `/api/node/deploy` | GET, POST | list node elements with pending changes and start their deployment | — |
| `/api/node/element-docs` | GET | read one development document of a WEB4 ITEM | — |
| `/api/node/element-orders` | GET | list the order summaries one WEB4 ITEM saved | — |
| `/api/node/elements` | GET | list every element of the node with its role and power | — |
| `/api/node/first-task` | GET, POST, DELETE | keep the first task from the root home for the main agent | — |
| `/api/node/github-backup` | GET, POST | report and create the GitHub repositories of every element | — |
| `/api/node/machine` | GET | describe this computer: machine, memory per element, comparison with the super-node profile | — |
| `/api/node/messenger-settings` | GET, POST | read and save an element's messenger settings in its passport | — |
| `/api/node/needs` | GET, POST | keep the capability requests of the node elements | — |
| `/api/node/official` | GET, POST, DELETE | read save or drop the node's official mark application draft | — |
| `/api/node/online` | GET | ask Cloudflare whether the node's site is online right now | — |
| `/api/node/origin` | GET | tell how far this node's fork is behind the original | — |
| `/api/node/own-service-props` | GET | read an element passport through its door with the node key | — |
| `/api/node/passport` | GET | list every element of the node as a passport card | — |
| `/api/node/payments` | GET, POST | read and save the payment settings of an element in its passport | — |
| `/api/node/place` | GET, POST | read or set where this node stands | — |
| `/api/node/power` | GET, POST | turn an element of the node on or off | — |
| `/api/node/preview-url` | GET | tell the address where an element of this node can be previewed | — |
| `/api/node/product-quiz` | GET | read the product quiz of a WEB4 ITEM | — |
| `/api/node/product-quiz/pdf` | GET | print the product quiz of a WEB4 ITEM as a PDF file | — |
| `/api/node/projects` | GET | list every WEB4 ITEM with its state and last commit | — |
| `/api/node/rea` | GET, POST | read REA status in the core and start its one-time install | — |
| `/api/node/reach` | GET, POST | measure and connect a service's address on the node's own domain | — |
| `/api/node/review-inbox` | POST | element agent leaves a self-review finding about something outside it | — |
| `/api/node/site-rules` | GET | check a site's robots.txt and find its terms before analysis | — |
| `/api/node/state` | GET | report how this node is reachable and whether it is walled off | — |
| `/api/node/stripe` | GET, POST | read which Stripe keys are set and save checked new ones | — |
| `/api/node/studies` | GET | list an element's studies with notes and ledger counts | — |
| `/api/node/study` | GET, POST | list test accounts for analysis, open a login window, end one | — |
| `/api/node/study/consent` | GET, POST | the consent page of a test account login window | — |
| `/api/node/super-node` | GET, POST | read the super node application and settings and change them | — |
| `/api/node/super-node/remote` | GET | read one part of the super node server through its operator API | — |
| `/api/node/type` | GET, POST | the node type: a single project or an app factory | — |
| `/api/node/users/[[...path]]` | — | list, edit and anonymize node users through the auth element | — |
| `/api/node/wallet` | GET, POST, DELETE | manage the node or element wallet and its key backup | — |
| `/api/node/web4` | GET, POST | put an element into the Web4 network or take it out | — |
| `/api/openai-models` | GET | list the live model names this key can actually use | — |
| `/api/project-types/[lang]/[id]` | GET | describe one project direction for the home page window | — |
| `/api/revalidate` | POST | rebuild public pages after the owner changes app settings | — |
| `/api/services` | GET | report which service blocks this node carries and on which ports | — |
| `/api/settings/changed` | POST | take the Design element signal and re-style the core pages | — |
| `/api/transcribe` | POST | turn a recorded voice fragment into written text | — |
| `/api/users` | GET | list user accounts from the auth service for the administration page | — |
| `/api/users/[id]` | PATCH | change the roles of one user account through the auth service | — |

## Как этим пользоваться

- **Ищете, куда писать данные?** Читайте столбец «что делает», а не имена папок: адрес говорит, где
  маршрут лежит, имя — что он делает, и это разные вопросы.
- **Заводите свой маршрут?** Первой строкой файла — `// @api <6–12 слов>`, затем `npm run build:api-map`.
- **Адрес не переименовывают ради красоты.** URL — публичный контракт: он в браузере, в журналах и в
  чужих интеграциях. Меняется имя в заголовке, оно ничего не ломает.
