---
name: answer-element
description: "Work skill. An element of this node asks how the node works — the wake text «Element <id> asks about the node's architecture: «…»». Find the answer in the core's instruction by its words, read only that section, and answer the element in at most 10 lines with npm run task -- <id> \"Answer from the core to «<question>»: …\". The only case where you read a file of the core."
---

# Answer an element's question about the node

**Process: working** — nothing changes in git: you read one section and answer.

A hint, not a law: models of late 2026 work worse under rigid step-by-step instructions.

1. Two to four English words of the question (the core's instruction is English):
   `grep -n -i "<word>" ../../CLAUDE.md | head -20` — the line numbers show the section.
2. Read only that section: `sed -n '<from>,<to>p' ../../CLAUDE.md` — tens of lines, the file is about 24 thousand
   characters, eight sections: role, context, building blocks, scenarios, modes, laws, glossary, where the details are.
3. Answer in at most 10 plain lines — what the node does and which door or command the element uses:
   `npm run task -- <id> "Answer from the core to «<the question>»: …"` — the question goes in: the answer may reach a fresh
   session that never asked. Only what you read; a path or a door you did not see is not named.
4. Nothing found → `npm run task -- <id> "Answer from the core to «<the question>»: the core's instruction does not say …; ask your architect."`
5. Never `.env.local`, never an element's files, never a change; then `npm run done -- --close`: an element's question woke you,
   and a running agent holds the person's memory.
