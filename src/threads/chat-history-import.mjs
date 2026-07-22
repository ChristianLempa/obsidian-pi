import fs from "node:fs";
import path from "node:path";

const MARKDOWN_STORAGE_VERSION = 3;
const JSON_STORAGE_VERSION = 2;
const INDEXED_STORAGE_VERSION = 1;

export async function importVaultChatHistory(vaultBasePath, rawData = {}) {
  if (!vaultBasePath) return undefined;

  const basePath = path.resolve(vaultBasePath);
  const configuredFolder = normalizeVaultFolder(rawData.chatHistoryFolder || "chats");
  const version = Number(rawData.chatHistoryStorageVersion) || 0;
  const sources = orderedSources(basePath, configuredFolder, version);
  const threadsById = new Map();
  const managedFiles = new Set();
  const warnings = [];
  let sourceCurrentThreadId;

  for (const source of sources) {
    const result = await source.load();
    sourceCurrentThreadId ??= result.currentThreadId;
    for (const warning of result.warnings) warnings.push(warning);
    for (const filePath of result.managedFiles) managedFiles.add(filePath);
    for (const thread of result.threads) {
      const existing = threadsById.get(thread.id);
      if (!existing || thread.updatedAt >= existing.updatedAt) threadsById.set(thread.id, thread);
    }
  }

  const threads = [...threadsById.values()];
  if (threads.length === 0) return warnings.length > 0 ? { warnings, managedFiles: [] } : undefined;

  const preferredCurrentId =
    rawData.currentChatId ?? sourceCurrentThreadId ?? rawData.chatHistory?.currentThreadId;
  const currentThreadId = threads.some((thread) => thread.id === preferredCurrentId)
    ? preferredCurrentId
    : mostRecentThread(threads).id;

  return {
    history: { currentThreadId, threads },
    managedFiles: [...managedFiles],
    warnings
  };
}

export async function removeImportedVaultChatHistory(vaultBasePath, managedFiles, vault) {
  const basePath = path.resolve(vaultBasePath);
  const directories = new Set();
  for (const filePath of managedFiles || []) {
    const resolved = path.resolve(filePath);
    if (!isInside(basePath, resolved)) continue;
    const vaultPath = path.relative(basePath, resolved).replaceAll(path.sep, "/");
    const abstractFile = vault?.getAbstractFileByPath?.(vaultPath);
    if (abstractFile && abstractFile.extension === "md") await vault.delete(abstractFile, true);
    else await fs.promises.rm(resolved, { force: true });
    directories.add(path.dirname(resolved));
  }

  for (const directory of [...directories].sort((left, right) => right.length - left.length)) {
    await removeEmptyDirectory(directory, basePath);
  }
}

function orderedSources(basePath, configuredFolder, version) {
  const markdownFolder = resolveVaultFolder(basePath, configuredFolder);
  const directJsonFolder = resolveVaultFolder(basePath, "chats");
  const indexedRoot = resolveVaultFolder(basePath, "pi_sessions");
  const sources = {
    markdown: { load: () => loadMarkdownThreads(markdownFolder) },
    json: { load: () => loadJsonThreads(directJsonFolder) },
    indexed: { load: () => loadIndexedThreads(indexedRoot) }
  };
  const preferred =
    version === MARKDOWN_STORAGE_VERSION
      ? "markdown"
      : version === JSON_STORAGE_VERSION
        ? "json"
        : version === INDEXED_STORAGE_VERSION
          ? "indexed"
          : undefined;
  return [
    ...(preferred ? [sources[preferred]] : []),
    ...Object.entries(sources)
      .filter(([name]) => name !== preferred)
      .map(([, source]) => source)
  ];
}

async function loadMarkdownThreads(folder) {
  const result = emptyResult();
  for (const fileName of await listFiles(folder, ".md")) {
    const filePath = path.join(folder, fileName);
    try {
      const thread = parseMarkdownThread(await fs.promises.readFile(filePath, "utf8"));
      if (!thread) continue;
      result.threads.push(thread);
      result.managedFiles.push(filePath);
    } catch (error) {
      result.warnings.push(`${filePath}: ${errorMessage(error)}`);
    }
  }
  for (const fileName of await listFiles(folder, ".json", true)) {
    if (/^\.pi-agent-migration-backup-v\d+\.json$/.test(fileName)) {
      result.managedFiles.push(path.join(folder, fileName));
    }
  }
  return result;
}

async function loadJsonThreads(folder) {
  const result = emptyResult();
  for (const fileName of await listFiles(folder, ".json")) {
    if (fileName.startsWith(".")) continue;
    const filePath = path.join(folder, fileName);
    try {
      const thread = parseJsonThread(JSON.parse(await fs.promises.readFile(filePath, "utf8")));
      result.threads.push(thread);
      result.managedFiles.push(filePath);
    } catch (error) {
      result.warnings.push(`${filePath}: ${errorMessage(error)}`);
    }
  }
  return result;
}

async function loadIndexedThreads(root) {
  const result = await loadJsonThreads(path.join(root, "chats"));
  const indexPath = path.join(root, "index.json");
  if (await exists(indexPath)) {
    result.managedFiles.push(indexPath);
    try {
      const index = JSON.parse(await fs.promises.readFile(indexPath, "utf8"));
      if (typeof index?.currentThreadId === "string")
        result.currentThreadId = index.currentThreadId;
    } catch (error) {
      result.warnings.push(`${indexPath}: ${errorMessage(error)}`);
    }
  }
  const backupPath = path.join(root, "migration-backup-v0.json");
  if (await exists(backupPath)) result.managedFiles.push(backupPath);
  return result;
}

function parseMarkdownThread(content) {
  const frontmatterMatch = content.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);
  if (!frontmatterMatch) return undefined;
  const frontmatter = parseFrontmatter(frontmatterMatch[1]);
  if (frontmatter.pi_agent_chat !== true) return undefined;
  if (frontmatter.pi_agent_schema !== 1) throw new Error("Unsupported chat schema.");

  const thread = {
    id: requiredString(frontmatter.id, "thread ID"),
    title: requiredString(frontmatter.title, "title"),
    messages: parseMarkdownMessages(content.slice(frontmatterMatch[0].length)),
    createdAt: parseDate(frontmatter.created, "created"),
    updatedAt: parseDate(frontmatter.updated, "updated"),
    archived: frontmatter.archived === true,
    favorite: frontmatter.favorite === true,
    piSessionId:
      typeof frontmatter.pi_session === "string" && frontmatter.pi_session.trim()
        ? frontmatter.pi_session.trim()
        : undefined
  };
  validateThread(thread);
  return thread;
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
    const message = { ...metadata, content: content.slice(contentStart, contentEnd) };
    validateMessage(message);
    messages.push(JSON.parse(JSON.stringify(message)));
    startPattern.lastIndex = endPattern.lastIndex;
  }
  return messages;
}

function parseJsonThread(document) {
  const thread = document?.thread ?? document;
  validateThread(thread);
  return JSON.parse(JSON.stringify(thread));
}

function validateThread(thread) {
  if (
    !thread ||
    typeof thread !== "object" ||
    Array.isArray(thread) ||
    typeof thread.id !== "string" ||
    !thread.id ||
    typeof thread.title !== "string" ||
    !Array.isArray(thread.messages) ||
    typeof thread.createdAt !== "number" ||
    !Number.isFinite(thread.createdAt) ||
    typeof thread.updatedAt !== "number" ||
    !Number.isFinite(thread.updatedAt)
  ) {
    throw new Error("Invalid chat thread.");
  }
  for (const message of thread.messages) validateMessage(message);
}

function validateMessage(message) {
  if (
    !message ||
    typeof message !== "object" ||
    Array.isArray(message) ||
    !["user", "assistant", "system"].includes(message.role) ||
    typeof message.content !== "string" ||
    typeof message.createdAt !== "number" ||
    !Number.isFinite(message.createdAt)
  ) {
    throw new Error("Invalid chat message.");
  }
}

function parseFrontmatter(source) {
  const result = {};
  for (const line of source.split(/\r?\n/)) {
    const match = line.match(/^([A-Za-z0-9_]+):\s*(.*)$/);
    if (!match) continue;
    try {
      result[match[1]] = JSON.parse(match[2]);
    } catch {
      result[match[1]] = match[2].trim();
    }
  }
  return result;
}

function parseDate(value, field) {
  const timestamp = typeof value === "string" ? Date.parse(value) : NaN;
  if (!Number.isFinite(timestamp)) throw new Error(`Invalid ${field} timestamp.`);
  return timestamp;
}

function requiredString(value, field) {
  if (typeof value !== "string" || !value.trim()) throw new Error(`Missing ${field}.`);
  return value;
}

function normalizeVaultFolder(value) {
  const normalized = String(value || "chats")
    .trim()
    .replaceAll("\\", "/")
    .replace(/^\/+|\/+$/g, "");
  if (!normalized || normalized.split("/").some((part) => !part || part === "." || part === "..")) {
    return "chats";
  }
  return normalized;
}

function resolveVaultFolder(basePath, folder) {
  const resolved = path.resolve(basePath, folder);
  if (!isInside(basePath, resolved)) throw new Error("Unsafe chat history folder.");
  return resolved;
}

function isInside(basePath, candidate) {
  const relative = path.relative(basePath, candidate);
  return relative !== "" && !relative.startsWith("..") && !path.isAbsolute(relative);
}

async function listFiles(folder, extension, includeHidden = false) {
  try {
    return (await fs.promises.readdir(folder, { withFileTypes: true }))
      .filter(
        (entry) =>
          entry.isFile() &&
          entry.name.endsWith(extension) &&
          (includeHidden || !entry.name.startsWith("."))
      )
      .map((entry) => entry.name)
      .sort();
  } catch (error) {
    if (error?.code === "ENOENT") return [];
    throw error;
  }
}

async function removeEmptyDirectory(directory, boundary) {
  let current = directory;
  while (isInside(boundary, current)) {
    try {
      await fs.promises.rmdir(current);
    } catch (error) {
      if (error?.code === "ENOENT") return;
      if (["ENOTEMPTY", "EEXIST"].includes(error?.code)) return;
      throw error;
    }
    current = path.dirname(current);
  }
}

async function exists(filePath) {
  try {
    await fs.promises.access(filePath);
    return true;
  } catch {
    return false;
  }
}

function emptyResult() {
  return { threads: [], managedFiles: [], warnings: [] };
}

function mostRecentThread(threads) {
  return [...threads].sort((left, right) => right.updatedAt - left.updatedAt)[0];
}

function errorMessage(error) {
  return error instanceof Error ? error.message : String(error);
}
