# Release process

Pi Agent keeps release assets simple: `main.js`, `manifest.json`, and `styles.css`.

## Test locally

Use a dedicated Obsidian test vault, never your main vault.

```bash
npm ci
npm run ci
npm run dev:install -- /path/to/vault/.obsidian/plugins/pi-agent
```

Or set a reusable target:

```bash
export PI_AGENT_DEV_DIR=/path/to/vault/.obsidian/plugins/pi-agent
npm run dev:install
```

Then reload Obsidian, or disable and re-enable the plugin.

## Prepare a release

1. Pick the next SemVer version, for example `0.0.2`.
2. Update the version in:
   - `manifest.json`
   - `package.json`
   - `versions.json`
   - `CHANGELOG.md`
3. Run:

```bash
npm run ci
npm run release:zip
```

4. Commit the release prep:

```bash
git add .
git commit -m "Release 0.0.2"
git push origin main
```

## Publish a release

Create and push a tag that exactly matches the version in `manifest.json` and `package.json`:

```bash
git tag 0.0.2
git push origin 0.0.2
```

The GitHub Actions release workflow creates a GitHub release and uploads:

- `main.js`
- `manifest.json`
- `styles.css`
- `pi-agent-<version>.zip`

For Obsidian Community Plugins, GitHub release assets are what users receive when they install or update the plugin.
