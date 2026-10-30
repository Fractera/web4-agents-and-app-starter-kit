---
name: blocks-of-the-node
description: "Both natures. Where the blocks (designed, reusable sections of pages) of this node live and who builds them, by the node's mode. Load it when the person asks for a section of a page (a hero, a comparison, pricing, questions), asks where the blocks are, which blocks an element has, why a new block needs a build, or wants a block built, changed or reused; and before you pass any page or design task to an element."
---

# Blocks of the node

**Process: both** — you change nothing yourself; you tell the person where the blocks are and hand the work to the element whose agent
builds it (skill `route-to-element`). Two or three lines.

A hint, not a law: models of late 2026 work worse under rigid step-by-step instructions.

## What a block is, and why it matters to the person

A block is a designed section of a page that lives in an element as code (`components/blocks/` of that element) and is named by the page
data as many times as the pages need. It enters an element ONCE — and that time is code, so the element is built (beside the running
version, switched in seconds). After that every page made of blocks the element already has is page data: a new page, other words, another
order — no build. Say it to the person in these words when they ask why one change needs a build and another does not.

## Where they are

- Every element has its own blocks and its own page of them: `<the element's site>/<lang>/admin/blocks` — a table by sections (hero,
  benefits, pricing …, all fourteen, empty ones too), a page per section and a Preview of one block. In the core it opens from
  «Build → Blocks» of an element whose link to the shared Blocks is off.
- The element **blocks** (the Blocks element) is the shared catalogue of the node: its home page `<blocks site>/<lang>#showcase` lists
  every published block and sample with a Preview, by sections.

## Who builds a block — the node's mode decides

- **One owner (`project`).** The element's agent first finds a block in the shared catalogue and takes it into its element
  (`npm run blocks -- find`, `add` — skill `use-blocks` of the element); a different look for one element is a copy under its own name.
  Nothing fits → a request to the Blocks element, whose agent builds the block; then the element's agent takes it.
- **App factory (`factory`).** The shared catalogue is not used — the apps belong to different owners. The element's agent builds the
  block inside its own element and reuses it on any of its pages.

Read the mode with `npm run node-type` (or the person changes it: skill `node-type`).

## How to hand it on

A request about a section of a page of element X goes to X's agent (`npm run task -- <id> "<the person's words>"` or its terminal), never
to you: it knows its pages and its blocks. A request to change a block of the shared catalogue goes to the agent of **blocks**.
Design work is the design pass of that element (node step 590-5): the task opens with «Build process, design:» —
`npm run task -- <id> "Build process, design: <the person's words>"`; the node starts the session of that pass with its own skills.
The design skill of the whole project (one owner) is chosen in «Design», section «Design skill of the project»; an element's agent reads
which applies with `npm run design-skill` (node step 590-6).
