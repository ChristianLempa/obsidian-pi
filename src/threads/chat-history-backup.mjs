import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const BACKUP_SCHEMA_VERSION = 1;
const BACKUP_FILE = "chat-history.backup.json";
const PREVIOUS_BACKUP_FILE = "chat-history.backup.previous.json";

export async function writeChatHistoryBackup(pluginDirectory, history) {
  if (!pluginDirectory) throw new Error("The plugin directory is unavailable.");
  const normalized = cloneHistory(history);
  const payload = {
    schemaVersion: BACKUP_SCHEMA_VERSION,
    savedAt: new Date().toISOString(),
    checksum: checksum(normalized),
    chatHistory: normalized
  };
  await fs.promises.mkdir(pluginDirectory, { recursive: true });

  const backupPath = path.join(pluginDirectory, BACKUP_FILE);
  const previousPath = path.join(pluginDirectory, PREVIOUS_BACKUP_FILE);
  const temporaryPath = `${backupPath}.tmp-${process.pid}-${Date.now()}`;
  await fs.promises.writeFile(temporaryPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  try {
    const current = await readValidBackup(backupPath);
    if (current) await copyAtomic(backupPath, previousPath);
    await replaceFile(temporaryPath, backupPath);
  } finally {
    await fs.promises.rm(temporaryPath, { force: true });
  }
}

export async function readChatHistoryBackup(pluginDirectory) {
  if (!pluginDirectory) return undefined;
  for (const fileName of [BACKUP_FILE, PREVIOUS_BACKUP_FILE]) {
    const backup = await readValidBackup(path.join(pluginDirectory, fileName));
    if (backup) return backup.chatHistory;
  }
  return undefined;
}

async function readValidBackup(filePath) {
  try {
    const backup = JSON.parse(await fs.promises.readFile(filePath, "utf8"));
    if (
      backup?.schemaVersion !== BACKUP_SCHEMA_VERSION ||
      backup.checksum !== checksum(backup.chatHistory)
    ) {
      return undefined;
    }
    return { ...backup, chatHistory: cloneHistory(backup.chatHistory) };
  } catch {
    return undefined;
  }
}

function cloneHistory(history) {
  if (!history || !Array.isArray(history.threads)) throw new Error("Invalid chat history backup.");
  const cloned = JSON.parse(JSON.stringify(history));
  if (
    typeof cloned.currentThreadId !== "string" ||
    cloned.threads.some(
      (thread) =>
        !thread ||
        typeof thread.id !== "string" ||
        typeof thread.title !== "string" ||
        !Array.isArray(thread.messages)
    )
  ) {
    throw new Error("Invalid chat history backup.");
  }
  return cloned;
}

function checksum(history) {
  return crypto.createHash("sha256").update(JSON.stringify(history)).digest("hex");
}

async function copyAtomic(sourcePath, destinationPath) {
  const temporaryPath = `${destinationPath}.tmp-${process.pid}-${Date.now()}`;
  await fs.promises.copyFile(sourcePath, temporaryPath);
  try {
    await replaceFile(temporaryPath, destinationPath);
  } finally {
    await fs.promises.rm(temporaryPath, { force: true });
  }
}

async function replaceFile(sourcePath, destinationPath) {
  try {
    await fs.promises.rename(sourcePath, destinationPath);
  } catch (error) {
    if (!["EEXIST", "EPERM"].includes(error?.code)) throw error;
    await fs.promises.rm(destinationPath, { force: true });
    await fs.promises.rename(sourcePath, destinationPath);
  }
}
