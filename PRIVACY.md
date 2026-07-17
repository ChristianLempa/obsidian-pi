# Privacy

Pi Agent is a desktop-only Obsidian plugin that maintains local RPC subprocesses with the separately installed Pi CLI.

## Data sent to Pi

When you send a message, the plugin can include:

- your prompt and selected text
- current note content and metadata
- backlinks, outgoing links, unresolved links, headings, tags, and frontmatter
- explicit ranked search-result excerpts when you use search attachments or commands
- explicit `@note`, `#tag`, and `/search` attachments
- skill and prompt-template content that Pi expands after applying its resource and project-trust rules
- local chat thread history for continuity
- PNG, JPEG, or WebP images that you explicitly select, paste, or drop into the composer

Pi may forward this prompt/context to the model provider configured in your Pi settings.

## Network use

The plugin itself does not call model-provider APIs directly and does not include telemetry. Network use happens through the Pi CLI and depends on your Pi provider/model configuration.

## Local storage

The plugin stores settings, trimmed chat history, and unsent local follow-up queue items in Obsidian plugin data. Queued image data is stored locally as base64 until the item is sent or removed; once sent, Pi and the configured model provider receive it. After the plugin restarts, saved follow-ups remain paused until you explicitly resume or discard them, preventing stale prompts from replaying automatically. Pi session files are written under the plugin directory during local runs. These runtime files are ignored by git.

## File and shell access

The plugin asks Pi RPC to discover extension commands, prompt templates, and skills. Pi remains responsible for loading these resources and applying its project-trust decisions; the plugin does not independently read project prompt or skill files for command discovery or expansion. Optional absolute or vault-contained relative skill paths that you explicitly configure are passed to Pi as trusted additional skill paths.

Tool modes control which Pi CLI tools are enabled:

- Chat: no Pi CLI tools.
- Review: read/search/list tools.
- Edit: read/search/list plus edit/write tools.
- Full agent: Pi's complete tool set, including extension/custom tools and shell commands.

Tool modes are not an operating-system sandbox. Only enable Edit or Full agent for vaults and projects you are comfortable letting Pi inspect or modify.

## Skills

Skills may contain instructions or scripts. Only enable default or custom skill folders you trust.
