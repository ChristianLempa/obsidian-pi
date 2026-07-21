import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

export const CHAT_HISTORY_SCHEMA_VERSION = 1;
export const CHAT_HISTORY_STORAGE_VERSION = 2;
export const DEFAULT_CHAT_HISTORY_FOLDER = "chats";

const MIGRATION_BACKUP_FILE = ".pi-agent-migration-backup-v0.json";
const LEGACY_INDEX_FILE = "index.json";
const LEGACY_CHATS_FOLDER = "chats";

export class ChatHistoryFileStore {
  constructor(vaultBasePath, folder = DEFAULT_CHAT_HISTORY_FOLDER) {
    if (!vaultBasePath) throw new Error("The vault path is unavailable.");
    this.vaultBasePath = path.resolve(vaultBasePath);
    this.folder = normalizeChatHistoryFolder(folder);
    this.rootPath = resolveVaultRelativePath(this.vaultBasePath, this.folder);
    this.managedFiles = new Map();
    this.warnings = [];
  }

  async loadHistory(currentThreadId) {
    this.warnings = [];
    this.managedFiles = new Map();

    const files = await listChatFiles(this.rootPath);
    const threads = [];
    const seenIds = new Set();

    for (const fileName of files) {
      const filePath = path.join(this.rootPath, fileName);
      try {
        const document = JSON.parse(await fs.promises.readFile(filePath, "utf8"));
        const thread = readThreadDocument(document, fileName);
        if (seenIds.has(thread.id)) throw new Error(`Duplicate thread ID ${thread.id}.`);
        seenIds.add(thread.id);
        threads.push(thread);
        this.managedFiles.set(fileName, fingerprintThread(thread));
      } catch (error) {
        this.warnings.push(
          `${fileName}: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    }

    if (threads.length === 0) return undefined;

    return {
      currentThreadId: threads.some((thread) => thread.id === currentThreadId)
        ? currentThreadId
        : getMostRecentThread(threads).id,
      threads
    };
  }

  async saveHistory(history) {
    const normalized = normalizeHistorySnapshot(history);
    await fs.promises.mkdir(this.rootPath, { recursive: true });

    const desiredFiles = new Set();
    for (const thread of normalized.threads) {
      const fileName = threadFileName(thread.id);
      const fingerprint = fingerprintThread(thread);
      desiredFiles.add(fileName);
      if (this.managedFiles.get(fileName) !== fingerprint) {
        await writeJsonAtomic(path.join(this.rootPath, fileName), {
          schemaVersion: CHAT_HISTORY_SCHEMA_VERSION,
          thread
        });
      }
      this.managedFiles.set(fileName, fingerprint);
    }

    for (const fileName of [...this.managedFiles.keys()]) {
      if (desiredFiles.has(fileName)) continue;
      await removeIfExists(path.join(this.rootPath, fileName));
      this.managedFiles.delete(fileName);
    }
  }

  async migrateLegacyHistory(history) {
    const normalized = normalizeHistorySnapshot(history);
    await fs.promises.mkdir(this.rootPath, { recursive: true });
    const backupPath = path.join(this.rootPath, MIGRATION_BACKUP_FILE);
    if (!(await exists(backupPath))) {
      await writeJsonAtomic(backupPath, {
        schemaVersion: 0,
        exportedAt: new Date().toISOString(),
        chatHistory: normalized
      });
    }

    await this.saveHistory(normalized);
    const verified = await this.loadHistory(normalized.currentThreadId);
    verifyMigration(normalized, verified);
    return verified;
  }

  async removeManagedHistory() {
    for (const fileName of this.managedFiles.keys()) {
      await removeIfExists(path.join(this.rootPath, fileName));
    }
    this.managedFiles = new Map();
  }

  getMigrationBackupPath() {
    return path.join(this.rootPath, MIGRATION_BACKUP_FILE);
  }
}

export async function loadLegacyIndexedHistory(vaultBasePath, folder = "pi_sessions") {
  const rootPath = resolveVaultRelativePath(
    path.resolve(vaultBasePath),
    normalizeChatHistoryFolder(folder)
  );
  const chatsPath = path.join(rootPath, LEGACY_CHATS_FOLDER);
  const files = await listJsonFiles(chatsPath);
  if (files.length === 0) return undefined;

  let currentThreadId;
  try {
    const index = JSON.parse(
      await fs.promises.readFile(path.join(rootPath, LEGACY_INDEX_FILE), "utf8")
    );
    currentThreadId = index?.currentThreadId;
  } catch {
    // The old index was rebuildable; fall back to the most recently updated chat.
  }

  const threads = [];
  for (const fileName of files) {
    try {
      const document = JSON.parse(
        await fs.promises.readFile(path.join(chatsPath, fileName), "utf8")
      );
      threads.push(readLegacyThreadDocument(document));
    } catch {
      // Leave unreadable old-layout files in place for manual recovery.
    }
  }
  if (threads.length === 0) return undefined;
  return {
    currentThreadId: threads.some((thread) => thread.id === currentThreadId)
      ? currentThreadId
      : getMostRecentThread(threads).id,
    threads
  };
}

export async function removeLegacyIndexedHistory(vaultBasePath, folder = "pi_sessions") {
  const rootPath = resolveVaultRelativePath(
    path.resolve(vaultBasePath),
    normalizeChatHistoryFolder(folder)
  );
  const chatsPath = path.join(rootPath, LEGACY_CHATS_FOLDER);
  for (const fileName of await listJsonFiles(chatsPath)) {
    const filePath = path.join(chatsPath, fileName);
    try {
      readLegacyThreadDocument(JSON.parse(await fs.promises.readFile(filePath, "utf8")));
      await removeIfExists(filePath);
    } catch {
      // Preserve unknown or malformed files.
    }
  }
  await removeIfExists(path.join(rootPath, LEGACY_INDEX_FILE));
  await removeIfExists(path.join(rootPath, "migration-backup-v0.json"));
  await removeEmptyDirectory(chatsPath);
  await removeEmptyDirectory(rootPath);
}

export function normalizeChatHistoryFolder(value) {
  const input = String(value ?? "")
    .trim()
    .replaceAll("\\", "/");
  if (!input) return DEFAULT_CHAT_HISTORY_FOLDER;
  if (input.startsWith("/") || /^[A-Za-z]:\//.test(input)) {
    throw new Error("Chat history folder must be a safe vault-relative path.");
  }
  const normalized = input.replace(/\/+$/g, "");
  if (
    normalized.includes("\0") ||
    path.posix.isAbsolute(normalized) ||
    normalized.split("/").some((segment) => !segment || segment === "." || segment === "..")
  ) {
    throw new Error("Chat history folder must be a safe vault-relative path.");
  }
  return normalized;
}

export function hasLegacyChatHistory(history, legacyMessages) {
  if (Array.isArray(legacyMessages) && legacyMessages.length > 0) return true;
  if (!history || !Array.isArray(history.threads)) return false;
  return history.threads.some(
    (thread) =>
      (Array.isArray(thread?.messages) && thread.messages.length > 0) ||
      Boolean(thread?.piSessionId ?? thread?.piThreadId) ||
      thread?.archived === true ||
      thread?.favorite === true ||
      (typeof thread?.title === "string" && thread.title.trim() && thread.title !== "New chat")
  );
}

function resolveVaultRelativePath(vaultBasePath, folder) {
  const resolved = path.resolve(vaultBasePath, ...folder.split("/"));
  const relative = path.relative(vaultBasePath, resolved);
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error("Chat history folder must stay inside the vault.");
  }
  return resolved;
}

function normalizeHistorySnapshot(history) {
  const threads = Array.isArray(history?.threads) ? history.threads.map(cloneJson) : [];
  if (threads.length === 0) throw new Error("Chat history must contain at least one thread.");
  const currentThreadId = threads.some((thread) => thread.id === history?.currentThreadId)
    ? history.currentThreadId
    : getMostRecentThread(threads).id;
  return { currentThreadId, threads };
}

function readThreadDocument(document, fileName) {
  const thread = readLegacyThreadDocument(document);
  if (threadFileName(thread.id) !== fileName) {
    throw new Error("Thread filename does not match its ID.");
  }
  return thread;
}

function readLegacyThreadDocument(document) {
  if (document?.schemaVersion !== CHAT_HISTORY_SCHEMA_VERSION) {
    throw new Error("Unsupported chat history schema version.");
  }
  const thread = document.thread;
  if (!thread || typeof thread !== "object" || Array.isArray(thread)) {
    throw new Error("Missing thread object.");
  }
  if (typeof thread.id !== "string" || !thread.id.trim()) {
    throw new Error("Missing thread ID.");
  }
  if (!Array.isArray(thread.messages)) throw new Error("Missing message list.");
  if (
    thread.messages.some(
      (message) =>
        !message ||
        typeof message !== "object" ||
        Array.isArray(message) ||
        (message.role !== "user" && message.role !== "assistant" && message.role !== "system") ||
        typeof message.content !== "string" ||
        typeof message.createdAt !== "number" ||
        !Number.isFinite(message.createdAt)
    )
  ) {
    throw new Error("Invalid message record.");
  }
  return cloneJson(thread);
}

function threadFileName(threadId) {
  if (/^[A-Za-z0-9._-]+$/.test(threadId) && threadId.length <= 160) return `${threadId}.json`;
  const digest = crypto.createHash("sha256").update(threadId).digest("hex").slice(0, 16);
  const prefix = threadId
    .replace(/[^A-Za-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
  return `${prefix || "thread"}-${digest}.json`;
}

function fingerprintThread(thread) {
  return crypto.createHash("sha256").update(JSON.stringify(thread)).digest("hex");
}

async function listChatFiles(folder) {
  return (await listJsonFiles(folder)).filter(
    (fileName) => !fileName.startsWith(".") && !fileName.startsWith("_")
  );
}

async function listJsonFiles(folder) {
  try {
    return (await fs.promises.readdir(folder, { withFileTypes: true }))
      .filter((entry) => entry.isFile() && entry.name.endsWith(".json"))
      .map((entry) => entry.name)
      .sort();
  } catch (error) {
    if (error?.code === "ENOENT") return [];
    throw error;
  }
}

async function writeJsonAtomic(filePath, value) {
  await fs.promises.mkdir(path.dirname(filePath), { recursive: true });
  const temporaryPath = `${filePath}.tmp-${process.pid}-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2)}`;
  const content = `${JSON.stringify(value, null, 2)}\n`;
  try {
    await fs.promises.writeFile(temporaryPath, content, { encoding: "utf8", flag: "wx" });
    try {
      await fs.promises.rename(temporaryPath, filePath);
    } catch (error) {
      if (error?.code !== "EEXIST" && error?.code !== "EPERM") throw error;
      await removeIfExists(filePath);
      await fs.promises.rename(temporaryPath, filePath);
    }
  } finally {
    await removeIfExists(temporaryPath);
  }
}

async function exists(filePath) {
  try {
    await fs.promises.access(filePath);
    return true;
  } catch (error) {
    if (error?.code === "ENOENT") return false;
    throw error;
  }
}

async function removeIfExists(filePath) {
  try {
    await fs.promises.rm(filePath, { force: true });
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
  }
}

async function removeEmptyDirectory(folder) {
  try {
    await fs.promises.rmdir(folder);
  } catch (error) {
    if (error?.code !== "ENOENT" && error?.code !== "ENOTEMPTY") throw error;
  }
}

function verifyMigration(expected, actual) {
  if (!actual || actual.threads.length !== expected.threads.length) {
    throw new Error("Chat history migration verification failed: thread count differs.");
  }
  const actualById = new Map(actual.threads.map((thread) => [thread.id, thread]));
  for (const thread of expected.threads) {
    const migrated = actualById.get(thread.id);
    if (!migrated || JSON.stringify(migrated) !== JSON.stringify(thread)) {
      throw new Error(`Chat history migration verification failed for ${thread.id}.`);
    }
  }
}

function getMostRecentThread(threads) {
  return [...threads].sort((left, right) => (right.updatedAt ?? 0) - (left.updatedAt ?? 0))[0];
}

function cloneJson(value) {
  return JSON.parse(JSON.stringify(value));
}
