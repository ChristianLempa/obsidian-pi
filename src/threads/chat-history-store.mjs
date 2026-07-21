import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

export const CHAT_HISTORY_SCHEMA_VERSION = 1;
export const CHAT_HISTORY_STORAGE_VERSION = 3;
export const DEFAULT_CHAT_HISTORY_FOLDER = "chats";

const LEGACY_INDEX_FILE = "index.json";
const LEGACY_CHATS_FOLDER = "chats";
const MARKDOWN_EXTENSION = ".md";

export class ChatHistoryFileStore {
  constructor(vaultBasePath, folder = DEFAULT_CHAT_HISTORY_FOLDER, vault) {
    if (!vaultBasePath) throw new Error("The vault path is unavailable.");
    this.vaultBasePath = path.resolve(vaultBasePath);
    this.folder = normalizeChatHistoryFolder(folder);
    this.rootPath = resolveVaultRelativePath(this.vaultBasePath, this.folder);
    this.vault = vault;
    this.managedFiles = new Map();
    this.fileByThreadId = new Map();
    this.warnings = [];
  }

  async loadHistory(currentThreadId) {
    this.warnings = [];
    this.managedFiles = new Map();
    this.fileByThreadId = new Map();

    const files = await this.listManagedMarkdownFiles();
    const threads = [];
    const seenIds = new Set();

    for (const fileName of files) {
      try {
        const thread = readMarkdownThreadDocument(await this.readManagedFile(fileName));
        if (!thread) continue;
        if (seenIds.has(thread.id)) throw new Error(`Duplicate thread ID ${thread.id}.`);
        seenIds.add(thread.id);
        threads.push(thread);
        this.managedFiles.set(fileName, fingerprintThread(thread));
        this.fileByThreadId.set(thread.id, fileName);
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
    await this.ensureManagedFolder();

    const desiredFiles = new Set();
    for (const thread of normalized.threads) {
      const fileName = this.fileByThreadId.get(thread.id) ?? threadFileName(thread.id);
      const fingerprint = fingerprintThread(thread);
      desiredFiles.add(fileName);
      if (this.managedFiles.get(fileName) !== fingerprint) {
        await this.writeManagedFile(fileName, renderMarkdownThread(thread));
      }
      this.managedFiles.set(fileName, fingerprint);
      this.fileByThreadId.set(thread.id, fileName);
    }

    for (const [fileName] of [...this.managedFiles]) {
      if (desiredFiles.has(fileName)) continue;
      await this.removeManagedFile(fileName);
      this.managedFiles.delete(fileName);
    }
    for (const [threadId, fileName] of [...this.fileByThreadId]) {
      if (!desiredFiles.has(fileName)) this.fileByThreadId.delete(threadId);
    }
  }

  async migrateLegacyHistory(history, sourceVersion = 0) {
    const normalized = normalizeHistorySnapshot(history);
    await this.ensureManagedFolder();
    const backupPath = this.getMigrationBackupPath(sourceVersion);
    if (!(await exists(backupPath))) {
      await writeJsonAtomic(backupPath, {
        schemaVersion: sourceVersion,
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
      await this.removeManagedFile(fileName);
    }
    this.managedFiles = new Map();
    this.fileByThreadId = new Map();
  }

  async listManagedMarkdownFiles() {
    if (!this.vault) return listFilesWithExtension(this.rootPath, MARKDOWN_EXTENSION);
    return this.vault
      .getMarkdownFiles()
      .filter((file) => path.posix.dirname(file.path) === this.folder)
      .map((file) => file.name)
      .sort();
  }

  async readManagedFile(fileName) {
    if (!this.vault) return fs.promises.readFile(path.join(this.rootPath, fileName), "utf8");
    const file = this.vault.getAbstractFileByPath(`${this.folder}/${fileName}`);
    if (!file) throw new Error("Chat file is unavailable in the vault.");
    return this.vault.read(file);
  }

  async ensureManagedFolder() {
    if (!this.vault) {
      await fs.promises.mkdir(this.rootPath, { recursive: true });
      return;
    }
    let current = "";
    for (const segment of this.folder.split("/")) {
      current = current ? `${current}/${segment}` : segment;
      if (!this.vault.getAbstractFileByPath(current)) await this.vault.createFolder(current);
    }
  }

  async writeManagedFile(fileName, content) {
    if (!this.vault) {
      await writeTextAtomic(path.join(this.rootPath, fileName), content);
      return;
    }
    const vaultPath = `${this.folder}/${fileName}`;
    const file = this.vault.getAbstractFileByPath(vaultPath);
    if (file) await this.vault.modify(file, content);
    else await this.vault.create(vaultPath, content);
  }

  async removeManagedFile(fileName) {
    if (!this.vault) {
      await removeIfExists(path.join(this.rootPath, fileName));
      return;
    }
    const file = this.vault.getAbstractFileByPath(`${this.folder}/${fileName}`);
    if (file) await this.vault.delete(file, true);
  }

  getMigrationBackupPath(sourceVersion = 0) {
    return path.join(this.rootPath, `.pi-agent-migration-backup-v${sourceVersion}.json`);
  }
}

export async function loadLegacyJsonHistory(vaultBasePath, folder = "chats", currentThreadId) {
  const rootPath = resolveVaultRelativePath(
    path.resolve(vaultBasePath),
    normalizeChatHistoryFolder(folder)
  );
  const threads = await loadLegacyJsonThreads(rootPath);
  if (threads.length === 0) return undefined;
  return {
    currentThreadId: threads.some((thread) => thread.id === currentThreadId)
      ? currentThreadId
      : getMostRecentThread(threads).id,
    threads
  };
}

export async function removeLegacyJsonHistory(vaultBasePath, folder = "chats") {
  const rootPath = resolveVaultRelativePath(
    path.resolve(vaultBasePath),
    normalizeChatHistoryFolder(folder)
  );
  for (const fileName of await listVisibleJsonFiles(rootPath)) {
    const filePath = path.join(rootPath, fileName);
    try {
      readLegacyThreadDocument(JSON.parse(await fs.promises.readFile(filePath, "utf8")));
      await removeIfExists(filePath);
    } catch {
      // Preserve unknown or malformed files.
    }
  }
}

export async function loadLegacyIndexedHistory(vaultBasePath, folder = "pi_sessions") {
  const rootPath = resolveVaultRelativePath(
    path.resolve(vaultBasePath),
    normalizeChatHistoryFolder(folder)
  );
  const chatsPath = path.join(rootPath, LEGACY_CHATS_FOLDER);
  const threads = await loadLegacyJsonThreads(chatsPath);
  if (threads.length === 0) return undefined;

  let currentThreadId;
  try {
    const index = JSON.parse(
      await fs.promises.readFile(path.join(rootPath, LEGACY_INDEX_FILE), "utf8")
    );
    currentThreadId = index?.currentThreadId;
  } catch {
    // The old index was rebuildable; fall back to the most recently updated chat.
  }

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
  for (const fileName of await listVisibleJsonFiles(chatsPath)) {
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

function renderMarkdownThread(thread) {
  const frontmatter = [
    "---",
    "pi_agent_chat: true",
    `pi_agent_schema: ${CHAT_HISTORY_SCHEMA_VERSION}`,
    `id: ${JSON.stringify(thread.id)}`,
    `title: ${JSON.stringify(thread.title)}`,
    `created: ${JSON.stringify(toIsoDate(thread.createdAt))}`,
    `updated: ${JSON.stringify(toIsoDate(thread.updatedAt))}`,
    `archived: ${thread.archived === true}`,
    `favorite: ${thread.favorite === true}`,
    `pi_session: ${thread.piSessionId ? JSON.stringify(thread.piSessionId) : "null"}`,
    "---"
  ];
  const sections = thread.messages.map((message, index) => {
    const messageId = createMessageId(thread.id, message, index);
    const metadata = { ...message };
    delete metadata.content;
    const encodedMetadata = Buffer.from(JSON.stringify(metadata), "utf8").toString("base64url");
    return [
      `## ${roleHeading(message.role)}`,
      "",
      `<!-- pi-agent-message:start ${messageId} ${encodedMetadata} -->`,
      message.content,
      `<!-- pi-agent-message:end ${messageId} -->`
    ].join("\n");
  });
  return `${frontmatter.join("\n")}\n\n# ${escapeHeading(thread.title)}${
    sections.length > 0 ? `\n\n${sections.join("\n\n")}` : ""
  }\n`;
}

function readMarkdownThreadDocument(content) {
  const frontmatterMatch = content.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);
  if (!frontmatterMatch) return undefined;
  const frontmatter = parseFrontmatter(frontmatterMatch[1]);
  if (frontmatter.pi_agent_chat !== true) return undefined;
  if (frontmatter.pi_agent_schema !== CHAT_HISTORY_SCHEMA_VERSION) {
    throw new Error("Unsupported chat history schema version.");
  }
  if (typeof frontmatter.id !== "string" || !frontmatter.id.trim()) {
    throw new Error("Missing thread ID in frontmatter.");
  }
  if (typeof frontmatter.title !== "string") throw new Error("Missing chat title.");

  const messages = parseMarkdownMessages(content.slice(frontmatterMatch[0].length));
  const createdAt = parseDate(frontmatter.created, "created");
  const updatedAt = parseDate(frontmatter.updated, "updated");
  const piSessionId =
    typeof frontmatter.pi_session === "string" && frontmatter.pi_session.trim()
      ? frontmatter.pi_session.trim()
      : undefined;

  return {
    id: frontmatter.id,
    title: frontmatter.title,
    messages,
    createdAt,
    updatedAt,
    archived: frontmatter.archived === true,
    favorite: frontmatter.favorite === true,
    piSessionId
  };
}

function parseMarkdownMessages(content) {
  const messages = [];
  const startPattern = /^<!-- pi-agent-message:start ([A-Za-z0-9_-]+) ([A-Za-z0-9_-]+) -->\r?$/gm;
  let start;

  while ((start = startPattern.exec(content)) !== null) {
    const [, messageId, encodedMetadata] = start;
    const endPattern = new RegExp(`^<!-- pi-agent-message:end ${messageId} -->\\r?$`, "gm");
    endPattern.lastIndex = startPattern.lastIndex;
    const end = endPattern.exec(content);
    if (!end) throw new Error(`Missing end marker for message ${messageId}.`);

    let contentStart = startPattern.lastIndex;
    if (content.startsWith("\r\n", contentStart)) contentStart += 2;
    else if (content.startsWith("\n", contentStart)) contentStart += 1;
    let contentEnd = end.index;
    if (content.slice(Math.max(contentStart, contentEnd - 2), contentEnd) === "\r\n") {
      contentEnd -= 2;
    } else if (contentEnd > contentStart && content[contentEnd - 1] === "\n") {
      contentEnd -= 1;
    }

    let metadata;
    try {
      metadata = JSON.parse(Buffer.from(encodedMetadata, "base64url").toString("utf8"));
    } catch {
      throw new Error(`Invalid metadata for message ${messageId}.`);
    }
    const message = {
      role: metadata.role,
      content: content.slice(contentStart, contentEnd),
      createdAt: metadata.createdAt,
      contextUsage: metadata.contextUsage,
      tokenUsage: metadata.tokenUsage,
      runMetadata: metadata.runMetadata,
      thinking: metadata.thinking,
      toolErrors: metadata.toolErrors
    };
    validateMessage(message);
    messages.push(cloneJson(message));
    startPattern.lastIndex = endPattern.lastIndex;
  }
  return messages;
}

function parseFrontmatter(source) {
  const result = {};
  for (const line of source.split(/\r?\n/)) {
    const match = line.match(/^([A-Za-z0-9_]+):\s*(.*)$/);
    if (!match) continue;
    const [, key, rawValue] = match;
    try {
      result[key] = JSON.parse(rawValue);
    } catch {
      result[key] = rawValue.trim();
    }
  }
  return result;
}

function parseDate(value, field) {
  const timestamp = typeof value === "string" ? Date.parse(value) : NaN;
  if (!Number.isFinite(timestamp)) throw new Error(`Invalid ${field} timestamp.`);
  return timestamp;
}

function toIsoDate(value) {
  const timestamp = typeof value === "number" && Number.isFinite(value) ? value : Date.now();
  return new Date(timestamp).toISOString();
}

function validateMessage(message) {
  if (
    !message ||
    typeof message !== "object" ||
    Array.isArray(message) ||
    (message.role !== "user" && message.role !== "assistant" && message.role !== "system") ||
    typeof message.content !== "string" ||
    typeof message.createdAt !== "number" ||
    !Number.isFinite(message.createdAt)
  ) {
    throw new Error("Invalid message record.");
  }
}

async function loadLegacyJsonThreads(folder) {
  const threads = [];
  for (const fileName of await listVisibleJsonFiles(folder)) {
    try {
      const document = JSON.parse(await fs.promises.readFile(path.join(folder, fileName), "utf8"));
      threads.push(readLegacyThreadDocument(document));
    } catch {
      // Leave unreadable legacy files in place for manual recovery.
    }
  }
  return threads;
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
  for (const message of thread.messages) validateMessage(message);
  return cloneJson(thread);
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

function threadFileName(threadId) {
  if (/^[A-Za-z0-9._-]+$/.test(threadId) && threadId.length <= 157) {
    return `${threadId}${MARKDOWN_EXTENSION}`;
  }
  const digest = crypto.createHash("sha256").update(threadId).digest("hex").slice(0, 16);
  const prefix = threadId
    .replace(/[^A-Za-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
  return `${prefix || "thread"}-${digest}${MARKDOWN_EXTENSION}`;
}

function createMessageId(threadId, message, index) {
  return `message-${crypto
    .createHash("sha256")
    .update(`${threadId}\0${message.role}\0${message.createdAt}\0${index}`)
    .digest("hex")
    .slice(0, 16)}`;
}

function roleHeading(role) {
  return role === "user" ? "You" : role === "assistant" ? "Agent" : "System";
}

function escapeHeading(value) {
  return (
    String(value)
      .replaceAll("\n", " ")
      .replace(/^#+\s*/, "")
      .trim() || "New chat"
  );
}

function fingerprintThread(thread) {
  return crypto.createHash("sha256").update(JSON.stringify(thread)).digest("hex");
}

async function listVisibleJsonFiles(folder) {
  return (await listFilesWithExtension(folder, ".json")).filter(
    (fileName) => !fileName.startsWith(".") && !fileName.startsWith("_")
  );
}

async function listFilesWithExtension(folder, extension) {
  try {
    return (await fs.promises.readdir(folder, { withFileTypes: true }))
      .filter((entry) => entry.isFile() && entry.name.endsWith(extension))
      .map((entry) => entry.name)
      .sort();
  } catch (error) {
    if (error?.code === "ENOENT") return [];
    throw error;
  }
}

async function writeJsonAtomic(filePath, value) {
  await writeTextAtomic(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

async function writeTextAtomic(filePath, content) {
  await fs.promises.mkdir(path.dirname(filePath), { recursive: true });
  const temporaryPath = `${filePath}.tmp-${process.pid}-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2)}`;
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
