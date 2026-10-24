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

/** Разложены ли навыки элемента по группам (шаг 552-2) — только у таких сессия живёт по режимам. */
function hasGroups(dir) {
  return Boolean(dir) && existsSync(path.join(dir, '.claude', 'skills', 'build-skills', '.claude-plugin', 'plugin.json'))
}

/** Режим по первому слову запроса или `null`, если слова нет. Сравнение без регистра и без ведущих пробелов. */
function modeOfText(text) {
  const head = String(text ?? '').trimStart().toLowerCase()
  for (const [mode, word] of Object.entries(WORDS)) if (head.startsWith(word.toLowerCase())) return mode
  return null
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

/**
 * Настройки сессии режима для `claude --settings`: группы своего режима и обнаружения включены, остальные выключены; вне
 * строительства вендорные навыки выключены. `extraPlugins` — например, канал Telegram выключен у сессии без бота (548-20).
 */
function modeSettings(dir, mode, extraPlugins = {}) {
  const on = new Set(visibleGroups(mode))
  const enabledPlugins = Object.fromEntries(ALL.map((g) => [`${g}@skills-dir`, on.has(g)]))
  // ✗ Замерено живьём 552-4а (Haiku, сессия 7779380e): на «Unknown skill» агент прочёл SKILL.md чужой группы инструментом Read —
  // выключенная группа была закрыта для инструмента Skill и открыта для чтения файлом. Поэтому папки чужих групп сессии — `deny`
  // на чтение и правку (пути — от папки элемента, рабочей папки сессии).
  const foreign = ALL.filter((g) => !on.has(g)).map((g) => `./.claude/skills/${g}/**`)
  const out = { enabledPlugins: { ...enabledPlugins, ...extraPlugins }, permissions: { deny: foreign.flatMap((p) => [`Read(${p})`, `Edit(${p})`]) } }
  if (mode !== 'build') out.skillOverrides = Object.fromEntries(vendored(dir).map((n) => [n, 'off']))
  return out
}

/** Одна фраза системной подсказке сессии (`--append-system-prompt`): агент знает процесс своей сессии; инструкция режима — файлом, `promptArgs` (552-5). */
// ✗ Замерено прогоном навыков 552 (Haiku, 6fde83c1, 1d4e4da0): с общей фразой «не делай здесь» сессия строительства на «Working
// process: напомни…» сама написала первой строкой «Рабочий процесс» — и расписала работу. Поэтому правило — проверкой своей же первой
// строки и готовым ответом.
function sessionNote(mode) {
  // Повод отказа — только чужое первое слово запроса: обычный вопрос без слова в терминале сессия обслуживает, хотя по закону
  // шаблона «любой вопрос, кроме как строить», — рабочий процесс (иначе «кто ты?» в «Строительстве» получил бы отказ).
  const work = sessionMode(mode) === 'work'
  const own = work ? '«Working process» («Рабочий процесс»)' : '«Build process» («Строительный процесс»)'
  const foreign = work ? '«Build process:» or «Messenger:»' : '«Working process:» or «Messenger:»'
  const other = work
    ? 'a build request belongs to the core\'s «Build → Terminal» of this element, a messenger request to Telegram'
    : 'a working-process request belongs to the core\'s «Working process → Terminal» of this element, a messenger request to Telegram'
  return `This session of the element's agent is ${own}${work ? '' : '; messages from Telegram also come here until the messenger gets its own session'}. ` +
    `A request that opens with ${foreign} is not for this session. Then your whole answer is one or two lines: the first line is ${own}, ` +
    `the next says that this session does not do it and where it belongs: ${other}. Do not do, plan or describe that work and do not open its files. ` +
    `Any other request, a plain question too, is answered here as usual.`
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
function promptArgs(dir, mode, outDir, key) {
  const note = sessionNote(mode)
  const file = modeFile(dir, mode)
  const soul = soulText()
  if (!file && !soul) return ['--append-system-prompt', note]
  mkdirSync(outDir, { recursive: true })
  const out = path.join(outDir, `${key}.md`)
  writeFileSync(out, [soul, note, file ? readFileSync(file, 'utf8').replace(/\r\n/g, '\n') : ''].filter(Boolean).join('\n\n'))
  return ['--append-system-prompt-file', out]
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

/** 591: сессия без групп навыков (главный агент, элемент старого шаблона) — в системной подсказке только душа. */
function soulArgs(outDir, key) {
  const soul = soulText()
  if (!soul) return []
  mkdirSync(outDir, { recursive: true })
  const out = path.join(outDir, `${key}.md`)
  writeFileSync(out, soul)
  return ['--append-system-prompt-file', out]
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
function launchModel(dir, mode) {
  try {
    const own = readFileSync(path.join(dir, '.claude', 'launch-model.txt'), 'utf8').trim()
    if (/^[a-z][a-z0-9.-]*$/.test(own)) return own
  } catch { /* своего нет */ }
  return MODEL[sessionMode(mode)]
}

module.exports = { WORDS, GROUPS, COMMON, ALL, sessionNote, modeFile, promptArgs, soulText, soulArgs, hasGroups, modeOfText, withWord, sessionMode, sessionKey, baseOf, modeOfKey, visibleGroups, vendored, modeSettings, launchTools, launchModel, MODEL }
