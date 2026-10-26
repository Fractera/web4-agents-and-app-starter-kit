// РЕЖИМЫ СЕССИИ АГЕНТА ЭЛЕМЕНТА (узел, шаг 552-4). Одно место, которое знает: какое первое слово у запроса какого процесса, какие
// группы навыков видит сессия каждого режима и под каким ключом она живёт. Зовут мост комплекта (`_agent-kit/server/bridge.cjs`,
// при запуске сессии и пробуждении) и прибор `npm run check:modes` — второго списка групп нет нигде.
//
// Владелец 2026-10-20 (552): «разделить процессы и протестировать что они не пересекаются гарантировать что при работе режиме
// строительства не вызываются навыки мессенджера и навыки рабочего процесса»; и о первом слове: «каждый из этих процессов может
// отправлять первое слово: процесс строительства задача…». План 552-4а — «Подтвердить 552-4а (Рекомендую)»; конец сессии
// рабочего процесса — «Узел закрывает её сам (Рекомендую)».
//
// 🔒 Группа — плагин Claude Code `<группа>@skills-dir` (проба 552-1): сессия режима получает `enabledPlugins` своего набора в
// `--settings`; навыки выключенной группы для неё не существуют («Unknown skill»). `own-service-props-skills` — обнаружение, во
// всех режимах. Вендорные навыки (корень `.claude/skills`, рядом `SOURCE.md`) нужны строительству (по имени — это пишет
// `scripts/element-isolate.mjs`), в остальных режимах выключены.
// 🔒 Только у элемента с группами (есть `.claude/skills/build-skills/.claude-plugin/plugin.json`): остальные элементы, главный
// агент и службы ядра живут как прежде — одна сессия, без слова, без файлов режима.
// 🔒 Ключ сессии: строительство — id элемента (как всегда: его читают Telegram, страница терминала, «закончил»), рабочий процесс
// — `<id>--work` (двери `/api/agents/*` пропускают только `[a-z0-9-]`). «Messenger:» до шага 552-6 идёт в сессию строительства:
// Telegram живёт там.
const { existsSync, readdirSync, readFileSync, writeFileSync, mkdirSync } = require('node:fs')
const path = require('node:path')

const WORDS = { build: 'Build process:', work: 'Working process:', messenger: 'Messenger:' }
const COMMON = 'own-service-props-skills'
const GROUPS = { build: ['build-skills'], work: ['workspace-skills'], messenger: ['messenger-skills'] }
const ALL = ['build-skills', 'workspace-skills', 'messenger-skills', COMMON]
const WORK_SUFFIX = '--work'

// ПРОХОДЫ СТРОИТЕЛЬСТВА (узел, шаг 590-5). Владелец 2026-10-23: «работа с дизайном, и работа с текстами не должна происходить
// одновременно с Обще стадией разработки … сначала создаем дизайн для работы с блоками,. Затем сбрасываем контекст строим проект с этими
// блоками. Затем сбрасываем контекст работаем с текстом»; 2026-10-25, переключение — «Да, командой агента (Рекомендую)».
// 🔒 Проход — свойство сессии строительства (ключ прежний — id элемента: Telegram, «закончил», страница терминала не меняются); он
// выбирается словом запроса при рождении сессии, другой проход — новая сессия, то есть сброс контекста. Тяжёлый вендорный навык включён
// только в проходах из строки `Pass:` своего `SOURCE.md` — второго списка нет. Навык без строки (элемент шаблона до 590-5) живёт как
// прежде: включён во всём строительстве.
// 🔒 Субагент не годится (первоисточник Claude Code, sub-agents и skills, прочитан 2026-10-25): у субагента нет AskUserQuestion, он не
// видит разговора и отдаёт только итог, а дизайн и тексты идут кругами с человеком; сессия прохода держит тяжёлый навык один раз.
// 594-3 (владелец 2026-10-25: разборы REA — «внутри каждого элемента», агент «чувствует себя в ней как дома»; план 594 — «Подтвердить,
// /clear и делать»): четвёртый проход — разбор чужого продукта (study). Навык REA вендором включён только в нём (строка `Pass: study` его
// SOURCE.md), законы — `.claude/modes/build-study.md`; модель — старшая, как у всего строительства.
const PASSES = ['main', 'design', 'texts', 'study']
const PASS_WORDS = { design: 'Build process, design:', texts: 'Build process, texts:', study: 'Build process, study:' }
// 570 (закон владельца 2026-10-22): тексты — Sonnet, код (и блоки дизайна — это код) — старшая модель подписки.
const PASS_MODEL = { main: 'opus', design: 'opus', texts: 'sonnet', study: 'opus' }

/** Разложены ли навыки элемента по группам (шаг 552-2) — только у таких сессия живёт по режимам. */
function hasGroups(dir) {
  return Boolean(dir) && existsSync(path.join(dir, '.claude', 'skills', 'build-skills', '.claude-plugin', 'plugin.json'))
}

/** Режим по первому слову запроса или `null`, если слова нет. Сравнение без регистра и без ведущих пробелов. Слово прохода — строительство. */
function modeOfText(text) {
  const head = String(text ?? '').trimStart().toLowerCase()
  for (const word of Object.values(PASS_WORDS)) if (head.startsWith(word.toLowerCase())) return 'build'
  for (const [mode, word] of Object.entries(WORDS)) if (head.startsWith(word.toLowerCase())) return mode
  return null
}

/** 590-5: проход строительства по первому слову — `design`, `texts`, `main` («Build process:») или `null` (слова нет). */
function passOfText(text) {
  const head = String(text ?? '').trimStart().toLowerCase()
  for (const [pass, word] of Object.entries(PASS_WORDS)) if (head.startsWith(word.toLowerCase())) return pass
  return head.startsWith(WORDS.build.toLowerCase()) ? 'main' : null
}

/** 590-5: задача без первого слова — пустая строка значит «родить сессию прохода без поручения» (ноль токенов). */
function taskOfText(text) {
  const t = String(text ?? '').trimStart()
  const word = [...Object.values(PASS_WORDS), ...Object.values(WORDS)].find((w) => t.toLowerCase().startsWith(w.toLowerCase()))
  return (word ? t.slice(word.length) : t).trim()
}

/** Запрос с первым словом своего процесса: слово уже стоит — как есть, нет — ставится впереди. */
function withWord(text, mode) {
  const t = String(text ?? '')
  return modeOfText(t) ? t : `${WORDS[mode]} ${t}`
}

/** В какую сессию идёт режим: до 552-6 у мессенджера своей сессии нет — Telegram живёт в строительстве. */
const sessionMode = (mode) => (mode === 'work' ? 'work' : 'build')
const sessionKey = (id, mode) => (sessionMode(mode) === 'work' ? `${id}${WORK_SUFFIX}` : id)
const baseOf = (key) => String(key ?? '').replace(new RegExp(`${WORK_SUFFIX}$`), '')
const modeOfKey = (key) => (String(key ?? '').endsWith(WORK_SUFFIX) ? 'work' : 'build')

/** Группы, которые видит сессия режима: свои плюс обнаружение. */
const visibleGroups = (mode) => [...GROUPS[mode], COMMON]

/** Вендорные навыки элемента — папки в корне `.claude/skills` с `SOURCE.md`. */
function vendored(dir) {
  const base = path.join(dir, '.claude', 'skills')
  if (!existsSync(base)) return []
  return readdirSync(base, { withFileTypes: true })
    .filter((d) => d.isDirectory() && existsSync(path.join(base, d.name, 'SOURCE.md')))
    .map((d) => d.name)
}

/** 590-5: проходы каждого вендорного навыка из строки `Pass:` его `SOURCE.md`; строки нет — `null` (живёт как до 590-5). */
function vendoredPasses(dir) {
  const out = {}
  for (const name of vendored(dir)) {
    let line = null
    try {
      line = /^Pass:\s*(.+)$/m.exec(readFileSync(path.join(dir, '.claude', 'skills', name, 'SOURCE.md'), 'utf8'))?.[1] ?? null
    } catch { /* SOURCE.md есть — иначе навыка не было бы в списке */ }
    // Проходы — слова до тире: «Pass: main, design — components: …» (пояснение после тире прохода не включает).
    out[name] = line ? line.split(' — ')[0].split(/[\s,;]+/).map((p) => p.toLowerCase()).filter((p) => PASSES.includes(p)) : null
  }
  return out
}

/**
 * Настройки сессии режима для `claude --settings`: группы своего режима и обнаружения включены, остальные выключены; вне
 * строительства вендорные навыки выключены, в строительстве — включены только в проходах своей строки `Pass:` (590-5).
 * `extraPlugins` — например, канал Telegram выключен у сессии без бота (548-20).
 */
function modeSettings(dir, mode, extraPlugins = {}, pass = 'main') {
  const on = new Set(visibleGroups(mode))
  const enabledPlugins = Object.fromEntries(ALL.map((g) => [`${g}@skills-dir`, on.has(g)]))
  // ✗ Замерено живьём 552-4а (Haiku, сессия 7779380e): на «Unknown skill» агент прочёл SKILL.md чужой группы инструментом Read —
  // выключенная группа была закрыта для инструмента Skill и открыта для чтения файлом. Поэтому папки чужих групп сессии — `deny`
  // на чтение и правку (пути — от папки элемента, рабочей папки сессии).
  const foreign = ALL.filter((g) => !on.has(g)).map((g) => `./.claude/skills/${g}/**`)
  const out = { enabledPlugins: { ...enabledPlugins, ...extraPlugins }, permissions: { deny: foreign.flatMap((p) => [`Read(${p})`, `Edit(${p})`]) } }
  // 590-5: выключенный вендорный навык закрыт и инструменту Skill (`skillOverrides`), и чтению файлом — тот же урок 552-4а.
  const off = Object.entries(vendoredPasses(dir)).filter(([, passes]) => mode !== 'build' || (passes && !passes.includes(pass))).map(([n]) => n)
  if (off.length) {
    out.skillOverrides = Object.fromEntries(off.map((n) => [n, 'off']))
    out.permissions.deny.push(...off.flatMap((n) => [`Read(./.claude/skills/${n}/**)`, `Edit(./.claude/skills/${n}/**)`]))
  }
  return out
}

/** Одна фраза системной подсказке сессии (`--append-system-prompt`): агент знает процесс своей сессии; инструкция режима — файлом, `promptArgs` (552-5). */
// ✗ Замерено прогоном навыков 552 (Haiku, 6fde83c1, 1d4e4da0): с общей фразой «не делай здесь» сессия строительства на «Working
// process: напомни…» сама написала первой строкой «Рабочий процесс» — и расписала работу. Поэтому правило — проверкой своей же первой
// строки и готовым ответом.
const PASS_NAMES = { main: ['', ''], design: [' — design', ' — дизайн'], texts: [' — texts', ' — тексты'], study: [' — study', ' — разбор'] }

function sessionNote(mode, pass = 'main') {
  // Повод отказа — только чужое первое слово запроса: обычный вопрос без слова в терминале сессия обслуживает, хотя по закону
  // шаблона «любой вопрос, кроме как строить», — рабочий процесс (иначе «кто ты?» в «Строительстве» получил бы отказ).
  const work = sessionMode(mode) === 'work'
  const [en, ru] = PASS_NAMES[pass] ?? PASS_NAMES.main
  const own = work ? '«Working process» («Рабочий процесс»)' : `«Build process${en}» («Строительный процесс${ru}»)`
  const foreign = work ? '«Build process:» or «Messenger:»' : '«Working process:» or «Messenger:»'
  const other = work
    ? 'a build request belongs to the core\'s «Build → Terminal» of this element, a messenger request to Telegram'
    : 'a working-process request belongs to the core\'s «Working process → Terminal» of this element, a messenger request to Telegram'
  // 590-5: сессия строительства знает свой проход; работа другого прохода — переключением (`npm run pass`), не здесь.
  const passRule = work
    ? ''
    : ` This build session runs the ${pass} pass (.claude/modes/build.md, «Passes»): design work belongs to the design pass, texts to the texts pass, a study of someone else's product to the study pass, everything else to the main pass. ` +
      'Work of another pass is never done here: write current-step.md, then switch with npm run pass -- <main|design|texts|study> "<the request>".'
  return `This session of the element's agent is ${own}${work ? '' : '; messages from Telegram also come here until the messenger gets its own session'}. ` +
    `A request that opens with ${foreign} is not for this session. Then your whole answer is one or two lines: the first line is ${own}, ` +
    `the next says that this session does not do it and where it belongs: ${other}. Do not do, plan or describe that work and do not open its files. ` +
    `Any other request, a plain question too, is answered here as usual.${passRule}`
}

/** 552-5: инструкция режима элемента — `.claude/modes/build.md` или `.claude/modes/work.md`; файла нет — `null` (элемент до 552-5). */
function modeFile(dir, mode) {
  const file = path.join(dir, '.claude', 'modes', `${sessionMode(mode)}.md`)
  return existsSync(file) ? file : null
}

/**
 * 552-5: аргументы системной подсказки сессии. Есть файл режима — фраза сессии и файл режима одним файлом
 * `<outDir>/<key>.md` через `--append-system-prompt-file` (переписывается при каждом запуске); нет — прежняя фраза строкой.
 * Владелец 2026-10-20 (план 552-5): «Подтвердить (Рекомендую)» — общая часть в CLAUDE.md, законы режима приходят с сессией.
 * Файлом, а не строкой: файл строительства ≈14 тыс. знаков, а командная строка Windows вместе с первым поручением (до 20 тыс.)
 * упёрлась бы в предел 32 767.
 */
function promptArgs(dir, mode, outDir, key, pass = 'main') {
  const note = sessionNote(mode, pass)
  const file = modeFile(dir, mode)
  // 590-5: проход дизайна и проход текстов несут свой файл законов после законов строительства (`.claude/modes/build-<проход>.md`).
  const passFile = sessionMode(mode) === 'build' && pass !== 'main' ? path.join(dir, '.claude', 'modes', `build-${pass}.md`) : null
  const passText = passFile && existsSync(passFile) ? readFileSync(passFile, 'utf8').replace(/\r\n/g, '\n') : ''
  const soul = soulText()
  if (!file && !soul) return ['--append-system-prompt', note]
  mkdirSync(outDir, { recursive: true })
  const out = path.join(outDir, `${key}.md`)
  // 595-9в: the memory's self-description after the soul and the session's phrase (both stay first — 591, 552-5, `check:modes`).
  writeFileSync(out, [soul, note, memoryText(mode), file ? readFileSync(file, 'utf8').replace(/\r\n/g, '\n') : '', passText].filter(Boolean).join('\n\n'))
  return ['--append-system-prompt-file', out]
}

// 595-9в (owner 2026-10-26: «Чтобы ты чётко понимал прямо при пробуждении как работает твоя память …»; window: «Да, подшагом 595-9в
// (Рекомендую)»): the memory describes itself right after the soul — only in sessions that have it (the main agent, build sessions); a
// working-process session has none. One file, memory/memory.md: when the deep memory (596–597) is built, one line changes there.
function memoryText(mode) {
  if (sessionMode(mode) === 'work') return ''
  try {
    return readFileSync(path.join(__dirname, 'memory', 'memory.md'), 'utf8').replace(/\r\n/g, '\n').trim()
  } catch {
    return ''
  }
}

/**
 * 591 (владелец 2026-10-24: «создать душу проектах … две части … вокруг миссии»): одна душа узла — `soul.md` рядом с этим файлом —
 * идёт ПЕРВОЙ в системную подсказку каждой сессии, которую запускает узел: элемента с группами (перед законами режима), элемента без
 * групп и главного агента. Копий в элементах нет: все сессии запускает мост ядра, и правка одного файла доходит до всех, включая
 * элементы, которых ещё нет. Системная подсказка — а не CLAUDE.md, который приходит сообщением (документация Claude Code, memory).
 */
function soulText() {
  try {
    return readFileSync(path.join(__dirname, 'soul.md'), 'utf8').replace(/\r\n/g, '\n').trim()
  } catch {
    return ''
  }
}

/** 591: сессия без групп навыков (главный агент, элемент старого шаблона) — в системной подсказке душа (595-9в: и самоописание памяти). */
function soulArgs(outDir, key) {
  const soul = soulText()
  if (!soul) return []
  mkdirSync(outDir, { recursive: true })
  const out = path.join(outDir, `${key}.md`)
  writeFileSync(out, [soul, memoryText(modeOfKey(key))].filter(Boolean).join('\n\n'))
  return ['--append-system-prompt-file', out]
}

// 594-4 (владелец 2026-10-25: «Командная строка, MCP по замеру»): замер показал нужду — пакет журнала обязательств из нескольких записей
// собирает только сессия MCP REA (`export_evidence_bundle`), командная строка склеек не делает, ручная склейка «not canonical». Поэтому у
// прохода study — сервер MCP REA из копии ядра, только на эту сессию (`--mcp-config`; у остальных проходов его нет). Цена названа: 229
// инструментов, Claude Code по умолчанию откладывает их (на старте — только имена, ≈4,8 КБ; документация Claude Code, MCP tool search), схемы
// ответов выключены родной настройкой REA (`REA_MCP_OUTPUT_SCHEMA_PROFILE=off`: 3,5 МБ → 0,3 МБ описаний), процесс ≈120–340 МБ на время
// сессии. 🛑 `--mcp-config` забирает список значений, как `--add-dir`: вызывающий ставит его перед другим флагом.
function reaMcp(dir, mode, outDir, key, pass) {
  if (sessionMode(mode) !== 'build' || pass !== 'study') return null
  if (!existsSync(path.join(dir, '.claude', 'skills', 'reverse-engineer-anything', 'SOURCE.md'))) return null
  const entry = path.join(process.cwd(), 'data', 'tools', 'rea', 'node_modules', 'rea-agents', 'scripts', 'rea.mjs')
  if (!existsSync(entry)) return null
  mkdirSync(outDir, { recursive: true })
  const file = path.join(outDir, `${key}-mcp.json`)
  writeFileSync(file, JSON.stringify({ mcpServers: { rea: { command: process.execPath, args: [entry, 'mcp'], env: { REA_MCP_OUTPUT_SCHEMA_PROFILE: 'off' } } } }, null, 2))
  return file
}

// 595-4 (owner 2026-10-25: «если тебя спрашивают мнение или если ты сам определяешь планирование новой задачи то ты всегда сверяя с той
// частью памяти которой хранит навыки других проектов»): the skills memory of the node as the tool skills_find — a server of the core
// (`lib/agent-kit/skills/mcp.mjs`) for every session the architect talks to: the main agent and build sessions; a working-process session
// (orders of other agents) does not get it. Measured 595-1: at start a session holds only the tool's name; the process takes about 46 MB.
function skillsMcp(mode, outDir, key) {
  if (sessionMode(mode) === 'work') return null
  const entry = path.join(process.cwd(), 'lib', 'agent-kit', 'skills', 'mcp.mjs')
  if (!existsSync(entry)) return null
  mkdirSync(outDir, { recursive: true })
  const file = path.join(outDir, `${key}-skills-mcp.json`)
  writeFileSync(file, JSON.stringify({ mcpServers: { 'node-skills': { command: process.execPath, args: [entry] } } }, null, 2))
  return file
}

// 595-5: Claude Code keeps an agent's native memory under ~/.claude/projects/<its folder path> — a moved node or a renamed element
// (343) loses it silently. Every session of the node gets autoMemoryDirectory = data/services/<id>/memory (the main agent's id is
// build): node data outside git, inside the session's own --add-dir (548-7), so writing a memory asks nothing. Measured 595-1: the
// setting is honoured from --settings (/context «Memory files»).
function memoryDir(element) {
  const dir = path.join(process.cwd(), 'data', 'services', element, 'memory')
  try { mkdirSync(dir, { recursive: true }) } catch { return null }
  return dir
}

// 595-6: the node's diary — after every answer (Stop) and at the end of a session (SessionEnd) the hook copies the person's words and
// the agent's answers from the session log into data/node/memory/episodes, without a model. Only for sessions the architect talks to:
// a working-process session (other agents' orders) keeps no diary of the architect.
// 595-7: the first second — at the start of a new session (`startup`, not /clear) the same sessions get what the node remembers of the
// person (`brief.cjs`): the main agent its last exchange and note, an element the main agent's picture of the person and its own last
// exchange. Before the first request, without a model.
// 595-8: associations — before every message of the person the same sessions get up to three related findings of the diary
// (`recall.cjs`; the main agent — the whole diary, an element — its own rows). Measured in a real session: ≈ 0.12–0.19 s per message.
// The readers (SessionStart, UserPromptSubmit) run in exec form — node itself with the script as an argument, no shell (Claude Code docs,
// hooks, «Exec form and shell form»; measured: SessionStart 841 → 513 ms without Git Bash). The diary's writers stay in shell form (`node`
// and a path without spaces, inside the --settings JSON): the bridge ends a session by killing its pty, and in a probe on an idle session
// only the shell-form SessionEnd hook survived that (✗ exec form died with Claude Code; mid-request SessionEnd did not fire at all).
// SessionEnd hooks share a 1.5 s budget unless a hook names a longer timeout (same docs): the diary's last copy gets 10 s.
function memoryHooks(element, mode) {
  if (sessionMode(mode) === 'work') return null
  const dir = path.join(process.cwd(), 'lib', 'agent-kit', 'memory')
  const script = (name) => path.join(dir, name).replace(/\\/g, '/')
  if (!existsSync(script('record.cjs'))) return null
  const write = { type: 'command', command: `node ${script('record.cjs')} ${element}` }
  const read = (name) => ({ type: 'command', command: process.execPath, args: [script(name), element] })
  const hooks = { Stop: [{ hooks: [write] }], SessionEnd: [{ hooks: [{ ...write, timeout: 10 }] }] }
  if (existsSync(script('brief.cjs'))) hooks.SessionStart = [{ matcher: 'startup', hooks: [read('brief.cjs')] }]
  if (existsSync(script('recall.cjs'))) hooks.UserPromptSubmit = [{ hooks: [read('recall.cjs')] }]
  return hooks
}

function mcpArgs(dir, mode, outDir, key, pass = 'main') {
  const files = [reaMcp(dir, mode, outDir, key, pass), skillsMcp(mode, outDir, key)].filter(Boolean)
  return files.length ? ['--mcp-config', ...files] : []
}

// 569-3 (владелец 2026-10-22: повторная оптимизация главного агента): папка агента может назвать свои встроенные инструменты Claude Code
// файлом `.claude/launch-tools.txt` (одна строка, через запятую). Описания остальных инструментов не уходят в каждый запрос: замер — первый
// запрос главного агента 18 104 → 12 786 токенов. Нет файла — набор Claude Code по умолчанию, как прежде.
function launchTools(dir) {
  try {
    const line = readFileSync(path.join(dir, '.claude', 'launch-tools.txt'), 'utf8').trim()
    return /^[A-Za-z]+(,[A-Za-z]+)*$/.test(line) ? line : null
  } catch {
    return null
  }
}

// 570 (закон владельца 2026-10-22: «написание текста это всегда модель Sonnet, а генерация кода то есть режим строительства это всегда
// максимальная модель»; максимальная в подписке — Opus, best/Fable требует платных кредитов): модель сессии — при её запуске. Папка агента
// может назвать свою файлом `.claude/launch-model.txt` (главный агент — sonnet: он пишет текст, код строят элементы); иначе сессия
// рабочего процесса — sonnet, строительства (и Telegram, подключённый к ней) — opus.
const MODEL = { build: 'opus', work: 'sonnet' }
function launchModel(dir, mode, pass = 'main') {
  try {
    const own = readFileSync(path.join(dir, '.claude', 'launch-model.txt'), 'utf8').trim()
    if (/^[a-z][a-z0-9.-]*$/.test(own)) return own
  } catch { /* своего нет */ }
  // 590-5: у прохода своя модель (тексты — sonnet).
  return sessionMode(mode) === 'build' ? (PASS_MODEL[pass] ?? MODEL.build) : MODEL[sessionMode(mode)]
}

module.exports = { WORDS, GROUPS, COMMON, ALL, PASSES, PASS_WORDS, PASS_MODEL, sessionNote, modeFile, promptArgs, mcpArgs, memoryDir, memoryHooks, soulText, soulArgs, hasGroups, modeOfText, passOfText, taskOfText, withWord, sessionMode, sessionKey, baseOf, modeOfKey, visibleGroups, vendored, vendoredPasses, modeSettings, launchTools, launchModel, MODEL }
