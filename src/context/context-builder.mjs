import { getResolvedReasoning, CUSTOM_MODEL_VALUE } from "../plugin/settings.mjs";
import { expandPromptTemplate } from "./prompt-templates.mjs";
import { parsePromptReferences } from "./prompt-references.mjs";
import { getSlashCommands } from "./slash-commands.mjs";
import { findSkillByName, readSkillContent } from "./skills.mjs";

export class ContextBuilder {
  constructor(graph, settings, bundledInstructions, vaultBasePath) {
    this.graph = graph;
    this.settings = settings;
    this.bundledInstructions = bundledInstructions;
    this.vaultBasePath = vaultBasePath;
  }

  async build(prompt, selection = "") {
    const userPrompt = await expandPromptTemplate(prompt, this.vaultBasePath);
    const parsedPrompt = parsePromptReferences(userPrompt);
    const preAttachedContext = await this.buildPreAttachedContext(parsedPrompt, selection);
    const toolCatalog = this.getToolCatalog();
    const slashCommands = getSlashCommands(this.settings, this.vaultBasePath);
    const inspection = this.createInspection(preAttachedContext);

    return {
      ...preAttachedContext,
      toolCatalog,
      inspection,
      slashCommands,
      userPrompt
    };
  }

  /**
   * Builds the context packet that is attached before Pi starts.
   *
   * Keep this deliberately small and predictable: active note context, one-hop
   * linked/backlinked note context, and user-explicit prompt references. Broad
   * vault exploration belongs to Pi's read/search/list tools in Review, Edit,
   * and Full agent modes. Chat mode has no tools, so users can still attach
   * additional context explicitly with @note, #tag, /search, or folder refs.
   */
  async buildPreAttachedContext(parsedPrompt, selection = "") {
    const activeNote = await this.graph.getActiveNoteContext(selection);
    const linkedNeighborhood = activeNote
      ? await this.graph.getLinkedNeighborhood(activeNote.path, 1)
      : [];
    const attachments = await this.resolveAttachments(parsedPrompt.references, activeNote);

    return {
      activeNote,
      linkedNeighborhood,
      searchResults: [],
      attachments
    };
  }

  async inspectContext(prompt, selection = "") {
    return (await this.build(prompt, selection)).inspection;
  }

  getSystemInstructions() {
    return [this.bundledInstructions, this.settings.customInstructions]
      .map((value) => value.trim())
      .filter(Boolean)
      .join("\n\n");
  }

  formatPrompt(prompt, context) {
    return [
      "Use the following Obsidian vault context as a starting point.",
      "When read/search/list tools are enabled, inspect additional files yourself instead of assuming the pre-attached context is complete.",
      "Prefer cited wikilinks or vault paths when referring to notes.",
      "Respect the selected tool mode. Chat has no Pi CLI tools. Review can read/search/list only. Edit can edit/write but not run shell commands. Full agent can edit/write and run shell commands. Tool modes are not an OS-level sandbox.",
      "",
      "## User prompt",
      prompt,
      "",
      "## Obsidian context helpers",
      context.toolCatalog.map((tool) => `- ${tool}`).join("\n"),
      "",
      "## Context inspection",
      JSON.stringify(context.inspection, null, 2),
      "",
      "## Slash commands",
      context.slashCommands
        .map((command) => {
          const argumentHint = command.argumentHint ? ` <${command.argumentHint}>` : "";
          return `- ${command.command}${argumentHint}: ${command.label} - ${command.detail}`;
        })
        .join("\n"),
      "",
      "## Active note",
      JSON.stringify(context.activeNote ?? null, null, 2),
      "",
      "## Linked neighborhood",
      JSON.stringify(context.linkedNeighborhood, null, 2),
      "",
      "## Search results",
      JSON.stringify(context.searchResults, null, 2),
      "",
      "## Explicit prompt attachments",
      JSON.stringify(context.attachments, null, 2)
    ].join("\n");
  }

  async resolveAttachments(references, activeNote) {
    const attachments = [];

    for (const reference of references) {
      try {
        if (reference.type === "note") {
          const noteFile = this.graph.resolveNoteFile(reference.value);
          attachments.push({
            type: "note",
            label: reference.value,
            content: noteFile
              ? {
                  context: await this.graph.getNoteContext(noteFile),
                  content: await this.graph.readVaultFile(noteFile.path)
                }
              : { error: `Note not found: ${reference.value}` }
          });
        } else if (reference.type === "folder") {
          attachments.push({
            type: "folder",
            label: reference.value,
            content: await this.graph.getFolderSummary(reference.value)
          });
        } else if (reference.type === "tag") {
          attachments.push({
            type: "tag",
            label: reference.value,
            content: await this.graph.getNotesByTag(reference.value)
          });
        } else if (reference.type === "skill") {
          attachments.push({
            type: "skill",
            label: `/skill:${reference.value}`,
            content: this.resolveSkill(reference.value, reference.argument)
          });
        } else if (reference.type === "command") {
          attachments.push({
            type: "command",
            label: `/${reference.value}`,
            content: await this.resolveCommand(reference.value, reference.argument, activeNote)
          });
        }
      } catch (error) {
        attachments.push({
          type: reference.type,
          label: "value" in reference ? reference.value : "command",
          content: { error: error instanceof Error ? error.message : String(error) }
        });
      }
    }

    return attachments;
  }

  resolveSkill(name, argument = "") {
    const skill = findSkillByName(this.settings, this.vaultBasePath, name);

    return skill
      ? {
          name: skill.name,
          description: skill.description,
          path: skill.path,
          argument,
          instructions: readSkillContent(skill.path)
        }
      : { error: `Skill not found: ${name}` };
  }

  async resolveCommand(command, argument, activeNote) {
    return command === "current"
      ? activeNote != null
        ? activeNote
        : null
      : command === "backlinks"
        ? activeNote
          ? await this.graph.getBacklinks(activeNote.path)
          : []
        : command === "links"
          ? activeNote
            ? this.graph.getOutgoingLinks(activeNote.path)
            : []
          : command === "search"
            ? argument
              ? await this.graph.searchNotes(argument)
              : []
            : command === "compact"
              ? { action: "Pi CLI session compaction", instructions: argument || undefined }
              : { error: `Unknown command: /${command}` };
  }

  getToolCatalog() {
    const mode =
      this.settings.sandboxMode === "workspace-write" ? "edit" : this.settings.sandboxMode;
    if (mode === "chat")
      return ["No Pi CLI tools enabled. Use pre-attached Obsidian context only."];

    const tools = ["read(path)", "grep(pattern, path)", "find(glob)", "ls(path)"];
    if (mode === "edit" || mode === "full-agent")
      tools.push("edit(path, oldText, newText)", "write(path, content)");
    if (mode === "full-agent") tools.push("bash(command)");
    tools.push(
      "Tool modes are not an OS-level sandbox; avoid destructive actions unless explicitly requested."
    );

    return tools;
  }

  createInspection(context) {
    return {
      activeNote: context.activeNote
        ? {
            path: context.activeNote.path,
            title: context.activeNote.title,
            hasSelection: context.activeNote.selection.trim().length > 0,
            selectionLength: context.activeNote.selection.length,
            backlinkCount: context.activeNote.backlinks.length,
            outgoingLinkCount: context.activeNote.outgoingLinks.length,
            unresolvedLinkCount: context.activeNote.unresolvedLinks.length,
            tagCount: context.activeNote.tags.length,
            headingCount: context.activeNote.headings.length
          }
        : undefined,
      attachments: this.summarizeAttachments(context.attachments),
      searchResults: {
        count: context.searchResults.length,
        paths: context.searchResults.map((result) => result.path)
      },
      linkedNeighborhood: {
        count: context.linkedNeighborhood.length,
        paths: context.linkedNeighborhood.map((note) => note.path)
      },
      tools: { badges: this.getToolBadges() },
      run: {
        model: this.getEffectiveModelSummary(),
        reasoning: getResolvedReasoning(this.settings),
        mode: this.settings.sandboxMode,
        dryRun: this.settings.dryRun
      }
    };
  }

  summarizeAttachments(attachments) {
    const byType = {};
    for (const attachment of attachments)
      byType[attachment.type] = (byType[attachment.type] ?? 0) + 1;

    return {
      total: attachments.length,
      byType,
      items: attachments.map((attachment) => ({ type: attachment.type, label: attachment.label }))
    };
  }

  getToolBadges() {
    const mode =
      this.settings.sandboxMode === "workspace-write" ? "edit" : this.settings.sandboxMode;
    const canRead = mode !== "chat";
    const canWrite = mode === "edit" || mode === "full-agent";
    const canUseShell = mode === "full-agent";

    return [
      {
        id: "read",
        label: "Read files",
        detail: canRead
          ? "Pi can read files via CLI tools."
          : "Pi CLI file reads are disabled; only attached Obsidian context is available.",
        enabled: canRead,
        kind: "read"
      },
      {
        id: "search",
        label: "Search files",
        detail: canRead
          ? "Pi can search/list files via CLI tools."
          : "Pi CLI search/list tools are disabled.",
        enabled: canRead,
        kind: "search"
      },
      {
        id: "write",
        label: "Edit files",
        detail: canWrite
          ? "Pi can edit and write files. Not OS-sandboxed."
          : "File editing is disabled in this mode.",
        enabled: canWrite,
        kind: "write"
      },
      {
        id: "shell",
        label: "Shell",
        detail: canUseShell
          ? "Pi can run shell commands. Not OS-sandboxed."
          : "Shell commands are disabled in this mode.",
        enabled: canUseShell,
        kind: "shell"
      }
    ];
  }

  getEffectiveModelSummary() {
    return this.settings.model === CUSTOM_MODEL_VALUE
      ? this.settings.customModel.trim() || "custom"
      : this.settings.model.trim() || "default";
  }
}
