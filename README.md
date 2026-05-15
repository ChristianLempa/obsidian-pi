# Pi Agent

Chat with Pi in Obsidian using context from your notes, links, backlinks, tags, search results, and selected text.

> Thanks to Mario Zechner, the developer of Pi, for building the agent this plugin runs on top of.

## Requirements

Pi Agent is desktop-only and requires the Pi coding agent to be installed separately. The upstream Pi coding agent package is [`@earendil-works/pi-coding-agent`](https://www.npmjs.com/package/@earendil-works/pi-coding-agent), from [`earendil-works/pi-mono`](https://github.com/earendil-works/pi-mono/tree/main/packages/coding-agent):

```bash
npm install -g @earendil-works/pi-coding-agent
pi --version
```

If Obsidian cannot find `pi`, restart Obsidian after installation so it picks up your updated PATH.

First run checklist:

1. Install and authenticate Pi from a terminal.
2. Open a dedicated test vault before enabling Edit or Full agent mode.
3. Start in Chat or Review mode until you understand what context is sent.
4. Enable Edit or Full agent only for vaults/projects you are comfortable letting Pi modify.

Tool modes, briefly:

- Chat attaches Obsidian context only; Pi CLI tools are disabled.
- Review lets Pi read/search/list files.
- Edit lets Pi edit/write files.
- Full agent also lets Pi run shell commands.

Privacy reminder: prompts, selected text, note content, search excerpts, attachments, and local chat history can be sent to the Pi CLI and then to your configured model provider.

## Features

- Chat with Pi from an Obsidian sidebar.
- Attach current-note context automatically.
- Include linked notes, backlinks, tags, search results, frontmatter, headings, and selected text.
- Choose tool modes: Chat, Review, Edit, and Full agent.
- Enable default Pi skills and add trusted custom skill folders.
- Use `/` autocomplete for Obsidian context commands and `/skill:name` commands.
- Review detected vault changes and diffs after edit/full-agent runs.
- Copy responses, create notes from answers, and open cited vault notes.

> Tool modes control which Pi CLI tools are enabled. They are not an operating-system sandbox.

## Privacy and safety

Pi Agent can send note content and selected text to the local Pi CLI, which may forward prompts to configured model providers. See [PRIVACY.md](PRIVACY.md) for details before publishing or using the plugin with sensitive vaults.

Short version:

- Chat history and Pi sessions are stored locally by the plugin and Pi.
- Network access depends on your Pi/model-provider configuration.
- Edit and Full agent modes can modify files in your vault/project.
- Full agent mode can run shell commands through Pi.
- Skills can contain instructions or scripts; only enable skill folders you trust.

## Installation

### Community plugins

After approval, install from Obsidian's Community Plugins browser.

### Manual installation

Download the latest release and copy these files into:

```text
<vault>/.obsidian/plugins/pi-agent/
```

Required files:

```text
main.js
manifest.json
styles.css
```

Then enable **Pi Agent** in Obsidian settings.

## Development

Use a dedicated test vault. Do not develop or test plugin changes in your main vault.

```bash
npm ci
npm run build
npm run build:check
npm run ci
npm run dev:install -- /path/to/vault/.obsidian/plugins/pi-agent
```

Then reload Obsidian, or disable and re-enable the plugin.

See [docs/development.md](docs/development.md) and [docs/architecture.md](docs/architecture.md).

## Release

1. Update `manifest.json`, `package.json`, `versions.json`, and `CHANGELOG.md`.
2. Run:

```bash
npm run ci
npm run release:zip
```

3. Commit the release prep.
4. Create and push a matching SemVer tag, for example:

```bash
git tag 0.0.1
git push origin 0.0.1
```

The release workflow publishes:

- `main.js`
- `manifest.json`
- `styles.css`
- `pi-agent-<version>.zip`
