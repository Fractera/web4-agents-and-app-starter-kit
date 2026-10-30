# ANTI-PATTERNS — dead ends this node has already paid for

Read «All systems» and the section of your operating system **before a core rebuild, before moving or renaming folders, before work with
processes, ports and pm2**. One entry: what happens → why → what to do. «Guard:» names the check that already holds the lesson — then the
entry is a reminder, not a duty. A new entry is written after a measured failure, never as a precaution, with the sign that would have
warned earlier. The section stays short: a lesson that a guard or the code now holds for good may leave it.

## All systems

- **The core rebuild closes the lid.** `npm run serve:rebuild` stops every node process except the tunnels (the sites answer from their
  Cloudflare copies), moves `WEB4-ITEMS` aside during `next build` (a big neighbour inside the build root costs gigabytes) and keeps the old
  `.next` outside the project to return it if the build fails. Run `npm run prebuild` alone first — a guard failing at minute ten costs ten
  minutes offline. The main agent is a child of the core: the rebuild ends its session, the person wakes it again.
- **«Built» is `builtAt`, not `commit`.** `/api/health` → `commit` is the commit the process started on; `builtAt` is when the build was made.
  After a rebuild also count the page's `/_next/static/*` files that do not answer 200 — a site without a single style still answers 200.
- **The exit code of a build is npm's.** `npm run build | tail` prints tail's 0. Log to a file and take `RC=$?` right after npm.
- **esbuild and `next dev` do not check types.** A new `.mjs` that a TypeScript door imports: run a narrow `tsc` over the changed files before a
  build (a default `= null` becomes the type `null` — give it a JSDoc `@param`).
- **A module a door imports takes only relative `require('./…')`.** `require(path.join(process.cwd(), …))` breaks Turbopack with dozens of
  errors. Guard: `check:agent-kits`.
- **A child of the core's Next server inherits `__NEXT_PROCESSED_ENV`, `NEXT_*`, `PORT`** and then never reads its own `.env.local`. Every
  pm2 or npm call from a script that a door can run gets a cleaned environment.
- **pm2 keeps a process's environment.** A variable removed from the config stays in the live process; `--update-env` does not remove it —
  `pm2 delete` and `pm2 start`.
- **Alive is not answering.** pm2 says `online` while every page is 500. A watcher asks the capability over HTTP and is patient (a cold start
  takes up to 40 s); a dependency on someone else's service is asked about the service, not about its process.
- **A heavy synchronous call inside a door stops the whole site,** and the watcher restarts the core in the middle of it. In a door — only
  asynchronous work; a big folder is renamed into a trash and deleted without waiting.
- **Guards read the git index.** A new file is invisible to `git ls-files` until `git add`: run guards after `git add`, before the tag. A tag is
  never moved — a broken release gets the next patch. Guard: `npm run template -- release`.
- **A `.gitignore` line without a leading slash** hides that name at every depth (`icons/` once hid a template's own files). A root folder is
  `/icons/`. After a commit on a new template tag, compare the template's file list with the tag.
- **One file of a shared registry.** `git add` of `WEB4-ITEMS-REGISTRY/web4-items.json` carries the node's state into git; a pin is committed
  through its own index. Guard: `npm run template -- pin|rollout`.
- **A Claude Code check inside an element's folder** (`claude -p …`) runs without
  `--settings {"enabledPlugins":{"telegram@claude-plugins-official":false}}` only at a price: the Telegram plugin fails without a token, and the
  machine-wide cache of MCP failures silences the channel in every session for 15 minutes.
- **Waking an agent whose folder Claude Code does not trust** stops on the trust question, and the bridge sends that question to the person in
  Telegram. Look at `~/.claude.json` (`hasTrustDialogAccepted` of that folder) before a «free» probe.
- **`--add-dir` takes a list:** every argument after it up to the next flag. The task given last disappears into it. Put it first, followed by
  another flag; check the agent's screen (`npm run agent:screen -- <id>`), not the wake door's answer.
- **A pasted `/model` saves the model as the person's default for new sessions.** Switch a node session's model by restarting it with
  `--continue --model` (`npm run session -- model …`). A session woken without a single message then resumes its folder's previous conversation.
- **A «session end» hook does not run when the bridge kills the session.** A writer that must not lose anything is the Stop hook.
- **Search by meaning always returns the nearest neighbour.** «Nothing found» needs a similarity threshold or a filter, never a nonsense query.
- **A probe of an element on a spare port subscribes to CONFIG and Design with its own port** and steals the live element's signals: run it
  with `CONFIG_SERVICE_URL` and `DESIGN_SERVICE_URL` empty.
- **A document that names a path is checked from the place that reads it.** A path inside a file a hook reads is relative to that file, not to
  the process; a relative data path of a standalone server ends up inside the build and dies with the next build — data paths are absolute.

## Windows

- **A folder some process works in cannot be renamed** (EPERM) — that includes a terminal that once did `cd` into it and a background search
  over the node (`grep -r .`). Before moving folders or a rebuild: no background command reads the node's folders; ask the person about open
  terminals and Explorer windows inside `WEB4-ITEMS`.
- **node does not start `.cmd` or `.bat` without a shell** (EINVAL, silently). `npm` and `pm2` from code — `shell: true` on Windows only and
  only with constant arguments.
- **Every process a background service starts needs `windowsHide: true`,** or a console window blinks over the person's screen.
- **PowerShell 5.1 writes UTF-8 with a BOM** (`Out-File`, `>`, `Set-Content -Encoding utf8`); `JSON.parse` fails and a reader's `catch` returns
  its default as if the file were absent. Strip `^\uFEFF` before parsing any file a person may edit; write test files from node.
- **Git Bash rewrites an argument that looks like a root path** (`/api/x` → `C:/Program Files/Git/api/x`) when it calls a Windows program.
  Normalise it in the receiving program, or set `MSYS_NO_PATHCONV=1`.
- **Backslashes, `$` and backticks pass through a shell badly** (`node -e`, heredocs): `\b` and `\s` vanish, backticks run. Write such a
  script to a file.
- **`grep` in Git Bash lies.** `grep -c $'\r'` counts every line, `grep -P` fails on the locale and reads as 0, `grep -i` does not fold
  Cyrillic case. Count bytes and match text with node; give every search a known positive and a known negative.
- **Under `core.autocrlf=true` a file rewritten with the same text and other line endings shows «M» in `git status`.** Ask whether content
  changed with `git add` and `git diff --cached HEAD`, not with `git status`.
- **The account name** comes from `USERDOMAIN`, not `os.hostname()` (NetBIOS cuts it to 15 characters). Autostart at login is the Startup
  folder: the Task Scheduler needs an administrator.
- **A process's command line quotes an argument only when it has spaces** — a reader of command lines handles both forms.
- **`os.kill(pid, 0)` in Python on Windows ends the process.** Ask the operating system whether a pid is alive.

## macOS

- **Autostart at login is launchd** (a LaunchAgent), not systemd and not a Startup folder. No failure of this node on macOS has been measured
  yet: the first entry here comes from a measured one.

## Linux

- **Outgoing connections take ports 32768–60999** (Windows from 49152): a permanent listener in that range fails unreproducibly. The node's
  ports stay in 24680–25679; 3000 is never taken — the person's own projects live there.
- **Autostart is systemd;** `pm2 startup` needs sudo.
