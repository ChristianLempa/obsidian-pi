export function isStickyActivityKind(kind) {
  return kind === "read" || kind === "search" || kind === "edit" || kind === "shell";
}

export function shouldBypassActivityStickiness(kind) {
  return kind === "answer" || kind === "finishing" || kind === "error";
}

export function getToolKind(toolName) {
  const name = String(toolName || "").toLowerCase();

  return name === "bash"
    ? "shell"
    : name === "edit" || name === "write"
      ? "edit"
      : name === "grep" || name === "find" || name === "ls"
        ? "search"
        : name === "read"
          ? "read"
          : "thinking";
}

export function getToolIcon(kind) {
  return kind === "write"
    ? "pencil-line"
    : kind === "shell"
      ? "terminal"
      : kind === "search"
        ? "search"
        : "file-text";
}

export function getActivityIcon(kind) {
  return kind === "context"
    ? "paperclip"
    : kind === "answer"
      ? "message-square"
      : kind === "shell"
        ? "terminal"
        : kind === "edit"
          ? "pencil-line"
          : kind === "search"
            ? "search"
            : kind === "read"
              ? "file-text"
              : kind === "done" || kind === "finishing"
                ? "check-circle"
                : "brain";
}

export function formatToolStatus(toolName, toolArgs, phase = "running") {
  const name = String(toolName || "tool").toLowerCase();
  const kind = getToolKind(name);
  const target = formatToolTarget(name, toolArgs);
  const verb = getToolVerb(name, phase);
  const label = target ? `${verb} ${target}` : verb;

  return { label: truncateActivityText(label), kind, detail: "" };
}

export function getToolEventKey(event) {
  return String(
    event.toolCallId ||
      `${event.toolName || event.message || "tool"}:${JSON.stringify(event.toolArgs || {}).slice(
        0,
        80
      )}`
  );
}

export function getThinkingDelta(event) {
  if (event?.type !== "thinking_delta") return "";
  return String(event.thinkingDelta ?? event.assistantEvent?.delta ?? event.raw?.delta ?? "");
}

export function formatToolError(event) {
  if (event?.type !== "tool_end" || event.isError !== true) return "";
  const name = String(event.toolName || event.message || "Tool");
  const detail = sanitizeActivityDetail(
    event.errorMessage ?? event.raw?.errorMessage ?? event.raw?.error ?? event.raw?.result?.error
  );
  return truncateActivityText(detail ? `${name}: ${detail}` : `${name} failed`);
}

export function formatRetryDetail(event) {
  if (!event || typeof event !== "object") return "";

  const attempt =
    event.attempt && event.maxAttempts ? `attempt ${event.attempt}/${event.maxAttempts}` : "";

  return [attempt, event.errorMessage ? String(event.errorMessage).slice(0, 120) : ""]
    .filter(Boolean)
    .join(" — ");
}

function getToolVerb(toolName, phase) {
  if (phase === "preparing") {
    return toolName === "bash"
      ? "Preparing command"
      : toolName === "edit"
        ? "Preparing edit"
        : toolName === "write"
          ? "Preparing write"
          : toolName === "grep" || toolName === "find" || toolName === "ls"
            ? "Preparing search"
            : toolName === "read"
              ? "Preparing read"
              : "Preparing action";
  }

  return toolName === "bash"
    ? "Running"
    : toolName === "edit"
      ? "Editing"
      : toolName === "write"
        ? "Writing"
        : toolName === "grep"
          ? "Searching"
          : toolName === "find"
            ? "Finding"
            : toolName === "ls"
              ? "Listing"
              : toolName === "read"
                ? "Reading"
                : "Using";
}

function formatToolTarget(toolName, toolArgs) {
  if (toolName === "bash") return "command";

  if (toolName === "grep") {
    const pattern = sanitizeActivityDetail(pickNestedString(toolArgs, ["pattern", "query"]));
    const path = formatPathForActivity(pickNestedString(toolArgs, ["path", "directory", "dir"]));

    return pattern && path ? `"${pattern}" in ${path}` : pattern ? `"${pattern}"` : path;
  }

  if (toolName === "find") {
    return sanitizeActivityDetail(pickNestedString(toolArgs, ["glob", "pattern", "query", "path"]));
  }

  if (toolName === "ls") {
    return formatPathForActivity(pickNestedString(toolArgs, ["path", "directory", "dir"]));
  }

  return formatPathForActivity(
    pickNestedString(toolArgs, [
      "path",
      "filePath",
      "file",
      "target",
      "command",
      "cmd",
      "pattern",
      "query"
    ])
  );
}

function formatPathForActivity(value) {
  const path = sanitizeActivityDetail(value).replace(/\\/g, "/").replace(/\/$/, "");
  return path ? path.split("/").pop() || path : "";
}

function sanitizeActivityDetail(value) {
  return value ? String(value).replace(/\s+/g, " ").trim() : "";
}

function truncateActivityText(value) {
  const detail = sanitizeActivityDetail(value);
  return detail.length > 120 ? `${detail.slice(0, 117)}…` : detail;
}

function pickNestedString(value, keys, seen = new Set()) {
  if (!value || typeof value !== "object" || seen.has(value)) return "";

  seen.add(value);

  for (const key of keys) {
    if (typeof value[key] === "string" && value[key].trim()) return value[key];
  }

  for (const key of ["input", "args", "arguments", "parameters", "params", "toolInput", "data"]) {
    if (!value[key]) continue;

    const nested = pickNestedString(value[key], keys, seen);
    if (nested) return nested;
  }

  for (const nestedValue of Object.values(value)) {
    const nested = pickNestedString(nestedValue, keys, seen);
    if (nested) return nested;
  }

  return "";
}
