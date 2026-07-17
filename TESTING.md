# Testing

Use a dedicated test vault. Do not test Edit or Full agent mode against important notes.

## Markdown annotations (#46)

- [ ] In an active Markdown note, create annotations from an editing-mode selection, an editing-mode block pick, a reading-mode selection, and a reading-mode block pick.
- [ ] Run **Pi Agent: Add or toggle annotation for active note** from the command palette; verify it is unavailable without an active Markdown note and matches the header action otherwise.
- [ ] Verify unsupported/generated reading content, selections spanning blocks, stale rendered blocks, detached anchors, and unavailable rendered source blocks show clear notices.
- [ ] Edit annotation text/intent, navigate in both modes, cancel an individual delete, then confirm it; verify the note text is unchanged.
- [ ] Modify text before an anchor, modify/remove the anchor, undo, rename/move the note, delete it, reopen it, switch modes, close a split, and disable/re-enable the plugin. Verify attached/detached state and cleanup remain correct with no cross-split highlights.
- [ ] Open two splits of the same note and two different notes; verify actions, pick mode, lists, and highlights remain scoped to the owning leaf.
- [ ] Send a prompt with the note active and inspect context; verify current annotations are attached, detached status is explicit, and annotation/context budgets truncate excessive data safely.
- [ ] Reach per-note, total-record, and storage-size limits with fixture data; verify loading truncates safely and create/update failures explain the limit without corrupting saved data.
- [ ] Test keyboard-only operation: header/command entry, block targeting with Enter, modal focus, radio controls, save/cancel, list actions, and delete confirmation. Verify labels and live updates with a screen reader.
- [ ] Test light/dark themes, a narrow split, 200% zoom, and reduced-motion mode. Verify text remains readable, controls do not overlap, and navigation does not smooth-scroll when reduced motion is requested.
- [ ] Put HTML/script-like text in the note and annotation context. Verify it renders only as text and annotation content is not written to the developer console.
- [ ] Inspect plugin data and a synced test vault to confirm annotation records are plaintext JSON as disclosed in `PRIVACY.md`; verify deletion removes the intended record.
