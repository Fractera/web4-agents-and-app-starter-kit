# 545 — A critical audit of the element passports and the node registry as one orchestra (open: 545-4, 545-5)

Moved from the federal development layer in federal step 621-6 (2026-10-30), when the node took over its own development; the
federal history of the step stays in that layer's archive on the old development machine and is not needed to go on.

## Where it came from — the owner, 2026-10-19, verbatim
«Теперь мне нужна твоя мышление потому что я хочу чтобы мы с тобой имея уже полное понимание того каким мы создали наши файлы синхронизации а именно: – own-service-props для каждого элемента – объединяющие групповой для всех в корне. Отнестись бы к этим файлом с максимально критическим анализом чтобы понять насколько их текущий архитектура, насколько их текущая связь с инструкцией каждого из этих элементов и инструкции корня позволяет им действовать как единый оркестр…»

Read the files that synchronise the node — each element's passport (`OWN-SERVICE-PROPS/`) and the registry
(`WEB4-ITEMS-REGISTRY/`) — together with the instructions of the core and the elements, and judge whether they let the node work as
one orchestra: a task in the core's terminal finds the element that can do it or creates one; an element knows its role and its
neighbours; native and custom differ in the whole architecture; buying in Lagrix comes before building; tens and hundreds of elements do
not flood the context. The result is a foundation document for the next rework of the templates and the core.

## Done (2026-10-19)
545-1 measured the map «field → writer → reader» of passports and registry; 545-2 walked five scenarios through files and doors;
545-3 collected the primary sources (Claude Code memory and skills, A2A, MCP). Much of what they found was built afterwards: the main
agent in the core and the element boundary (548), search by role and by meaning and the duplicate stop in `npm run create` (548-6,
603-2), the protocols i2i · a2a · f2f in the instructions (552 and later).

## Open
- **545-4 — how agents decide.** The method is the owner's, 2026-10-19, verbatim:
  «Ты понимаешь что ты не можешь это делать сам внутри себя? У тебя уже целая куча инструкций загружена. Напомню тебе как мы делали тестирование навыков всегда и что я ожидал от тебя. У нас есть Telegram для каждого агента ты управляешь этим телеграмм, у него есть интерфейс какой-то там через него ты отправляешь запрос так как будто бы это тот самый агент который там работает ему короткие задаешь вопросты его проверяешь если бы надо было сделать и этот то какие бы навыки ты вызвал понимаешь?»
  Short questions to a working element agent through its own Telegram, asked by the owner; you prepare the questions and read the
  answers. A cold `claude -p` run is not the method.
- **545-5 — the foundation document:** a verdict per scenario, the target design, the list of changes in order, the price in tokens.

## Only by the owner's word
Live runs spend the owner's subscription; price them as «requests × growing context» (one run of 39 turns on 2026-10-19: 176 463 new
tokens and 5 823 749 read from cache). Nothing starts without his word with the price named.
