# Pi Agent compatibility and pre-release checklist

**Status: MANUAL VALIDATION PENDING FOR THE NEXT RELEASE.** Issue #43 must remain open until every applicable manual item below passes in the dedicated test vault:

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

`npm run ci` includes `lint:obsidian:errors`, which runs the official `eslint-plugin-obsidianmd` recommended rules and fails on error-level Community scanner findings. This gate runs on pull requests, pushes to `main`, and again before the release workflow can publish assets. Run `npm run lint:obsidian` separately to inspect the scanner's non-blocking warnings as well.

`test:pi` is opt-in. It starts Pi RPC with `--offline --no-tools --no-session`, keeps normal extension discovery enabled for compatibility coverage, disables skills, prompt templates, themes, context files, and project approval, then reads state/models/commands. It sends no model prompt or provider request and therefore incurs no model-provider charge.

## Install the development build

```bash
npm run build
npm run dev:install -- /Users/xcad/Obsidian/ObsidianTesting/.obsidian/plugins/pi-agent
```

Then open `ObsidianTesting`, reload or disable/re-enable Pi Agent, and keep the developer console visible.

## Pi setup and compatibility

- [ ] **Pending:** Run **Pi Agent: Check Pi installation** and confirm Pi is at least 0.80.0 (last tested: 0.80.7).
- [ ] **Pending:** Point **Pi executable path** at a missing executable and an older/fake version; confirm actionable missing, runtime, and upgrade diagnostics, then restore it.
- [ ] **Pending:** Confirm required unsupported RPC commands fail with a capability/upgrade diagnostic and optional capability probes use only their declared fallback.
- [ ] **Pending:** Refresh settings and confirm no unhandled console errors.

## Models and thinking

- [ ] **Pending:** Open the model picker; search by friendly name, provider, and raw model ID.
- [ ] **Pending:** Confirm Pi's configured model, authenticated provider models, and custom `models.json` entries resolve correctly. Compact model/thinking controls must show only the effective friendly model and thinking names, without a visible `Default` prefix.
- [ ] **Pending:** Confirm recognized OpenAI, Anthropic/Claude, xAI/Grok, Google/Gemini, Mistral, OpenRouter, DeepSeek, Ollama, Meta, Groq, Cohere, Azure, and Bedrock providers receive distinct brand icons/marks in the control and picker; custom providers use the neutral fallback. Switch models and confirm only supported thinking levels appear, including `xhigh`/`max`, and the runtime-configured level is restored on switch.
- [ ] **Pending:** Send a short prompt and confirm response metadata identifies the selected provider/model and thinking state.

## Persistent RPC, cancellation, retry, and compaction

- [ ] **Pending:** Send two prompts in one chat; confirm process reuse, conversation continuity, and no duplicated stable instructions/history in each prompt.
- [ ] **Pending:** Use two chats and confirm isolated histories and Pi sessions.
- [ ] **Pending:** Cancel a long response promptly, then send again successfully in the same chat.
- [ ] **Pending:** Terminate the Pi subprocess; confirm a visible failure and clean restart on the next send.
- [ ] **Pending:** Trigger/simulate a transient retry; confirm retry start/end activity and cancellation of retry.
- [ ] **Pending:** Run `/compact` and `/compact keep decisions and file names`; verify completion, session continuity, and context usage becoming unknown until fresh usage arrives.
- [ ] **Pending:** While Obsidian is focused, complete a run and confirm no desktop notification appears. Then unfocus Obsidian, complete one run, and confirm exactly one generic Pi Agent notification appears without disabling extension commands/tools.
- [ ] **Pending:** Click the completion notification and confirm Obsidian focuses and opens the originating chat. Deny notification permission, where the platform exposes it, and confirm runs still complete without errors or repeated permission prompts.

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

## Native file attachments

- [ ] **Pending:** Confirm the attachment action renders only the paperclip symbol while retaining the accessible **Attach files** label/tooltip, and its native Obsidian menu offers a fuzzy vault-file picker and a local-file picker.
- [ ] **Pending:** Attach PNG/JPEG/WebP files and verify thumbnails and Pi RPC image delivery; verify other images and generic binaries are rejected rather than described as RPC binary support.
- [ ] **Pending:** Attach supported UTF-8 text/code/config files from both sources; verify name, type, size, source, and truncation state, 64 KiB per-file and 192 KiB total limits, and rejection of NUL/binary, invalid UTF-8, PDF, office, and archive files.
- [ ] **Pending:** Inspect the delivered prompt and confirm file text is clearly delimited as untrusted data while the visible user message stays concise.
- [ ] **Pending:** Exercise normal send, queued delivery, retrieve/edit/remove, restart persistence, and **Steer now**; confirm each attachment is delivered exactly once.

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

- [ ] **Pending:** Stream reasoning and confirm the live response disclosure expands automatically without duplicating final-answer text. Markdown such as `**bold**`, lists, links, and code must render inside thinking content.
- [ ] **Pending:** Confirm **THINKING**, **READING**, **EDITING**, and other live status text appears only inside the response disclosure, never beside the **Agent** heading. On completion, confirm a collapsed **THINKING** disclosure appears immediately before its answer when reasoning exists and preserves the user's expansion state.
- [ ] **Pending:** Confirm thinking content uses the same background as the assistant response and only a separator distinguishes it from the answer.
- [ ] **Pending:** Confirm there is no standalone **Tools** badge/button or permanent ordinary tool argument/result panel; concise current tool status may appear only in the live response disclosure.
- [ ] **Pending:** Trigger a tool error and confirm it remains visible and actionable without exposing values whose keys contain token, secret, password, API key, or authorization.
- [ ] **Pending:** Exercise idle Send, active-run queue, Cancel, and Canceling states; confirm they are visually distinct and usable in compact layouts.

## Note annotations

> **CodeMirror singleton regression (#35):** The failure was `Unrecognized extension value in extension set ([object Object]). This sometimes happens because multiple instances of @codemirror/state are loaded, breaking instanceof checks.` The root cause was `main.js` bundling private copies of `@codemirror/state` and `@codemirror/view`, so Obsidian rejected the annotation `ViewPlugin` created by the duplicate runtime whenever any Markdown editor opened.

- [ ] **Pending disabled-plugin baseline:** Disable Pi Agent, fully reload Obsidian, and open several Markdown notes in source and live-preview modes; confirm every editor opens and the exact CodeMirror error above is absent from the Developer Console.
- [ ] **Pending:** Enable Pi Agent, fully reload Obsidian, repeat the same editor-opening cases, and confirm they still open without the exact CodeMirror error. Inspect the installed `main.js` and confirm it requires `@codemirror/state` and `@codemirror/view` from Obsidian rather than containing bundled `node_modules/@codemirror` implementations.
- [ ] **Pending:** Confirm one **Annotations** action appears in every Markdown view, indicates pick mode, and accepts an existing exact selection or a source/reading-mode block by click or Enter. Add several annotations without re-enabling the action; confirm pick mode remains active until Escape, a second action click, or prompt submission.
- [ ] **Pending:** Verify accent-color target highlighting in source and reading modes, light and dark themes, without moving to an ambiguous duplicate quote.
- [ ] **Pending:** In the **Annotations** modal, exercise labelled context, Change/Question intent, validation, keyboard operation, cancel, and focus restoration.
- [ ] **Pending:** Use the responsive bottom-right per-note list to navigate, edit, and delete; confirm UI cleanup on file/view changes and plugin unload.
- [ ] **Pending:** Reload and edit around targets; confirm UTF-16 ranges re-anchor only on unique high-confidence matches, ambiguous/missing targets remain detached, and malformed/oversized records are normalized or bounded.
- [ ] **Pending:** Rename and delete notes; confirm persisted records move or are retained/cleaned safely without modifying note content or frontmatter.
- [ ] **Pending:** Send a normal prompt, queued follow-up, and promoted steer; confirm every path snapshots all active-note attached/detached annotations exactly once as bounded structured context, clears the native selection plus persisted highlights/list before the processing mask starts, and exits pick mode while visible chat text remains unchanged. Verify no annotation underline/background remains nested inside the gray left-to-right accent sweep. Retrieve a queued follow-up and confirm its annotations return to the note and its mask clears.
- [ ] **Pending:** Confirm exact text selections mask only the selected characters in source, live preview, and reading mode. Select from the middle of one paragraph through multiple rendered elements into another paragraph and verify the stored UTF-16 `range.from`/`range.to` spans exactly those source characters while line/ch remains metadata. Multi-line masks must follow text geometry without changing wrapping, spacing, or layout. Add a deliberately misspelled selection and confirm its red spellcheck underline is hidden while masked.
- [ ] **Pending:** Fill enough annotations to scroll the floating list; confirm its header and prominent **Send to Pi** button remain sticky. Send without composer text and verify Change annotations prefer targeted edit calls, Questions receive answers, and the one-shot snapshot/queue behavior remains intact.
- [ ] **Pending:** Compare source mode, live preview, and reading mode: while in pick mode, drag text within and across elements and confirm the rounded element outline disappears during the drag and the annotation dialog opens once on mouse release. After saving, text selections and clicked paragraph/block annotations must all use only the same subtle accent background and underline, with no retained native selection and no left vertical bar. Hovered/focused elements must use a rounded accent outline.
- [ ] **Pending:** After a targeted Change edit, confirm the committed replacement text reveals left-to-right without replaying edits into Obsidian history. Ambiguous replacements should appear normally without an incorrect reveal.
- [ ] **Pending:** Confirm the processing mask clears immediately when the target file changes and also clears when Pi answers without editing, fails, is cancelled, the queued prompt is removed, the view/plugin unloads, or Obsidian restarts. In reduced-motion mode confirm the mask remains static gray without animation.
- [ ] **Pending:** During an Edit or Full agent run, let Pi change the currently open Markdown note; confirm every open split of that note reloads from the vault automatically without a manual close/reopen and retains the existing scroll-restoration behavior.
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
- [x] Release-candidate files are aligned at `0.0.11`; no tag or GitHub release is created until final confirmation.
