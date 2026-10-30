# lib/instructions/element — the sealed instruction of every element

One source, `element-instruction.src.md`, gives `CLAUDE.md` to the three templates (custom, native, root) and to every element of the node.
Sections 1–10 are common and sealed: each repository carries `scripts/check-instruction.mjs` (copied from this folder) and
`scripts/instruction.seal`, and its `prebuild` refuses a changed common part. Section 11 «This element» is the element's own; section 12
«Evolution» holds its entries. Line labels of the source pick the variant: `@C` custom · `@N` native · `@Y` the element has `npm run
need` · `@R` it does not yet · `@T` every element.

It moved here from the federal development folder in federal step 621-4 (2026-10-30); the federal folder is no longer used.

## When
Only by the owner's word: sections 1–10 are fixed, and a change reaches every element of every node.

## How
1. Edit `element-instruction.src.md`.
2. `npm run instruction:element -- coverage` — every name the templates' current `CLAUDE.md` gives is still in the new text.
3. The templates: `npm run template -- clone <custom|native>` (working clones in `data/workshop/`), then
   `npm run instruction:element -- templates --dry`, then without `--dry`; commit in each workshop clone and release it
   (`npm run template -- release …`, `pin …`) — skill `release-template`. Root's own folder is the root template.
4. The elements: `npm run instruction:element -- element WEB4-ITEMS/<core|user>/<folder> --dry`, then without `--dry` — the common part
   plus the element's own section 11, word for word. Check it:
   `node lib/instructions/element/verify-elements.mjs WEB4-ITEMS core/<folder> …` → `===ELEMENTS_OK===`.
5. Publish each element: `npm run template -- rollout <kind> <pinned template tag> --elements <id> --also CLAUDE.md,scripts/instruction.seal
   --message "…"` — one commit of those files, its next patch tag, the push and the pin.
6. `npm run node:readiness` — every repository, one line each.

## Proven by
Federal step 621-4: from this folder `templates --dry` and `element --dry` over all twelve elements gave «nothing to change» (the move
changed nothing), `coverage` — `===COVERAGE_OK===`, `verify-elements` — `===ELEMENTS_OK===`; one changed line of the source made
`element … --dry` report `CLAUDE.md, scripts/instruction.seal`.
