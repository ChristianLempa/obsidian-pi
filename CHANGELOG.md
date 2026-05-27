# Changelog

## Unreleased

- Fixed Windows Pi CLI launches on Node.js 24+ by routing `pi`/`pi.cmd` through `cmd.exe` without Node's deprecated shell-args path. ([#17](https://github.com/ChristianLempa/obsidian-pi/issues/17))
- Updated CI and release workflows to Node.js 24-compatible GitHub Actions. ([#11](https://github.com/ChristianLempa/obsidian-pi/issues/11))
- Added vault prompt-template support for `.pi/prompts/*.md`, including slash-command discovery and Pi-style template arguments. ([#19](https://github.com/ChristianLempa/obsidian-pi/issues/19))

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
