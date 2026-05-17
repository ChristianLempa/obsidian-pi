import path from "node:path";
import { diffLines, formatUnifiedDiff, splitLines, summarizeChangedFiles } from "./diff.mjs";

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

const PATH_KEY_PATTERN = /(^|_)(path|file|filename|target|source|destination)(_|$)/i;
const UNKNOWN_WRITE_TOOLS = new Set(["bash", "shell", "terminal", "exec"]);

export class ChangeTracker {
  constructor(app, settings, vaultBasePath = "") {
    this.app = app;
    this.settings = settings;
    this.vaultBasePath = normalizePath(vaultBasePath);
  }

  async beginRun({ useFullSnapshot = false } = {}) {
    if (useFullSnapshot) {
      const before = await this.snapshot();
      return new SnapshotChangeRun(this, before);
    }

    return new TouchedFileChangeRun(this);
  }

  async snapshot() {
    const files = this.getTrackedFiles();
    const maxFiles = this.settings.maxChangeSnapshotFiles || 500;

    if (files.length > maxFiles) {
      throw new Error(
        `Pi Agent change tracking found ${files.length} text files, which exceeds the configured limit of ${maxFiles}. Increase Max tracked files or add ignored folders before using Edit or Full agent mode.`
      );
    }

    const fileContents = new Map();
    for (const file of files) fileContents.set(file.path, await this.app.vault.cachedRead(file));

    return { files: fileContents };
  }

  async diff(beforeSnapshot) {
    const afterSnapshot = await this.snapshot();
    return diffSnapshots(beforeSnapshot, afterSnapshot, "vault-snapshot");
  }

  async snapshotPaths(paths) {
    const fileContents = new Map();

    for (const filePath of paths) {
      const normalizedPath = this.normalizeVaultPath(filePath);
      if (!this.isPathAllowed(normalizedPath) || !this.isTextFile(normalizedPath)) continue;

      const file = this.getFileByPath(normalizedPath);
      fileContents.set(normalizedPath, file ? await this.app.vault.cachedRead(file) : undefined);
    }

    return { files: fileContents };
  }

  getFileByPath(filePath) {
    const file = this.app.vault.getAbstractFileByPath?.(filePath);
    if (file && typeof file.path === "string") return file;

    return this.getTrackedFiles().find((trackedFile) => trackedFile.path === filePath);
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

  normalizeVaultPath(filePath) {
    let normalizedPath = normalizePath(filePath);
    if (!normalizedPath) return normalizedPath;

    if (this.vaultBasePath && normalizedPath.startsWith(`${this.vaultBasePath}/`)) {
      normalizedPath = normalizedPath.slice(this.vaultBasePath.length + 1);
    }

    return normalizedPath.replace(/^\.\//, "").replace(/^\/+/, "");
  }
}

class SnapshotChangeRun {
  constructor(tracker, beforeSnapshot) {
    this.tracker = tracker;
    this.beforeSnapshot = beforeSnapshot;
  }

  handlePiEvent() {}

  async finish() {
    return this.tracker.diff(this.beforeSnapshot);
  }

  stop() {}
}

class TouchedFileChangeRun {
  constructor(tracker) {
    this.tracker = tracker;
    this.paths = new Set();
    this.beforeFiles = new Map();
    this.pendingSnapshots = [];
    this.lateUncapturedPaths = new Set();
    this.eventRefs = this.registerVaultListeners();
  }

  handlePiEvent(event) {
    if (isUnknownWriteToolEvent(event)) return;

    for (const filePath of extractToolFilePaths(event))
      this.trackPath(filePath, { captureBefore: true });
  }

  async finish() {
    await Promise.allSettled(this.pendingSnapshots);
    this.stop();

    const reliablePaths = [...this.paths].filter(
      (filePath) => !this.lateUncapturedPaths.has(filePath) || this.beforeFiles.has(filePath)
    );
    if (reliablePaths.length === 0) return undefined;

    const beforeSnapshot = {
      files: new Map(reliablePaths.map((filePath) => [filePath, this.beforeFiles.get(filePath)]))
    };
    const afterSnapshot = await this.tracker.snapshotPaths(reliablePaths);
    return diffSnapshots(beforeSnapshot, afterSnapshot, "touched-files");
  }

  stop() {
    if (!this.eventRefs) return;
    for (const eventRef of this.eventRefs) this.tracker.app.vault.offref?.(eventRef);
    this.eventRefs = undefined;
  }

  trackPath(filePath, { captureBefore }) {
    const normalizedPath = this.tracker.normalizeVaultPath(filePath);
    if (
      !normalizedPath ||
      !this.tracker.isPathAllowed(normalizedPath) ||
      !this.tracker.isTextFile(normalizedPath)
    )
      return;

    this.paths.add(normalizedPath);
    if (captureBefore) this.captureBefore(normalizedPath);
    if (!captureBefore && !this.beforeFiles.has(normalizedPath))
      this.lateUncapturedPaths.add(normalizedPath);
  }

  captureBefore(filePath) {
    if (this.beforeFiles.has(filePath)) return;

    const pendingSnapshot = this.tracker.snapshotPaths([filePath]).then((snapshot) => {
      this.beforeFiles.set(filePath, snapshot.files.get(filePath));
    });
    this.pendingSnapshots.push(pendingSnapshot);
  }

  registerVaultListeners() {
    const vault = this.tracker.app.vault;
    if (typeof vault.on !== "function") return [];

    return [
      vault.on("create", (file) => this.trackPath(file?.path, { captureBefore: false })),
      vault.on("modify", (file) => this.trackPath(file?.path, { captureBefore: false })),
      vault.on("delete", (file) => this.trackPath(file?.path, { captureBefore: false })),
      vault.on("rename", (file, oldPath) => {
        this.trackPath(oldPath, { captureBefore: false });
        this.trackPath(file?.path, { captureBefore: false });
      })
    ].filter(Boolean);
  }
}

function diffSnapshots(beforeSnapshot, afterSnapshot, sourceEventType) {
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
    sourceEventType,
    fileSnapshots,
    unifiedDiff: unifiedDiffs.join("\n")
  };
}

function extractToolFilePaths(event) {
  if (!event || !event.toolName) return [];

  const values = [];
  collectPathValues(event.toolArgs ?? event.raw?.args, values);
  return values;
}

function collectPathValues(value, values, key = "") {
  if (!value) return;

  if (typeof value === "string") {
    if (PATH_KEY_PATTERN.test(key) || looksLikeFilePath(value)) values.push(value);
    return;
  }

  if (Array.isArray(value)) {
    for (const item of value) collectPathValues(item, values, key);
    return;
  }

  if (typeof value === "object") {
    for (const [childKey, childValue] of Object.entries(value)) {
      collectPathValues(childValue, values, childKey);
    }
  }
}

function isUnknownWriteToolEvent(event) {
  if (event?.type !== "tool_start" && event?.type !== "tool_update" && event?.type !== "tool_end") {
    return false;
  }

  return UNKNOWN_WRITE_TOOLS.has(String(event.toolName ?? "").toLowerCase());
}

function looksLikeFilePath(value) {
  return /(^\.?\.?\/|\\|\.[a-z0-9]{1,8}$)/i.test(value) && !value.includes("\n");
}

function normalizePath(filePath = "") {
  return path.normalize(String(filePath)).replace(/\\/g, "/");
}
