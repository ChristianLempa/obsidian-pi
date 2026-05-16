import { diffLines, formatUnifiedDiff, splitLines, summarizeChangedFiles } from "./diff.mjs";

// Internal safety fuse for local before/after snapshots used by diff/revert.
// Large projects should use ignored folders or external version control until
// smarter per-run change tracking is implemented.
export const CHANGE_SNAPSHOT_FILE_LIMIT = 500;

const TEXT_FILE_EXTENSIONS = new Set([
  "md",
  "txt",
  "canvas",
  "css",
  "js",
  "mjs",
  "cjs",
  "ts",
  "tsx",
  "jsx",
  "json",
  "jsonc",
  "yaml",
  "yml",
  "toml",
  "xml",
  "html",
  "svg",
  "csv",
  "tsv",
  "sh",
  "bash",
  "zsh",
  "fish",
  "py",
  "rb",
  "go",
  "rs",
  "java",
  "c",
  "h",
  "cpp",
  "hpp",
  "cs",
  "php",
  "sql",
  "ini",
  "conf",
  "env",
  "gitignore"
]);

export class ChangeTracker {
  constructor(app, settings) {
    this.app = app;
    this.settings = settings;
  }

  async snapshot() {
    const files = this.getTrackedFiles();
    if (files.length > CHANGE_SNAPSHOT_FILE_LIMIT) {
      throw new Error(
        `Pi Agent change review found ${files.length} text files, which exceeds the internal safety limit of ${CHANGE_SNAPSHOT_FILE_LIMIT}. Add ignored folders/directories or use external version control for large projects.`
      );
    }

    const fileContents = new Map();
    for (const file of files) fileContents.set(file.path, await this.app.vault.cachedRead(file));

    return { files: fileContents };
  }

  async diff(beforeSnapshot) {
    const afterSnapshot = await this.snapshot();
    const paths = new Set([...beforeSnapshot.files.keys(), ...afterSnapshot.files.keys()]);
    const files = [];
    const fileSnapshots = [];
    const unifiedDiffs = [];

    for (const filePath of [...paths].sort((left, right) => left.localeCompare(right))) {
      const before = beforeSnapshot.files.get(filePath);
      const after = afterSnapshot.files.get(filePath);
      if (before === after) continue;

      const changes = diffLines(splitLines(before ?? ""), splitLines(after ?? ""));
      const additions = changes.filter((change) => change.kind === "add").length;
      const deletions = changes.filter((change) => change.kind === "delete").length;
      const status = before === undefined ? "added" : after === undefined ? "deleted" : "modified";

      files.push({ path: filePath, status, additions, deletions });
      fileSnapshots.push({ path: filePath, status, before, after });
      unifiedDiffs.push(formatUnifiedDiff(filePath, changes));
    }

    if (files.length === 0) return undefined;

    return {
      files,
      stats: summarizeChangedFiles(files),
      sourceEventType: "vault-snapshot",
      fileSnapshots,
      unifiedDiff: unifiedDiffs.join("\n")
    };
  }

  getTrackedFiles() {
    const files =
      typeof this.app.vault.getFiles === "function"
        ? this.app.vault.getFiles()
        : this.app.vault.getMarkdownFiles();

    return files.filter((file) => this.isPathAllowed(file.path) && this.isTextFile(file.path));
  }

  isTextFile(filePath) {
    const extension = filePath.split(".").pop();
    return !!extension && TEXT_FILE_EXTENSIONS.has(extension.toLowerCase());
  }

  isPathAllowed(filePath) {
    const normalizedPath = filePath.replace(/\\/g, "/");

    return !this.settings.ignoredFolders.some((ignoredFolder) => {
      const normalizedIgnoredFolder = ignoredFolder.replace(/\/+$/, "");
      return (
        normalizedPath === normalizedIgnoredFolder ||
        normalizedPath.startsWith(`${normalizedIgnoredFolder}/`)
      );
    });
  }
}
