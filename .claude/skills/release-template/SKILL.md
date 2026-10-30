---
name: release-template
description: "Build process. Release a new version of an element template (custom or native) and roll its files out to the node's elements: a working clone in the core's workshop, the template's whole prebuild, a tag on GitHub, the pin in the core, then the same files into every element of that kind with its next patch tag and pin. Load it only when the owner asks to change a template or to bring a template's change into the existing elements; never on your own initiative."
---

# Release a template and roll it out to the elements

**Process: build** — templates, elements and the core change on GitHub; every release and pin is a commit.

A hint, not a law: models of late 2026 work worse under rigid step-by-step instructions. The laws below are not hints.

## When
Only by the owner's word: «change the custom template so that …», «bring X into all native elements». A template is what every new
element of every node is born from — a change here reaches people you will never see. Name what changes and in which repositories,
and wait for the owner's «yes» before the first commit.

## How (commands of the core)
1. `npm run template -- clone <custom|native> --install` — a working clone in `data/workshop/<repository>` on `main` (outside the core's
   git), with `npm ci`; `npm run template -- status <kind>` shows it against the pin.
2. Edit in the workshop and commit there in English (the person's words only inside quotes). Files a release generates (a tree
   snapshot, a map) — regenerate and commit too: a release stops when its own prebuild changes a file.
3. `npm run template -- release <kind> <vX.Y.Z> --dry` — every prebuild guard one by one; then the same without `--dry` with
   `--message "<what changed>"`: annotated tag, `main` and the tag to GitHub with the node's token.
4. `npm run template -- pin <kind> <vX.Y.Z>` — the core's pin, one file in one commit through its own index; then `git push origin main`.
5. Existing elements do not change by themselves. To bring files in: `npm run template -- rollout <kind> <vX.Y.Z> <path…> --dry`, read
   the list, then without `--dry`. `--keep-own-rows <previous tag>` keeps an element's own rows of a Markdown table (anti-patterns);
   `--also <path>` adds a file the element itself already changed; `--elements a,b` narrows it. Each element gets one commit of only
   those paths, its next patch tag, a push, and its pin; the node's state in the element stays uncommitted.
6. `npm run node:readiness` — every repository of the node, one line each; a `✗` names its reason.

## Laws (each was paid for)
- A tag is never moved; a broken release gets the next patch. Guards run after `git add` — they read the index.
- A pin commits only its own file: someone's staged work and the node's state never ride along.
- A change of an element's code needs that element rebuilt (`npm run services:install -- --only <id>` — the id, not the address);
  documents and skills do not.
- Instructions of elements are generated, never edited by hand in an element: the generator and the sealed source live in the core.
- No force push. lagrix and other elements outside the template's kind — only when the owner names them.
- Without write access the release stops at the dry push with `===TEMPLATE_NO_RIGHT===` — say so, do not look for another key.
