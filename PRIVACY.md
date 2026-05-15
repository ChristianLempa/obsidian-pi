# Privacy

Pi Agent is a desktop-only Obsidian plugin that shells out to the separately installed Pi CLI.

## Data sent to Pi

When you send a message, the plugin can include:

- your prompt and selected text
- current note content and metadata
- backlinks, outgoing links, unresolved links, headings, tags, and frontmatter
- ranked search-result excerpts
- explicit `@note`, `#tag`, `/search`, and `/skill:name` attachments
- local chat thread history for continuity

Pi may forward this prompt/context to the model provider configured in your Pi settings.

## Network use

The plugin itself does not call model-provider APIs directly and does not include telemetry. Network use happens through the Pi CLI and depends on your Pi provider/model configuration.

## Local storage

The plugin stores settings and trimmed chat history in Obsidian plugin data. Pi session files are written under the plugin directory during local runs. These runtime files are ignored by git.

## File and shell access

The plugin can read Pi configuration and skill files from vault/project `.pi/` and `.agents/` folders, plus any absolute or vault-relative skill folders you configure. This is used to discover vault/project Pi defaults, available skills, and model settings.

Tool modes control which Pi CLI tools are enabled:

- Chat: no Pi CLI tools.
- Review: read/search/list tools.
- Edit: read/search/list plus edit/write tools.
- Full agent: edit/write tools plus shell commands.

Tool modes are not an operating-system sandbox. Only enable Edit or Full agent for vaults and projects you are comfortable letting Pi inspect or modify.

## Skills

Skills may contain instructions or scripts. Only enable default or custom skill folders you trust.
