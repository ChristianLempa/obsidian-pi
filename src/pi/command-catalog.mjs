import { getConfiguredSkillPaths } from "../context/skills.mjs";
import { PiRpcClient } from "./rpc-client.mjs";

export class PiCommandCatalog {
  constructor(pluginDirectory, settings = {}, extensionUiHandler) {
    this.pluginDirectory = pluginDirectory;
    this.settings = settings;
    this.extensionUiHandler = extensionUiHandler;
  }

  async getCommands(vaultBasePath) {
    const client = new PiRpcClient({
      piExecutablePath: this.settings.piExecutablePath,
      cwd: vaultBasePath ?? this.pluginDirectory,
      args: buildCommandDiscoveryArgs(this.settings, vaultBasePath),
      extensionUiHandler: this.extensionUiHandler
    });

    try {
      const result = await client.request("get_commands");
      return normalizeRpcCommands(result?.commands);
    } finally {
      client.dispose();
    }
  }
}

export function buildCommandDiscoveryArgs(settings = {}, basePath) {
  const args = ["--mode", "rpc", "--no-session", "--no-tools"];
  if (settings.includeDefaultSkills === false) args.push("--no-skills");
  for (const skillPath of getConfiguredSkillPaths(settings, basePath))
    args.push("--skill", skillPath);
  return args;
}

export function normalizeRpcCommands(commands) {
  if (!Array.isArray(commands)) return [];

  return commands.flatMap((command) => {
    const name = String(command?.name ?? "")
      .trim()
      .replace(/^\/+/, "");
    const source = command?.source;
    if (!name || !["extension", "prompt", "skill"].includes(source)) return [];

    const description = String(command.description ?? "").trim();
    return [
      {
        command: `/${name}`,
        label:
          source === "skill"
            ? name.replace(/^skill:/, "")
            : source === "prompt"
              ? "Prompt template"
              : name,
        detail:
          description ||
          (source === "skill"
            ? "Pi skill"
            : source === "prompt"
              ? "Pi prompt template"
              : "Pi extension command"),
        insertText: `/${name} `,
        implemented: true,
        source,
        sourceInfo: command.sourceInfo,
        // Keep the legacy fields for compatibility with older Pi RPC versions.
        location: command.location,
        path: command.path ?? command.sourceInfo?.path
      }
    ];
  });
}
