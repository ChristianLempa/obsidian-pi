# Architecture

Pi Agent is an Obsidian desktop plugin that shells out to the Pi CLI, sends vault-aware context with the user prompt, streams Pi JSON events back into a chat view, and optionally tracks vault changes made during edit-capable runs.

Root release assets stay in the repository root because Obsidian downloads them directly:

```text
main.js
manifest.json
styles.css
```

`main.js` is generated. Human-readable source belongs under `src/` and is bundled by `npm run build`.

## Domains

Pi Agent has these runtime domains:

- **Plugin shell**: Obsidian lifecycle, commands, settings, view registration, service construction, and persistence.
- **Context**: active note, selection, backlinks, outgoing links, unresolved links, tags, frontmatter, headings, search results, and explicit prompt attachments.
- **Pi integration**: CLI argument construction, session files, cancellation, model catalog lookup, JSON event parsing, token/context usage, and tool status mapping.
- **Threads**: local chat threads, message normalization, fork/switch/delete/rename behavior, and persisted history trimming.
- **Changes**: vault snapshots, text-file filters, before/after diffs, change summaries, and revert support.
- **UI**: chat view, thread list, composer, run controls, suggestions, activity state, message actions, note actions, and modals.

## Source layout

The source tree is modular around those domains:

```text
src/
  main.js                         tiny CommonJS source entry
  plugin/
    PiAgentPlugin.mjs             Obsidian lifecycle, commands, services, persistence
    settings-tab.mjs              settings UI
    settings.mjs                  defaults and settings/model/tool helpers
    constants.mjs                 plugin IDs, view type, icon metadata
  context/
    context-builder.mjs           prompt/context assembly
    vault-graph.mjs               vault search, links, backlinks, tags, note context
    prompt-references.mjs         @note, #tag, /command parsing
    skills.mjs                    skill discovery and parsing
    slash-commands.mjs            built-in and skill slash command metadata
  pi/
    runner.mjs                    Pi CLI process/session handling
    events.mjs                    JSON event normalization
    model-catalog.mjs             model registry and effective config lookup
    environment.mjs               PATH/environment helpers
    token-usage.mjs               token/context usage formatting
  threads/
    thread-store.mjs              chat thread state and normalization
  changes/
    change-tracker.mjs            vault snapshots and change summaries
    diff.mjs                      line diff and unified diff helpers
  ui/
    PiAgentView.mjs               chat view orchestration
    activity.mjs                  activity/tool status helpers
    links.mjs                     message link segmentation
    message-actions.mjs           assistant/user message menus
    note-actions.mjs              transcript, note creation, cited-note actions
    run-settings.mjs              composer run controls
    suggestions.mjs               @/#// autocomplete
    thread-actions.mjs            thread action callbacks
    modals/                       approval and change-review modals
  shared/                         pure helpers shared by plugin code and tests

tests/                            Vitest unit tests for pure/source helpers
scripts/                          build, install, release, and validation scripts
docs/                             maintainer docs
```

New code should prefer the domain folders above instead of adding logic to `src/main.js`.

## Build flow

```text
src/**/*.js,mjs  --npm run build-->  main.js
```

The build uses esbuild to bundle the source entry into a CommonJS `main.js` for Obsidian. Obsidian consumes only the root release files. Contributors and agents should review and edit `src/` first, then regenerate `main.js`.

## Prompt/runtime flow

1. The user submits a prompt from the Pi Agent view or an Obsidian command.
2. The plugin stores the user message on the current chat thread.
3. The context domain collects current note context, selected text, graph neighborhood, search results, and explicit attachments.
4. The Pi integration domain formats the prompt and starts the Pi CLI in JSON mode.
5. JSON events stream back into UI state: thinking, tool activity, text deltas, token usage, retries, compaction, and final answer.
6. Edit-capable modes snapshot the vault before the run and diff it afterward.
7. The final assistant message, optional change summary, and optional token/context usage are stored in local thread history.

## Extraction rules

- Extract pure helpers first and add/keep tests for them.
- Keep Obsidian UI classes thin by moving formatting/parsing/action logic to modules.
- Keep services independent where possible: Pi runner should not know about DOM, and UI should not know CLI details beyond callbacks/state.
- Preserve behavior during module extraction; improve behavior in separate, reviewable changes.
- Do not add generated/runtime files to git.
