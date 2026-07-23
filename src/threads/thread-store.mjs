const DEFAULT_THREAD_TITLE = "New chat";

export class ThreadStore {
  constructor(history, legacyMessages, legacyPiSessionId) {
    this.history = normalizeThreadHistory(history, legacyMessages, legacyPiSessionId);
  }

  get currentThreadId() {
    return this.history.currentThreadId;
  }

  getCurrentThread() {
    return cloneThread(this.getMutableCurrentThread());
  }

  getCurrentMessages() {
    return this.getMutableCurrentThread().messages.map(cloneMessage);
  }

  listThreads(options = {}) {
    const includeArchived = options.includeArchived ?? false;

    return this.history.threads
      .filter((thread) => includeArchived || !thread.archived)
      .sort(compareThreadsForList)
      .map(cloneThread);
  }

  startNewThread(title) {
    const now = Date.now();
    const thread = createThread({ title, now });

    this.history = {
      currentThreadId: thread.id,
      threads: [thread, ...this.history.threads]
    };

    return cloneThread(thread);
  }

  forkCurrentThread(piSessionId) {
    const current = this.getMutableCurrentThread();
    if (current.messages.length === 0) return undefined;

    const now = Date.now();
    const thread = createThread({
      title: `${current.title} (fork)`,
      now,
      messages: current.messages,
      piSessionId
    });

    this.history = {
      currentThreadId: thread.id,
      threads: [thread, ...this.history.threads]
    };

    return cloneThread(thread);
  }

  switchThread(threadId) {
    const thread = this.history.threads.find((item) => item.id === threadId);
    if (!thread) return false;

    this.history.currentThreadId = thread.id;
    return true;
  }

  archiveThread(threadId = this.history.currentThreadId) {
    return this.updateThread(threadId, (thread, now) => {
      thread.archived = true;
      thread.updatedAt = now;
    });
  }

  unarchiveThread(threadId) {
    return this.updateThread(threadId, (thread, now) => {
      thread.archived = false;
      thread.updatedAt = now;
    });
  }

  archiveThreads(threadIds) {
    const requested = new Set(threadIds);
    const archivedIds = [];
    const now = Date.now();

    for (const thread of this.history.threads) {
      if (!requested.has(thread.id) || thread.archived) continue;
      thread.archived = true;
      thread.updatedAt = now;
      archivedIds.push(thread.id);
    }

    return archivedIds;
  }

  deleteThread(threadId) {
    return this.deleteThreads([threadId]).deletedIds.length === 1;
  }

  deleteThreads(threadIds) {
    const requested = new Set(threadIds);
    const deletedIds = this.history.threads
      .filter((thread) => requested.has(thread.id))
      .map((thread) => thread.id);
    if (deletedIds.length === 0) return { deletedIds, createdThreadId: undefined };

    const threads = this.history.threads.filter((thread) => !requested.has(thread.id));
    this.history.threads = threads;

    let createdThreadId;
    if (!threads.some((thread) => thread.id === this.history.currentThreadId)) {
      const nextThread =
        this.getMostRecentThread(threads.filter((thread) => !thread.archived)) ??
        this.getMostRecentThread(threads);
      if (nextThread) {
        this.history.currentThreadId = nextThread.id;
      } else {
        const replacement = this.startNewThread();
        createdThreadId = replacement.id;
      }
    }

    return { deletedIds, createdThreadId };
  }

  clearArchivedThreads() {
    const previousCount = this.history.threads.length;

    this.history.threads = this.history.threads.filter(
      (thread) => !thread.archived || thread.id === this.history.currentThreadId
    );

    return previousCount - this.history.threads.length;
  }

  renameThread(threadId, title) {
    const nextTitle = normalizeTitle(title);

    return this.updateThread(threadId, (thread, now) => {
      thread.title = nextTitle;
      thread.updatedAt = now;
    });
  }

  setThreadFavorite(threadId, favorite) {
    return this.updateThread(threadId, (thread, now) => {
      thread.favorite = favorite === true;
      thread.updatedAt = now;
    });
  }

  toggleThreadFavorite(threadId) {
    const thread = this.history.threads.find((item) => item.id === threadId);
    if (!thread) return false;

    return this.setThreadFavorite(threadId, !thread.favorite);
  }

  addMessage(message) {
    return this.addMessageToThread(this.history.currentThreadId, message);
  }

  addMessageToThread(threadId, message) {
    const thread = this.history.threads.find((item) => item.id === threadId);
    if (!thread) return undefined;

    const normalizedMessage = cloneMessage(message);
    if (message.role === "user" && thread.archived) thread.archived = false;

    thread.messages = [...thread.messages, normalizedMessage];
    thread.updatedAt = Math.max(thread.updatedAt, normalizedMessage.createdAt, Date.now());
    if (thread.title === DEFAULT_THREAD_TITLE && normalizedMessage.role === "user") {
      thread.title = titleFromPrompt(normalizedMessage.content);
    }

    return cloneThread(thread);
  }

  getThread(threadId) {
    const thread = this.history.threads.find((item) => item.id === threadId);
    return thread ? cloneThread(thread) : undefined;
  }

  setCurrentPiSessionId(piSessionId) {
    return this.setThreadPiSessionId(this.history.currentThreadId, piSessionId);
  }

  setThreadPiSessionId(threadId, piSessionId) {
    return this.updateThread(threadId, (thread, now) => {
      thread.piSessionId = piSessionId;
      thread.updatedAt = now;
    });
  }

  toJSON() {
    return {
      currentThreadId: this.history.currentThreadId,
      threads: this.history.threads.map(cloneThread)
    };
  }

  updateThread(threadId, update) {
    const thread = this.history.threads.find((item) => item.id === threadId);
    if (!thread) return false;

    update(thread, Date.now());
    return true;
  }

  getMutableCurrentThread() {
    const currentThread = this.history.threads.find(
      (thread) => thread.id === this.history.currentThreadId
    );
    if (currentThread) return currentThread;

    const thread = createThread({ now: Date.now() });
    this.history.currentThreadId = thread.id;
    this.history.threads = [thread, ...this.history.threads];
    return thread;
  }

  getMostRecentThread(threads) {
    return [...threads].sort((left, right) => right.updatedAt - left.updatedAt)[0];
  }
}

export function normalizeThreadHistory(history, legacyMessages, legacyPiSessionId) {
  const source = isPlainObject(history) ? history : {};
  const sourceThreads = Array.isArray(source.threads) ? source.threads : [];
  const seenIds = new Set();
  const threads = sourceThreads.map((thread) => normalizeThread(thread, seenIds)).filter(Boolean);

  if (threads.length === 0) threads.push(createLegacyThread(legacyMessages, legacyPiSessionId));

  return {
    currentThreadId:
      typeof source.currentThreadId === "string" &&
      threads.some((thread) => thread.id === source.currentThreadId)
        ? source.currentThreadId
        : (getMostRecentThread(threads.filter((thread) => !thread.archived))?.id ??
          getMostRecentThread(threads)?.id ??
          threads[0].id),
    threads
  };
}

function normalizeThread(thread, seenIds) {
  if (!isPlainObject(thread)) return undefined;

  const messages = normalizeMessages(thread.messages);
  const now = Date.now();
  const createdAt = normalizeTimestamp(thread.createdAt) ?? messages[0]?.createdAt ?? now;
  const updatedAt =
    normalizeTimestamp(thread.updatedAt) ?? messages[messages.length - 1]?.createdAt ?? createdAt;
  const sourceId = typeof thread.id === "string" && thread.id.trim() ? thread.id : "";
  const id = sourceId && !seenIds.has(sourceId) ? sourceId : createThreadId(now);

  seenIds.add(id);

  return {
    id,
    title: normalizeTitle(
      typeof thread.title === "string" && thread.title.trim()
        ? thread.title
        : inferThreadTitle(messages)
    ),
    messages,
    createdAt,
    updatedAt,
    archived: thread.archived === true,
    favorite: thread.favorite === true,
    piSessionId: normalizeOptionalString(thread.piSessionId ?? thread.piThreadId)
  };
}

function createLegacyThread(legacyMessages, legacyPiSessionId) {
  const messages = normalizeMessages(legacyMessages);
  const now = Date.now();

  return createThread({
    title: inferThreadTitle(messages),
    now,
    messages,
    piSessionId: normalizeOptionalString(legacyPiSessionId)
  });
}

function createThread(options) {
  const messages = (options.messages ?? []).map(cloneMessage);
  const createdAt = messages[0]?.createdAt ?? options.now;
  const updatedAt = messages[messages.length - 1]?.createdAt ?? options.now;

  return {
    id: createThreadId(options.now),
    title: normalizeTitle(options.title ?? inferThreadTitle(messages)),
    messages,
    createdAt,
    updatedAt,
    archived: false,
    favorite: options.favorite === true,
    piSessionId: options.piSessionId
  };
}

function normalizeMessages(messages) {
  return Array.isArray(messages) ? messages.filter(isValidMessage).map(cloneMessage) : [];
}

function isValidMessage(message) {
  return isPlainObject(message)
    ? (message.role === "user" || message.role === "assistant" || message.role === "system") &&
        typeof message.content === "string" &&
        typeof message.createdAt === "number" &&
        Number.isFinite(message.createdAt)
    : false;
}

function cloneMessage(message) {
  return {
    role: message.role,
    content: message.content,
    createdAt: message.createdAt,
    contextUsage: message.contextUsage ? { ...message.contextUsage } : undefined,
    tokenUsage: message.tokenUsage ? { ...message.tokenUsage } : undefined,
    runMetadata: message.runMetadata ? { ...message.runMetadata } : undefined,
    thinking: typeof message.thinking === "string" ? message.thinking : undefined,
    toolErrors: Array.isArray(message.toolErrors)
      ? message.toolErrors.map((error) => String(error)).filter(Boolean)
      : undefined
  };
}

function cloneThread(thread) {
  return {
    id: thread.id,
    title: thread.title,
    messages: thread.messages.map(cloneMessage),
    createdAt: thread.createdAt,
    updatedAt: thread.updatedAt,
    archived: thread.archived,
    favorite: thread.favorite === true,
    piSessionId: thread.piSessionId
  };
}

function normalizeTimestamp(value) {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function normalizeOptionalString(value) {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function normalizeTitle(value) {
  return value.replace(/\s+/g, " ").trim().slice(0, 80) || DEFAULT_THREAD_TITLE;
}

function inferThreadTitle(messages) {
  const firstUserMessage = messages.find((message) => message.role === "user");
  return firstUserMessage ? titleFromPrompt(firstUserMessage.content) : DEFAULT_THREAD_TITLE;
}

function titleFromPrompt(prompt) {
  return normalizeTitle(prompt.replace(/^#+\s*/g, "").replace(/[`*_#[\]()>]/g, ""));
}

function createThreadId(now) {
  return `thread-${now}-${Math.random().toString(36).slice(2, 10)}`;
}

function getMostRecentThread(threads) {
  return [...threads].sort((left, right) => right.updatedAt - left.updatedAt)[0];
}

function compareThreadsForList(left, right) {
  if (left.favorite !== right.favorite) return left.favorite ? -1 : 1;
  return right.updatedAt - left.updatedAt;
}

function isPlainObject(value) {
  return !!value && typeof value === "object" && !Array.isArray(value);
}
