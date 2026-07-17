# Pi Agent compatibility and pre-release checklist

**Status: MANUAL VALIDATION PENDING.** Issue #43 must remain open and no release may be published until every applicable manual item below passes in the dedicated test vault:

```text
/Users/xcad/Obsidian/ObsidianTesting
```

Do not place source changes or test fixtures in that vault. Its plugin files should point to a development build from this repository.

## Automated checks

From this repository (not from the test vault):

```bash
npm ci
npm run ci
npm run test:pi -- /Users/xcad/Obsidian/ObsidianTesting
```

`test:pi` is opt-in. It starts Pi RPC with `--offline --no-tools --no-session`, keeps normal extension discovery enabled for compatibility coverage, disables skills, prompt templates, themes, context files, and project approval, then reads state/models/commands. It sends no model prompt or provider request and therefore incurs no model-provider charge.

## Install the development build

```bash
npm run build
npm run dev:install -- /Users/xcad/Obsidian/ObsidianTesting/.obsidian/plugins/pi-agent
```

Then open `ObsidianTesting`, reload or disable/re-enable Pi Agent, and keep the developer console visible.

## Pi setup and compatibility

- [ ] **Pending:** Run **Pi Agent: Check Pi installation** and confirm Pi is at least 0.80.0 (last tested: 0.80.6).
- [ ] **Pending:** Point **Pi executable path** at a missing executable and an older/fake version; confirm actionable missing, runtime, and upgrade diagnostics, then restore it.
- [ ] **Pending:** Confirm required unsupported RPC commands fail with a capability/upgrade diagnostic and optional capability probes use only their declared fallback.
- [ ] **Pending:** Refresh settings and confirm no unhandled console errors.

## Models and thinking

- [ ] **Pending:** Open the model picker; search by friendly name, provider, and raw model ID.
- [ ] **Pending:** Confirm Pi's configured default, authenticated provider models, and custom `models.json` entries resolve correctly.
- [ ] **Pending:** Switch models and confirm only supported thinking levels appear, including `xhigh`/`max` where supported, and the model default is restored on switch.
- [ ] **Pending:** Send a short prompt and confirm response metadata identifies the selected provider/model and thinking state.

## Persistent RPC, cancellation, retry, and compaction

- [ ] **Pending:** Send two prompts in one chat; confirm process reuse, conversation continuity, and no duplicated stable instructions/history in each prompt.
- [ ] **Pending:** Use two chats and confirm isolated histories and Pi sessions.
- [ ] **Pending:** Cancel a long response promptly, then send again successfully in the same chat.
- [ ] **Pending:** Terminate the Pi subprocess; confirm a visible failure and clean restart on the next send.
- [ ] **Pending:** Trigger/simulate a transient retry; confirm retry start/end activity and cancellation of retry.
- [ ] **Pending:** Run `/compact` and `/compact keep decisions and file names`; verify completion, session continuity, and context usage becoming unknown until fresh usage arrives.

## Tool modes, resources, and extensions

Use disposable files only.

- [ ] **Pending:** Chat mode exposes no Pi tools.
- [ ] **Pending:** Review permits read/search/list but not edit/write/bash.
- [ ] **Pending:** Edit permits read/search/list/edit/write but not bash.
- [ ] **Pending:** Full agent permits a harmless `pwd` plus disposable read/edit/write operations.
- [ ] **Pending:** Test global, project, package, and configured skills; global/project prompt templates; and an extension command from `get_commands`.
- [ ] **Pending:** Confirm `/skill:name` and prompt templates are expanded exactly once by Pi.
- [ ] **Pending:** In an untrusted directory, confirm project resources remain unavailable until Pi trust is explicitly granted.
- [ ] **Pending:** Review a trusted extension before enabling it; confirm its tools follow the plugin's mode policy.
- [ ] **Pending:** Exercise extension UI `select`, `confirm`, `input`, `editor`, `notify`, `set_editor_text`, `setStatus`, and `setWidget`, including cancel/error paths.

## Context, local queue, and native Steer now

Create an active note with frontmatter, headings, tags, wikilinks, backlinks, and non-sensitive content.

- [ ] **Pending:** Verify current-note and selected-text context plus `@note`, `#tag`, `/search`, `/backlinks`, `/links`, and `/context show`.
- [ ] **Pending:** Confirm ignored folders do not enter attached context and autocomplete reflects Pi's command discovery.
- [ ] **Pending:** Confirm there is no persistent steer/follow-up selector in settings or the composer.
- [ ] **Pending:** While a run is active, submit several text and image messages; confirm they enter the visible local follow-up queue by default and can be safely reordered, edited/retrieved, or removed.
- [ ] **Pending:** Promote any pending item once with **Steer now**; confirm it leaves the local queue, reaches Pi after the current assistant turn/tool batch, and is never delivered twice.
- [ ] **Pending:** Let the active run settle and confirm every unpromoted item starts once, in order, as a normal follow-up prompt.
- [ ] **Pending:** Exercise abort, transient failure/retry, compaction, and thread switching with queued text/images; confirm the visible Pi/local state never loses, duplicates, or assigns an item to the wrong thread.

## Images

Use non-sensitive PNG, JPEG, and WebP files.

- [ ] **Pending:** Attach by picker, clipboard paste, and drag/drop; remove a preview before sending.
- [ ] **Pending:** Send image-only and text-plus-image prompts to an image-capable model.
- [ ] **Pending:** Confirm a text-only model blocks images clearly.
- [ ] **Pending:** Confirm unsupported formats and files over 20 MB are rejected and image data is not retained unexpectedly.

## Sessions, favorites, and archive

- [ ] **Pending:** Create, rename, switch, favorite/unfavorite, archive/restore, and fork chats; verify ordering and independent continuation.
- [ ] **Pending:** Toggle the keyboard-accessible favorite in the active-chat header and thread-list row; confirm both stay synchronized.
- [ ] **Pending:** Use **Archive all chats** and verify the confirmation gives the correct count, running chats are refused/skipped, the result notice is accurate, and no Pi session file is deleted.
- [ ] **Pending:** Open Pi session info; verify path, messages, tokens, and cost are plausible.
- [ ] **Pending:** Inspect original/fork JSONL with Pi and confirm valid session trees and portable plugin-relative references.
- [ ] **Pending:** Copy/sync to a differently located test vault and confirm references do not retain the prior absolute vault path.
- [ ] **Pending:** Test **Delete chat only** and **Delete chat and Pi session**; confirm only the selected file inside `pi-sessions` can be deleted.

## Thinking, activity, and run controls

- [ ] **Pending:** Stream reasoning and confirm the existing live activity preview expands automatically without duplicating final-answer text.
- [ ] **Pending:** On completion, confirm a collapsed **Thinking** disclosure appears immediately before its answer when reasoning exists and preserves the user's expansion state.
- [ ] **Pending:** Confirm there is no standalone **Tools** badge/button or permanent ordinary tool argument/result panel; concise current tool status may appear only in live activity.
- [ ] **Pending:** Trigger a tool error and confirm it remains visible and actionable without exposing values whose keys contain token, secret, password, API key, or authorization.
- [ ] **Pending:** Exercise idle Send, active-run queue, Cancel, and Canceling states; confirm they are visually distinct and usable in compact layouts.

## Note annotations

- [ ] **Pending:** Confirm one **Annotations** action appears in every Markdown view, indicates pick mode, and accepts an existing exact selection or a source/reading-mode block by click or Enter.
- [ ] **Pending:** Verify accent-color target highlighting in source and reading modes, light and dark themes, without moving to an ambiguous duplicate quote.
- [ ] **Pending:** In the **Annotations** modal, exercise labelled context, Change/Question intent, validation, keyboard operation, cancel, and focus restoration.
- [ ] **Pending:** Use the responsive bottom-right per-note list to navigate, edit, and delete; confirm UI cleanup on file/view changes and plugin unload.
- [ ] **Pending:** Reload and edit around targets; confirm UTF-16 ranges re-anchor only on unique high-confidence matches, ambiguous/missing targets remain detached, and malformed/oversized records are normalized or bounded.
- [ ] **Pending:** Rename and delete notes; confirm persisted records move or are retained/cleaned safely without modifying note content or frontmatter.
- [ ] **Pending:** Send a normal prompt, queued follow-up, and promoted steer; confirm every path includes all active-note attached/detached annotations as bounded structured context while visible chat text remains unchanged.
- [ ] **Pending:** Run `/context show`; confirm it reports annotation counts without leaking quote or context text.

## Links, rendering, and accessibility

> **Native navigation diagnostic:** A File Explorer failure is not evidence of a Pi-rendered-link bug. Reproduce it again with Pi Agent disabled, perform a full Obsidian reload, and retain the Developer Console error/stack plus the exact Notice text before attributing the failure to this plugin.

- [ ] **Pending:** With Pi Agent enabled, test an existing and newly created note from File Explorer, Quick Switcher, a native `[[wikilink]]`, and a Pi message; capture console and Notice evidence for any failure.
- [ ] **Pending:** Disable Pi Agent, fully reload Obsidian, repeat every failing native File Explorer/Quick Switcher/wiki-link case, and record whether the failure remains.
- [ ] **Pending:** Verify headings, lists, tables, code, blockquotes, emphasis, aliases, relative links, links with spaces/case differences, heading/block references, and external HTTPS links.
- [ ] **Pending:** Click internal links normally and with Ctrl/Cmd; confirm expected leaf behavior, one navigation per click, and no unsafe external scheme opens.
- [ ] **Pending:** Keyboard-test model, thinking, queue/Steer now, activity, image, thread, favorite/archive-all, annotation, and message controls with visible focus and useful labels.
- [ ] **Pending:** Test narrow/wide sidebars, light/dark themes, retry errors, and empty/loading states.

## Release gate

- [ ] **Pending:** `git status` contains only intended source, tests, docs, generated bundle, and styles.
- [ ] **Pending:** `npm run ci` passes from a clean install.
- [ ] **Pending:** The complete manual checklist above passes in `ObsidianTesting`.
- [ ] **Pending:** Open issues are updated with actual validation results but remain open until explicitly accepted.
- [ ] **Pending:** Version files and release artifacts remain unchanged until a separate release-preparation task.
