# Changelog

## Unreleased

- Simplified context settings by removing user-facing numeric context/change tracking limits and keeping ignored folders/directories as the visible context/file-access control (#3).
- Changed pre-attached context to avoid automatic broad prompt searches; Pi now starts from current-note, link/backlink, and explicit attachment context while tool-enabled modes can explore further with Pi read/search/list tools (#3).
- Documented the issue, branch, changelog, and manual release-prep process for future changes (#3).

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
