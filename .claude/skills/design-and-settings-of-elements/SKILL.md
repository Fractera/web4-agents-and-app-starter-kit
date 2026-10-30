---
name: design-and-settings-of-elements
description: "Both natures. Where the look (colours, fonts, shapes) and the site settings (name, description, menu, footer, cookie banner, feature switches) of an element are changed: in the shared Design and CONFIG of the node, or on the element's own pages. Load it when the person asks to change the colours, a font, the title, the menu, «hide sign-in», «turn on the footer» of an element, or asks where its design or settings are."
---

# Design and settings of elements

**Process: both** — you change nothing yourself; you tell the person where to change it, in two or three lines.

A hint, not a law: models of late 2026 work worse under rigid step-by-step instructions.

Run `npm run look -- <id>` — it reads the element's links to the shared Design and CONFIG and prints the page for each:

- **link on** (a single project): the shared Design or CONFIG in the core changes it for every element that follows it;
- **link off** (an app factory, or an element set apart): the element's own pages — `<its site>/<lang>/admin/design` (fonts, colours,
  type, shapes) and `<its site>/<lang>/admin/site-settings` (with the sections features, header, footer, cookie banner). In the core they
  open from «Build → Design» and «Build → Site settings» of a custom element, and of root.

A saved value redraws the pages with no build; only languages need a deploy of the element. A native element has no pages of its own:
its look and settings come from the shared Design and CONFIG. A look the settings cannot express (a new token, a new setting) is code —
hand it to the element's agent (`route-to-element`). Turning a link on or off is the person's choice, on the element's «Settings →
Danger zone».
