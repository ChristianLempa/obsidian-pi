# Development

Use a dedicated Obsidian test vault.

```bash
npm ci
npm run ci
npm run dev:install -- /path/to/vault/.obsidian/plugins/pi-agent
```

Reload Obsidian after installing the dev build.

## Quality gates

`npm run ci` runs:

1. build
2. generated build freshness check
3. Prettier check
4. ESLint
5. TypeScript typecheck
6. unit tests
7. version validation

## Source rules

- Keep UI text sentence case.
- Use Obsidian `Setting#setHeading()` for settings sections.
- Use `registerEvent`, `registerDomEvent`, `registerInterval`, or explicit cleanup for resources.
- Prefer `Vault.process()` and `FileManager.processFrontMatter()` for writes.
- Add privacy documentation for any new data/network/file access.
