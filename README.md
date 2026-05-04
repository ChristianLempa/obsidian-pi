# Obsidian Pi

Chat with Pi inside Obsidian using context from your notes, links, backlinks, tags, and search results.

> Huge thanks to Mario Zechner, the developer of Pi, for building the agent this plugin runs on top of.

## Requirements

Obsidian Pi is a desktop-only Obsidian plugin and requires the Pi coding agent to be installed separately.

Install Pi globally before using this plugin:

```bash
npm install -g @mariozechner/pi-coding-agent
```

Verify that Pi is available on your PATH:

```bash
pi --version
```

If Obsidian cannot find `pi`, restart Obsidian after installation so it picks up your updated PATH.

## Features

- Chat with Pi from an Obsidian sidebar.
- Automatically attach current-note context.
- Include linked notes, backlinks, tags, search results, frontmatter, headings, and selected text.
- Configurable tool modes: Chat, Review, Edit, and Full Agent.
- Configurable Pi skills: include default Pi skills and add trusted custom skill folders.
- `/` autocomplete for built-in Obsidian context commands and available `/skill:name` commands.
- Review mode: inspect/search only.
- Edit mode: allow Pi to edit/write files without shell commands.
- Full Agent mode: allow Pi to edit/write files and run shell commands.
- Keep chat history and Pi sessions.
- Review detected vault changes and diffs after edit/full-agent runs.
- Copy responses, create notes from answers, and open cited vault notes.

> Tool modes enable or disable Pi CLI tools; they are not an OS-level sandbox.

## Skills

Obsidian Pi can load Pi skills from Pi's normal skill discovery locations, including vault-local `.pi/skills/` and `.agents/skills/` folders. In plugin settings you can:

- toggle whether default Pi skills are included
- add extra trusted skill files or folders, one per line

Configured skills appear in `/` autocomplete as `/skill:name`. Skills may contain instructions or scripts, so only enable skill folders you trust.

## Installation

### Community plugins

After approval, install from Obsidian's Community Plugins browser.

### Manual installation

Download the latest release and copy these files into:

```text
<vault>/.obsidian/plugins/obsidian-pi/
```

Required files:

```text
main.js
manifest.json
styles.css
```

Then enable **Obsidian Pi** in Obsidian settings.

## Development and release process

Development happens on `main`.

Test the current repository version in your local vault:

```bash
npm run dev:install -- /path/to/vault/.obsidian/plugins/obsidian-pi
```

Then reload Obsidian, or disable and re-enable the plugin.

To release a new version:

1. Collect features and fixes on `main`.
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

4. Commit the release prep.
5. Create and push a matching version tag:

```bash
git tag 0.0.1
git push origin 0.0.1
```

The GitHub Actions release workflow validates the version and publishes the release assets required by Obsidian:

- `main.js`
- `manifest.json`
- `styles.css`
- `obsidian-pi-<version>.zip`

Once the plugin is accepted into Obsidian Community Plugins, new tagged GitHub releases become available through Obsidian's plugin update system.
