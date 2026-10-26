# The architect layer — how to rebuild it from nothing

**Read this first if the layer looks broken, empty, or half-deleted.**

This file exists for one scenario: an agent deletes the pages — by mistake, or
because a task said "remove these sections" and it took the sentence too far. The
pages are the cheap part. What must survive is everything else, and this file is
the proof that it can be restored without guessing.

> **Division of labour, so two documents never drift apart.** `lib/collection/README.md`
> explains the MECHANISM — how a folder becomes a page anywhere in the project.
> This file explains THIS LAYER — its skeleton, what must never be deleted, and
> how to rebuild the pages on top of that skeleton. When the two disagree about
> the mechanism, the primitive's README wins.

## 1. The invariant: pages are disposable, the skeleton is not

Delete every folder under `architect/` and the layer must still compile, still
lock, and still know what it is. These files carry the layer and are **not**
regenerable from anything else:

| File | What dies with it |
|---|---|
| `layout.tsx` | the lock. Without it the layer is open to anyone |
| `_lib/architect-page.tsx` | the one shell: header, breadcrumbs, workspace, warning band |
| `_lib/architect-menu.ts` | the menu built from the generated tree |
| `_lib/collection-page.tsx` | a section renders its own folder |
| `_lib/collection-index.tsx` | a group lists its children |
| `_components/owner-band.client.tsx` | the "no sign-in here" warning |
| `_i18n/architect-layer.i18n.ts` | words shared by every page of the layer |
| `_i18n/architect-home.i18n.ts` | the words of the entrance page |
| `architect/page.tsx` | the entrance. Without it `/{lang}/architect` is a 404 |

Everything else — every group folder, every section folder, every
`_list.generated.ts` — is rebuildable from this document plus the primitive's
README.

🛑 **`_list.generated.ts` is not a source file and not a loss.** It is rewritten
by `node lib/parser-fs.mjs` on every `prebuild` and `predev`. It IS committed to
git deliberately (the architecture must be readable on a fresh clone without
building), which makes it look editable. It is not: the next build overwrites it.

🔒 **Deleting all pages is survivable, and that is verified, not assumed.** This
document was tested by removing every folder under `architect/`: the nine files
above survived, `node lib/parser-fs.mjs` left a root list that is empty rather
than stale, and the project compiled with a layer that simply has no pages.

✗ **Both halves of that were broken when first tested, and the fix is why it now
holds.** The generator only ever WROTE, so an obsolete list survived naming five
folders that no longer existed and the build died on an import — the very document
meant to rescue the situation made things worse by sounding certain. Then, once
deletion was added, the root list vanished too, and the skeleton that imports it
stopped compiling. Hence the rule the generator now follows: **a nested list is
deleted when its folder has no pages; the root's list always exists, even empty.**

## 2. Multilingual: where words live and why there

Two rules, and they do not overlap.

**Words of ONE page live in that page's folder.** `_data/en.ts` is the base and is
mandatory; `_data/ru.ts` and any other language are overrides. A language we do
not have falls back to `en`, so a missing translation degrades to a readable page
instead of a hole. Nothing about a page's wording lives outside its folder.

**Words shared by EVERY page live in `_i18n/architect-layer.i18n.ts`** — the layer
name, the group heading over the menu, the "content is coming" line, the label of
a link in an index, and the whole no-sign-in warning. The shape is
`Record<lang, Ui>`, and it must stay that shape: `check-i18n` does not understand
a pair of `const EN` / `const RU` and silently reports "0 languages".

🔒 **Two languages — and since step 255 that is true of the WHOLE application, not
of this layer alone.** The owner's decision of 2026-09-20 cancelled the
82-language rule here: `en` is the base, `ru` is the override, everywhere. What
used to make this layer special is now the standard, so a page of this layer and a
page of the public layer are shaped identically — which is the point, in the
owner's own words: «минимальный достаточный набор, чтобы создать идеальный
паттерн».

🛑 **This is enforced, not remembered.** `scripts/check-content.mjs` fails the
build on a `_data` cell for a language that is not enabled (`lang-extra-cell`) and
on a dictionary that declares one (`lang-extra-dict`). It walks the tree instead
of holding a list, because a page arrives as a FOLDER and a hand-kept list would
never learn about it — the lesson of 236-1. The one exclusion is
`config/translations/language-metadata.ts`, the catalogue of languages the product
can offer; the reason stands in the guard's own header.

🛑 **No comments inside a language cell.** `en.ts` and `ru.ts` carry text and
nothing else. A law about the MECHANISM goes into `_data/index.ts` beside the
type; the reason a sentence is worded a certain way goes into the step record.
Written once per cell, one law becomes N copies that drift apart silently.

🛑 **Never inline a language check** (`lang === 'ru' ? … : …`). It defeats the
fallback, hides from the guard, and has to be found by hand in every file the day
a third language arrives.

## 3. The four shapes of a file in this layer

Rebuilding means producing these four, in this order. Each is small on purpose:
if a file here is long, something that belongs elsewhere has moved in.

### 3.1 A section page — the thin entry

```tsx
import { CollectionPage } from '../../../_lib/collection-page'
import { data } from './_data'

export default async function Page({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params
  return <CollectionPage lang={lang} dir="/architect/<group>" page={data} />
}
```

It names its own folder and its parent. Nothing else. It does not know the menu,
its group, its neighbours, or its own title.

### 3.2 Its data folder

```ts
// _data/meta.ts   — facts that never translate
export const meta: WorkspacePageMeta = { slug: 'monitoring', order: 30 }

// _data/en.ts     — base language (mandatory)
export const en: WorkspacePageWords = { title: 'Server monitoring' }

// _data/ru.ts     — an override
export const ru: WorkspacePageWords = { title: 'Мониторинг сервера' }

// _data/index.ts  — this file is what makes the folder a page
export const data: WorkspacePageData = { meta, en, overrides: { ru } }
```

`slug` must equal the folder name and `order` is mandatory: these pages have no
date, so without it the menu order would be the alphabet of folder names, and
renaming a folder would reshuffle a menu silently.

### 3.3 A group — the same thing one level up

A group is **not** a special kind of object. It is a page folder that happens to
have children: the same `_data`, plus a `page.tsx` that lists them.

```tsx
import { CollectionIndex } from '../../_lib/collection-index'
import { data } from './_data'
import { PAGES } from './_list.generated'

export default async function Page({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params
  return <CollectionIndex lang={lang} dir="/architect/<group>" page={data} pages={PAGES} />
}
```

That identity is why depth costs nothing: a third level would need no new code,
only folders.

### 3.4 The entrance — the one page that is not a collection page

`architect/page.tsx` is reached by typing the address; no parent lists it. It owns
its own themes (`_i18n/architect-home.i18n.ts`) and gives the workspace a top row
of anchors INTO ITSELF — never a copy of the left menu.

Step 599: its «Basics» is the glossary of the page — entries with a `key`. A word in
any text of the page is written `[[form|key]]`; the page turns it into a hint with
the definition from the glossary (`lib/content/blocks/term.ts`), and
`npm run check:term-hints` fails the build on a key the glossary does not have.
Sections: Start · Basics · Memory (`#memory`) · Evolution (`#evolution`).

## 4. Rebuild procedure, if the pages are gone

1. `node lib/parser-fs.mjs` — stale nested lists are deleted, the root list drops
   to empty. The project compiles again, with a layer that has no pages.
2. Recreate the entrance (3.4) if it is missing: without it the layer reads as
   absent, not as empty.
3. For each group: a folder with `_data` (3.2) and an index page (3.3).
4. For each section: a folder with `_data` (3.2) and a thin page (3.1).
5. `node lib/parser-fs.mjs` again, then `npm run check:architect-routes` and
   `npm run check:i18n`.
6. Build. The menu, the indexes and the routes reappear by themselves — none of
   them is written by hand anywhere.

## 5. Laws that will be silently violated during a rebuild

- **The layer must stay static.** No `cookies()`, `headers()`, or session reads in
  any page or layout here. One such line turns the whole subtree dynamic, the build
  still passes, and the loss shows up much later as search ranking.
  `npm run check:static` is the guard.
- **The lock is the server, not the page.** `AccessGate` in the layout is honest
  signage; whoever returns data must re-check the session itself.
- **`next/link` for page-to-page navigation, a bare `<a>` only for `#anchors`.**
  A bare link between pages reloads the document: white flash, jump to the top,
  re-hydration. This was paid for in step 253.
- **One shell.** If a page needs a layout the shell cannot give, extend the shell —
  a second layout diverges from the first on the next change of spacing.
- **Do not hand-write a list of sections anywhere.** If a list seems necessary, the
  generator is not running: `node lib/parser-fs.mjs`.
