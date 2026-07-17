# Changelog

## Unreleased

- Added an ordered, persistent local follow-up queue for active runs with one-shot steering, edit/retrieve/removal controls, separate Pi-native queue status, and safe delivery after settlement. Added PNG/JPEG/WebP picker, paste, and drop attachments with accessible previews, model capability validation, and Pi RPC image payloads. (#40)
- Delegated extension, prompt-template, and skill discovery/expansion to Pi RPC so Pi's resource precedence and project-trust decisions remain authoritative; Full agent keeps extension/custom tools, constrained modes keep explicit built-in allowlists, and extension UI requests now use Obsidian dialogs, notices, status, widgets, titles, and composer text. (#39)
- Removed duplicated local history and repeated durable instructions from each user prompt; stable instructions now load once when the Pi runtime starts. (#38)

- Made Pi RPC the source of truth for runtime models, effective defaults, complete model metadata, and supported thinking levels, including sparse maps and `max`; model and thinking overrides now use RPC commands. (#37)
- Replaced per-prompt JSON subprocesses with persistent, per-chat Pi RPC sessions, including strict JSONL framing, correlated commands, restart/error handling, RPC cancellation, and native compaction. (#36)

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
