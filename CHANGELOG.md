# Changelog

## Unreleased

- Added a dedicated live **SKILL · name** activity state for explicit `/skill:name` commands and on-demand `SKILL.md` reads, instead of presenting skill loading as generic reading or thinking.
- Added durable per-chat history storage with one frontmatter-identified Markdown file per chat in the configurable vault-relative `chats` folder. Existing `data.json` history receives an optional, resumable migration prompt with a verified recovery backup; new storage removes the silent 40-chat limit, discovers chats directly without a separate index, round-trips editable message bodies through hidden metadata markers, preserves malformed files for recovery, and leaves Pi runtime JSONL sessions separate. (#78)
- Tightened the native thinking disclosure introduced in 0.0.11 with a clearer answer separator, label-aligned thinking content, and reduced Markdown section spacing while preserving expandable Markdown rendering. (#77)

## 0.0.11

- Cleared all Obsidian plugin scanner findings by replacing ambiguous expression chains, adopting popout-safe window/document/timer access, using the configured vault settings directory, adding Obsidian 1.13 searchable settings definitions with a 1.12-compatible renderer, and declaring CodeMirror as build-time-only dependencies while keeping its runtime modules externalized.
- Moved live **THINKING**, **EDITING**, **READING**, and other run activity out of the Agent heading and into the response disclosure; thinking now renders as Markdown, shares the response bubble background, and uses a separator before the answer.
- Added deduplicated native desktop completion notifications for settled runs while Obsidian is unfocused. Notification clicks focus Obsidian and reopen the originating chat without disabling Pi extensions; unsupported or denied notification environments fail gracefully. (#57)
- Fixed open Markdown notes not refreshing after Pi edits by carrying tool arguments from Pi's start event into completion handling, then reloading every open split while preserving scroll position.
- Made the current Markdown note mandatory prompt context while keeping attached files and annotations removable, and clarified that every annotation's Request field drives the targeted change or focused answer.
- Added the Pi Agent banner and logo source assets and displayed the banner at the top of the GitHub README.

## 0.0.10

- Fixed the two error-level Obsidian Community scanner findings by removing a `this` alias from the vault attachment picker and using Obsidian's `setCssProps` helper for dynamic composer height updates.
- Added the official Obsidian ESLint rules as a release gate so future error-level scanner findings fail CI before publication.
- Restricted release versions to the numbers-and-dots format required by Obsidian Community Plugins.

## 0.0.9

- Simplified the composer attachment action to an accessible paperclip-only button. Model and thinking controls now display their resolved runtime names without a `Default` prefix, and recognized model providers use distinct bundled brand icons or compact provider marks with a neutral fallback for custom providers.
- Updated the release toolchain lockfile to patched dependency versions; the release candidate reports zero known npm audit vulnerabilities.
- Made annotations one-shot prompt context: capture mode now remains active across additions until Escape, the annotation button, or prompt submission; submitted annotations are snapshotted for immediate, queued, and Steer delivery and then cleared. Markdown files changed during an agent run now refresh in every open Markdown view while preserving the existing scroll-restoration behavior. (#46)
- Added a transient annotation-processing transition: submitted attached ranges and blocks become gray masks with a left-to-right accent sweep until the target file changes or the owning run settles, with deterministic cleanup for rejection, failure, cancellation, queue retrieval/removal, and reduced motion. Processing masks preserve exact annotated character geometry across words and multi-paragraph rendered selections, suppress spellcheck underlines without changing layout, and reveal confidently resolved replacement ranges after atomic edits. Persisted and native selection marks are cleared before processing starts. A prominent sticky **Send to Pi** action supports annotation-only prompts, targeted-edit guidance avoids unnecessary whole-file writes, and paragraph/text annotations now share one subtle background-and-underline design without vertical bars. Dragged source or reading-mode selections suppress the element outline, open the annotation dialog on release, and discard the native selection after saving so it cannot visually override the shared annotation style. (#46)
- Fixed every Markdown editor failing to open with `Unrecognized extension value in extension set ([object Object]). This sometimes happens because multiple instances of @codemirror/state are loaded, breaking instanceof checks.` by externalizing the directly imported `@codemirror/state` and `@codemirror/view` packages. The annotation `ViewPlugin` now uses Obsidian's shared CodeMirror runtime instead of incompatible copies bundled into `main.js`. (#35)
- Added native file attachments with an **Attach files** paperclip and Obsidian vault/local pickers. PNG/JPEG/WebP remain Pi RPC images; bounded UTF-8 text/code/config files are delivered as explicitly delimited untrusted context, persist safely through normal/queued/Steer delivery, and reject unsupported binary formats. (#59)
- Defined the minimum and last-tested Pi versions, added actionable RPC capability fallback diagnostics and fake-RPC compatibility coverage, and added an opt-in offline smoke command plus a dedicated pre-release test-vault checklist. Manual validation remains pending. (#43)
- Added Markdown annotations for attaching change requests and questions to selections or source-backed blocks in editing and reading views, with resilient anchors, active-note prompt context, accessible controls, bounded local storage, and lifecycle-safe persistence. (#46)
- Replaced the model and thinking pickers with Obsidian-native suggestion modals, pinned the friendly resolved Pi default, and serialized stale runtime catalog/state refreshes so startup, save, restart, and transient Pi failures cannot expose an ambiguous default. (#42)
- Added an ordered, persistent local follow-up queue for active runs with one-shot steering, edit/retrieve/removal controls, separate Pi-native queue status, and safe delivery after settlement. Added PNG/JPEG/WebP picker, paste, and drop attachments with accessible previews, model capability validation, and Pi RPC image payloads. (#40)
- Delegated extension, prompt-template, and skill discovery/expansion to Pi RPC so Pi's resource precedence and project-trust decisions remain authoritative; Full agent keeps extension/custom tools, constrained modes keep explicit built-in allowlists, and extension UI requests now use Obsidian dialogs, notices, status, widgets, titles, and composer text. (#39)
- Removed duplicated local history and repeated durable instructions from each user prompt; stable instructions now load once when the Pi runtime starts. (#38)

- Made Pi RPC the source of truth for runtime models, effective defaults, complete model metadata, and supported thinking levels, including sparse maps and `max`; model and thinking overrides now use RPC commands. (#37)
- Replaced per-prompt JSON subprocesses with persistent, per-chat Pi RPC sessions, including strict JSONL framing, correlated commands, restart/error handling, RPC cancellation, and native compaction. (#36)
- Replaced manual JSONL session forking with Pi RPC cloning; added native session naming, stats, tree/entry access, HTML export, and explicit chat-only versus chat-and-local-session deletion. (#41)
- Improved chat UX with synchronized header/list favorites, guarded bulk chat archiving, integrated live and completed thinking disclosures, concise tool activity/errors, and distinct send, queue, cancel, and canceling controls. (#33)
- Followed up on chat polish with solid non-accent favorite stars, a directly visible Archive all action, and compact native live/completed thinking disclosures without the brain icon; live thinking and inline activity retain their reduced-motion-aware animated text sweep. (#33)

## 0.0.8

- Model list now automatically refreshes from the Pi CLI on every Obsidian startup (silent refresh, no notice). This fixes stale model dropdown after restart. (#31)
- Switched chat message rendering to use Obsidian's native `MarkdownRenderer`. Messages now support code blocks (with syntax highlighting), tables, headings, lists, blockquotes, bold/italic, and native `[[wikilink]]` / markdown links. Streaming responses keep the raw-text live typing effect for responsiveness. Improved CSS for rendered content (tables, code, blockquotes). (#27)

## 0.0.7

- Fixed Windows Pi CLI launch quoting when routing through `cmd.exe` on Node.js 24+ (outer quotes for `/s /c` parsing).
- Improved Windows process termination to reliably kill process trees using `taskkill /T /F` (fixes cancel and cleanup for cmd.exe-wrapped launches).
- Added best-effort Pi CLI warmup (`--version` spawn) on plugin load to reduce first-command cold-start latency on Windows (skipped in dry-run mode).

## 0.0.6

- Fixed Windows Pi CLI launches on Node.js 24+ by routing `pi`/`pi.cmd` through `cmd.exe` without Node's deprecated shell-args path. ([#17](https://github.com/ChristianLempa/obsidian-pi/issues/17))
- Updated CI and release workflows to Node.js 24-compatible GitHub Actions. ([#11](https://github.com/ChristianLempa/obsidian-pi/issues/11))
- Added vault prompt-template support for `.pi/prompts/*.md`, including slash-command discovery and Pi-style template arguments. ([#19](https://github.com/ChristianLempa/obsidian-pi/issues/19))
- Removed the built-in change diff/review feature and its related local snapshot tracking code. ([#13](https://github.com/ChristianLempa/obsidian-pi/issues/13))
- Fixed `context show` / `/context show` so it displays the current Obsidian context inspection without calling Pi. ([#12](https://github.com/ChristianLempa/obsidian-pi/issues/12))
- Added favorite stars for chat sessions with favorite prioritization in the thread list. ([#20](https://github.com/ChristianLempa/obsidian-pi/issues/20))
- Made Pi session references portable across synced vaults by storing local session filenames instead of machine-specific absolute paths. ([#18](https://github.com/ChristianLempa/obsidian-pi/issues/18))
- Fixed the context usage badge so Pi-returned token usage is shown even when the model context window is unknown. ([#12](https://github.com/ChristianLempa/obsidian-pi/issues/12))

## 0.0.5

- Added a Pi executable path setting so custom installs such as nix-darwin can point Obsidian directly at the Pi CLI. (#15, #16)

## 0.0.4

- Added support for finding Pi CLI installations that use the `pi-node` launcher on Ubuntu/Debian systems. Thanks @Hatekaharja! (#10)

## 0.0.3

- Simplified context settings by removing user-facing numeric context/change tracking limits and keeping ignored folders/directories as the visible context/file-access control. (#3)
- Changed pre-attached context to avoid automatic broad prompt searches; Pi now starts from current-note, link/backlink, and explicit attachment context while tool-enabled modes can explore further with Pi read/search/list tools. (#3)
- Documented the issue, branch, changelog, and manual release-prep process for future changes. (#3)
- Fixed CI format checks for optional local docs and agent guidance files. (#3)
- Improved Pi CLI dependency diagnostics for missing Pi installs, missing Node runtimes, and startup failures. (#6)
- Added safer Pi subprocess PATH handling for Obsidian GUI launches on macOS and common Node version managers. (#6)
- Updated Pi setup guidance to explain Node/PATH issues when the Pi CLI is installed but cannot run. (#6)
- Started smarter change tracking that snapshots Pi-touched files for Edit mode while keeping full snapshots as a Full agent fallback. (#4)

## 0.0.2

Automated review fixes for Obsidian Community Plugins:

- Added GitHub release notes generated from the current changelog entry.
- Added artifact attestations for supported release assets.
- Removed unsupported release zip uploads from the GitHub release workflow.
- Removed environment-variable reads from plugin source.
- Replaced the source entrypoint's `require()` import with an ES module export.
- Removed CSS `!important` declarations.

## 0.0.1

Initial Pi Agent release:

- Pi chat view inside Obsidian.
- Vault-aware context from current notes, links, backlinks, tags, search results, and selections.
- Skill folder settings and `/skill:name` autocomplete for Pi skills.
- Review mode for read/search-only workflows.
- Edit and Full agent modes for controlled vault/project changes through Pi.
- Chat history and Pi session persistence.
- Change summaries and diff review for edited files.
