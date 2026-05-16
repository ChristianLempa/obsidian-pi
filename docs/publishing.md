# Publishing checklist

Before submitting Pi Agent to Obsidian Community Plugins:

- `manifest.json` id remains `pi-agent` for Community Plugins install/update continuity.
- `manifest.json`, `package.json`, `versions.json`, and the promoted `CHANGELOG.md` release section use the same version.
- `README.md` explains usage, requirements, install steps, network use, file access, and safety.
- `PRIVACY.md` explains what context can be sent to Pi/model providers.
- `LICENSE` is present.
- `npm run ci` passes.
- A GitHub release exists with `main.js`, `manifest.json`, and `styles.css` assets.
- The release tag exactly matches `manifest.json.version`.
