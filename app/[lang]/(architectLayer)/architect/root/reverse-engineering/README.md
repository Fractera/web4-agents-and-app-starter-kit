# `/architect/root/reverse-engineering`

«Reverse engineering» of the root element (node step 594-6) — the same page the elements of the tree have under «Product design →
Reverse engineering» (`components/element-docs/reverse-engineering.client.tsx`); root lives in its own static folder, so the page of
the tree never reaches it.

- The cards «Site address», «Page N», «Add another page»; «Start reverse engineering» opens on the right the terminal of root's own
  agent with the task «Build process, study: …» — the bridge starts the study pass by these words (`lib/agent-kit/modes.cjs`).
- Below — the studies of root: the folders of `WEB4-ITEMS/<kind>/root/study/`, read by the door `GET /api/node/studies?item=root`
  (architect or admin): file count, size, date, the first lines of the agent's `notes.md`, whether a bundle was exported, the counts of
  REA's ledger. Nothing of the studied site leaves the folder.
- The voice key link goes to the core's environment page: root has no environment page of its own in the core.
- The card «Use reverse engineering» on the core's entry page (`_i18n/architect-home.i18n.ts`) leads here.
