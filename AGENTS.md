# AGENTS.md

Guidance for AI coding agents working in this repository.

## Project

Project name: Pi Agent

Pi Agent is a desktop-only Obsidian plugin that shells out to the separately installed Pi coding agent CLI and uses vault context from Markdown notes, links, backlinks, tags, explicit search attachments, selected text, and explicit prompt attachments.

## Scope and precedence

- This file applies to the repository tree rooted at the directory containing this `AGENTS.md` file.
- More deeply nested `AGENTS.md` files may add or override instructions for their subtrees.
- Follow Obsidian plugin guidelines and this repository's source/build rules over generic JavaScript advice.

## Repository map

Use this as the first place to understand where things live.

- Release assets: `main.js`, `manifest.json`, `styles.css` - files Obsidian installs directly.
- Source: `src/` - human-editable plugin source. Edit this before touching generated release output.
- Shared helpers: `src/shared/` - pure helpers with unit tests.
- Plugin docs: `docs/` - maintainer architecture, development, and publishing notes.
- Tests: `tests/` - Vitest unit tests for source helpers.
- Scripts: `scripts/` - build, dev install, release packaging, and version validation.
- CI: `.github/workflows/` - GitHub Actions for validation and release publishing.

## Generated and runtime files

- `main.js` is the generated release entry. Do not hand-edit it for source changes.
- After changing `src/`, regenerate `main.js` with `npm run build`.
- Keep generated/runtime/local files out of git:
  - `node_modules/`
  - `data.json`
  - `pi-sessions/`
  - release zip files

## Validation

Run the relevant checks before finishing changes.

- Full gate: `npm run ci`
- Targeted checks during refactors:
  - `npm run build`
  - `npm test`
  - `npm run lint`
  - `npm run typecheck`
  - `npm run format:check`

## Obsidian plugin conventions

- Do not use a global `app`; use the plugin/view `this.app` reference.
- Avoid unnecessary console logging. Warnings are acceptable for recoverable diagnostics.
- Avoid `innerHTML`; build DOM with Obsidian/DOM APIs and text setters.
- Use `registerEvent`, `registerDomEvent`, `registerInterval`, `this.register()`, or explicit cleanup for listeners, observers, timers, and resources.
- Do not detach leaves in `onunload`.
- Prefer Obsidian Vault/FileManager APIs over direct adapter access.
- Use `Vault.process()` or `FileManager.processFrontMatter()` for writes when possible.
- Use `Setting#setHeading()` for settings sections.
- Keep UI text sentence case.

## Source organization conventions

- Keep `src/main.js` or the eventual plugin entry small and focused on exporting the plugin class.
- Prefer small modules with a clear domain boundary:
  - `plugin/` for lifecycle, commands, settings wiring.
  - `context/` for vault graph/search/context assembly.
  - `pi/` for Pi CLI integration, model catalog, and event parsing.
  - `threads/` for chat history/thread state.
  - `changes/` for snapshots, diffs, and revert behavior.
  - `ui/` for views, controls, actions, activity, suggestions, and modals.
  - `shared/` for pure helpers.
- Move pure logic to modules and cover it with tests before wiring it into Obsidian UI code.
- Keep refactors behavior-preserving unless the user explicitly asks for behavior changes.

## Issue and changelog process

- Before implementing feature work or behavior changes, create or identify a GitHub issue and reference it in commits, pull requests, and changelog entries.
- Work on a feature branch named for the issue, for example `issue-3-short-topic`, then merge through `main` after validation/review.
- Add user-facing changes under `## Unreleased` in `CHANGELOG.md` and include the issue number, for example `(#3)`.
- For releases, use a release-prep branch/PR to bump version files and manually promote `## Unreleased` entries into the release version section before tagging.

## Privacy and safety documentation

Update `README.md` and `PRIVACY.md` whenever changes affect:

- network use
- model-provider or Pi CLI data flow
- collected vault context
- local storage
- file access or write behavior
- shell access
- skills discovery, execution, or trust boundaries

## Manual testing

- Use a dedicated Obsidian test vault for manual plugin testing.
- Never test risky agent modes in a main vault.
- Do not enable Edit or Full agent mode in a sensitive vault while validating refactors.
