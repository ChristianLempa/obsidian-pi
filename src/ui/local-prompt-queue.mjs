import { createQueuedPrompt } from "./prompt-payload.mjs";

export function restorePersistedLocalPromptQueue(queue, steering) {
  return normalizeLocalPromptQueue([
    ...(Array.isArray(queue) ? queue : []),
    ...(Array.isArray(steering) ? steering : [])
  ])
    .filter((item, index, items) => items.findIndex((other) => other.id === item.id) === index)
    .sort((left, right) => left.createdAt - right.createdAt);
}

export function normalizeLocalPromptQueue(value, options = {}) {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      const normalized = createQueuedPrompt(item);
      if (!normalized) return undefined;
      return {
        ...normalized,
        state:
          options.preserveState && ["pending", "steering", "delivering"].includes(item.state)
            ? item.state
            : "pending"
      };
    })
    .filter(Boolean);
}

export function enqueueLocalPrompt(queue, item) {
  const normalized = createQueuedPrompt(item);
  return normalized ? [...queue, normalized] : queue;
}

export function updateLocalPrompt(queue, id, patch) {
  return queue.map((item) =>
    item.id === id && item.state === "pending"
      ? createQueuedPrompt({ ...item, ...patch, id: item.id, createdAt: item.createdAt }) || item
      : item
  );
}

export function removeLocalPrompt(queue, id) {
  return queue.filter((item) => item.id !== id);
}

export function takeLocalPrompt(queue, id) {
  const index = queue.findIndex((item) => item.id === id && item.state === "pending");
  if (index < 0) return { queue, item: undefined, index: -1 };
  return {
    queue: [...queue.slice(0, index), ...queue.slice(index + 1)],
    item: queue[index],
    index
  };
}

export function restoreLocalPrompt(queue, item, index) {
  if (!item || queue.some((candidate) => candidate.id === item.id)) return queue;
  const restored = { ...item, state: "pending" };
  const insertionIndex = Math.max(
    0,
    Math.min(Number.isInteger(index) ? index : queue.length, queue.length)
  );
  return [...queue.slice(0, insertionIndex), restored, ...queue.slice(insertionIndex)];
}

export function claimLocalPrompt(queue, id, state = "steering") {
  let claimed;
  const next = queue.map((item) => {
    if (item.id !== id || item.state !== "pending") return item;
    claimed = { ...item, state };
    return claimed;
  });
  return { queue: next, item: claimed };
}

export function releaseLocalPrompt(queue, id) {
  return queue.map((item) => (item.id === id ? { ...item, state: "pending" } : item));
}

export function nextDeliverablePrompt(queue, isThreadRunning) {
  const next = queue[0];
  return next?.state === "pending" && !isThreadRunning(next.threadId) ? next : undefined;
}
