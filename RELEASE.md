# Release process

Keep releases simple:

## Test a dev version locally

This repository contains the built Obsidian plugin files directly: `main.js`, `manifest.json`, and `styles.css`.

To copy the current repo version into an Obsidian vault plugin folder, run:

```bash
npm run dev:install -- /path/to/vault/.obsidian/plugins/obsidian-pi
```

Or set a reusable target:

```bash
export OBSIDIAN_PI_DEV_DIR=/path/to/vault/.obsidian/plugins/obsidian-pi
npm run dev:install
```

Then reload Obsidian, or disable and re-enable the plugin.

## Normal development

- Collect all feature and fix work on `main`.
- Test locally with `npm run dev:install`.
- Do not tag until the next release is ready.

## Prepare a release

1. Pick the next SemVer version, for example `0.0.2`.
2. Update the version in:
   - `manifest.json`
   - `package.json`
   - `versions.json`
   - `CHANGELOG.md`
3. Run:

```bash
npm run version:check
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

The `release.yml` workflow creates a GitHub release and uploads:

- `main.js`
- `manifest.json`
- `styles.css`
- `obsidian-pi-<version>.zip`

For Obsidian Community Plugins, GitHub release assets are what users receive when they install or update the plugin.
