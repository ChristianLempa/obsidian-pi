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
- UTF-8 text, code, and configuration files that you explicitly select from the vault or local filesystem; content is limited to 64 KiB per file and 192 KiB total, marked when truncated, and sent as delimited untrusted prompt context
- annotations for the active note, including quoted/source text, rendered-selection text, intent, and the context you wrote

Pi may forward this prompt/context to the model provider configured in your Pi settings.

## Network use

The plugin itself does not call model-provider APIs directly and does not include telemetry. Network use happens through the Pi CLI and depends on your Pi provider/model configuration. When annotations are attached to a prompt, the configured provider can receive their plaintext content along with the rest of the prompt; consult that provider's privacy and retention terms.
The opt-in compatibility smoke command starts Pi with `--offline`, disables discovered resources, and sends no model prompt, so it makes no model-provider request; ordinary chats are not offline unless your Pi configuration makes them so.

When Obsidian is unfocused and the operating system has granted notification permission, the plugin can emit a generic local completion notification. Notification text does not include prompts, note content, thinking, tool arguments, or model responses. Clicking it focuses Obsidian and opens the originating local chat.

## Local storage

The plugin stores settings, annotations, and unsent local follow-up queue items in Obsidian plugin data. Chat transcripts are plaintext, versioned JSON files under the configurable vault-relative `chats` folder after migration; legacy history remains in plugin data until you approve migration. Migration creates a local recovery backup before removing legacy history from plugin data. Annotation records are plaintext JSON and include note paths, quoted/source text, optional rendered-selection text, and your annotation context. None of this local data is encrypted by the plugin.

Queued image data is stored locally as base64 and queued text-file content as plaintext until the item is sent or removed; once sent, Pi and the configured model provider receive it. Unsupported binaries, PDFs, office documents, and archives are not attached; Pi RPC is not presented as supporting generic binary files. After the plugin restarts, saved follow-ups remain paused until you explicitly resume or discard them, preventing stale prompts from replaying automatically.

Deleting a chat removes only its Pi Agent chat-history file by default. When a chat has a local Pi session, the deletion dialog separately offers to delete that session file; local Pi data is removed only after choosing that explicit option. Session information shows the local storage path, and HTML export writes a separate local file at the path reported by Pi.

Obsidian Sync, third-party sync tools, backups, or copying the vault may sync or copy chat history, plugin data, annotations, and Pi session files. Their retention and security policies apply. Pi runtime session files are written under the plugin directory during local runs and remain separate from the vault-relative `chats` history files.

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
