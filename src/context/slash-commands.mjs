import { getPromptTemplateSlashCommands } from "./prompt-templates.mjs";
import { getSkillSlashCommands } from "./skills.mjs";

export const BUILTIN_SLASH_COMMANDS = [
  {
    command: "/current",
    label: "Current note",
    detail: "Attach the active note, selection, links, tags, headings, and frontmatter.",
    insertText: "/current ",
    implemented: true
  },
  {
    command: "/backlinks",
    label: "Backlinks",
    detail: "Attach notes that link to the active note.",
    insertText: "/backlinks ",
    implemented: true
  },
  {
    command: "/links",
    label: "Outgoing links",
    detail: "Attach notes linked from the active note.",
    insertText: "/links ",
    implemented: true
  },
  {
    command: "/search",
    label: "Vault search",
    detail: "Attach ranked vault note matches for a query.",
    insertText: "/search ",
    argumentHint: "query",
    implemented: true
  },
  {
    command: "/compact",
    label: "Compact Pi context",
    detail: "Ask Pi to compact the current session context, optionally with custom instructions.",
    insertText: "/compact ",
    argumentHint: "instructions",
    implemented: true
  },
  {
    command: "/context show",
    label: "Show context",
    detail: "Display the current Obsidian context packet without calling Pi.",
    insertText: "/context show ",
    implemented: true
  }
];

export function getSlashCommands(settings, basePath) {
  return [
    ...BUILTIN_SLASH_COMMANDS.map((command) => ({ ...command })),
    ...getPromptTemplateSlashCommands(basePath),
    ...getSkillSlashCommands(settings, basePath)
  ];
}
