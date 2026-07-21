import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

export const CHAT_HISTORY_SCHEMA_VERSION = 1;
export const DEFAULT_CHAT_HISTORY_FOLDER = "pi_sessions";

const INDEX_FILE = "index.json";
const CHATS_FOLDER = "chats";
const MIGRATION_BACKUP_FILE = "migration-backup-v0.json";

export class ChatHistoryFileStore {
  constructor(vaultBasePath, folder = DEFAULT_CHAT_HISTORY_FOLDER) {
    if (!vaultBasePath) throw new Error("The vault path is unavailable.");
    this.vaultBasePath = path.resolve(vaultBasePath);
    this.folder = normalizeChatHistoryFolder(folder);
    this.rootPath = resolveVaultRelativePath(this.vaultBasePath, this.folder);
    this.chatsPath = path.join(this.rootPath, CHATS_FOLDER);
    this.indexPath = path.join(this.rootPath, INDEX_FILE);
    this.managedFiles = new Map();
    this.warnings = [];
    this.lastLoadHadValidIndex = false;
  }

  async loadHistory() {
    this.warnings = [];
    this.managedFiles = new Map();
    this.lastLoadHadValidIndex = false;

    const index = await this.readIndex();
    const files = await listJsonFiles(this.chatsPath);
    const threads = [];
    const seenIds = new Set();

    for (const fileName of files) {
      const filePath = path.join(this.chatsPath, fileName);
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

    const currentThreadId = threads.some((thread) => thread.id === index?.currentThreadId)
      ? index.currentThreadId
      : getMostRecentThread(threads).id;

    return { currentThreadId, threads };
  }

  async saveHistory(history) {
    const normalized = normalizeHistorySnapshot(history);
    await fs.promises.mkdir(this.chatsPath, { recursive: true });

    const desiredFiles = new Set();
    for (const thread of normalized.threads) {
      const fileName = threadFileName(thread.id);
      const fingerprint = fingerprintThread(thread);
      desiredFiles.add(fileName);
      if (this.managedFiles.get(fileName) !== fingerprint) {
        await writeJsonAtomic(path.join(this.chatsPath, fileName), {
          schemaVersion: CHAT_HISTORY_SCHEMA_VERSION,
          thread
        });
      }
      this.managedFiles.set(fileName, fingerprint);
    }

    for (const fileName of [...this.managedFiles.keys()]) {
      if (desiredFiles.has(fileName)) continue;
      await removeIfExists(path.join(this.chatsPath, fileName));
      this.managedFiles.delete(fileName);
    }

    await writeJsonAtomic(this.indexPath, createIndex(normalized));
    this.lastLoadHadValidIndex = true;
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
    const verified = await this.loadHistory();
    verifyMigration(normalized, verified);
    return verified;
  }

  async removeManagedHistory() {
    for (const fileName of this.managedFiles.keys()) {
      await removeIfExists(path.join(this.chatsPath, fileName));
    }
    await removeIfExists(this.indexPath);
    this.managedFiles = new Map();
  }

  getMigrationBackupPath() {
    return path.join(this.rootPath, MIGRATION_BACKUP_FILE);
  }

  async readIndex() {
    try {
      const index = JSON.parse(await fs.promises.readFile(this.indexPath, "utf8"));
      if (index?.schemaVersion !== CHAT_HISTORY_SCHEMA_VERSION || !Array.isArray(index.threads)) {
        throw new Error("Unsupported or malformed history index.");
      }
      this.lastLoadHadValidIndex = true;
      return index;
    } catch (error) {
      if (error?.code !== "ENOENT") {
        this.warnings.push(
          `${INDEX_FILE}: ${error instanceof Error ? error.message : String(error)}`
        );
      }
      return undefined;
    }
  }
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
  if (threadFileName(thread.id) !== fileName)
    throw new Error("Thread filename does not match its ID.");
  return cloneJson(thread);
}

function createIndex(history) {
  return {
    schemaVersion: CHAT_HISTORY_SCHEMA_VERSION,
    currentThreadId: history.currentThreadId,
    threads: history.threads.map((thread) => ({
      id: thread.id,
      file: threadFileName(thread.id),
      updatedAt: thread.updatedAt
    }))
  };
}

function threadFileName(threadId) {
  const digest = crypto.createHash("sha256").update(threadId).digest("hex").slice(0, 24);
  return `thread-${digest}.json`;
}

function fingerprintThread(thread) {
  return crypto.createHash("sha256").update(JSON.stringify(thread)).digest("hex");
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

function verifyMigration(expected, actual) {
  if (!actual || actual.threads.length !== expected.threads.length) {
    throw new Error("Chat history migration verification failed: thread count differs.");
  }
  const actualById = new Map(actual.threads.map((thread) => [thread.id, thread]));
  for (const thread of expected.threads) {
    const migrated = actualById.get(thread.id);
    if (!migrated || migrated.messages.length !== thread.messages.length) {
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
