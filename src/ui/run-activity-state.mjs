import { extractEventTokenUsage } from "../pi/events.mjs";
import {
  createContextUsage,
  formatContextUsageTitle,
  formatTokenCount
} from "../pi/token-usage.mjs";
import {
  formatRetryDetail,
  formatToolStatus,
  getToolEventKey,
  isStickyActivityKind,
  shouldBypassActivityStickiness
} from "./activity.mjs";

const ACTIVITY_STICKY_MS = 1200;

export function setActivity(e, t, n = "") {
  let s = Date.now(),
    a = isStickyActivityKind(t),
    o = !a && !shouldBypassActivityStickiness(t) && s < this.activityStickyUntil;
  if (o) {
    this.queuePendingActivity(e, t, n);
    return;
  }
  this.applyActivity(e, t, n, a ? s + ACTIVITY_STICKY_MS : 0);
}

export function applyActivity(e, t, n = "", s = 0) {
  let a = this.activityText === e && this.activityKind === t && this.activityDetail === n;
  this.activityText = e;
  this.activityKind = t;
  this.activityDetail = n;
  this.activityStickyUntil = s;
  if (s) {
    this.pendingActivity = void 0;
    this.clearPendingActivityTimer();
  }
  if (!a && !this.updateActivityDom()) this.renderMessages();
}

export function queuePendingActivity(e, t, n = "") {
  this.pendingActivity = { text: e, kind: t, detail: n };
  this.schedulePendingActivity();
}

export function schedulePendingActivity() {
  if (this.pendingActivityTimer) return;
  let e = Math.max(0, this.activityStickyUntil - Date.now());
  this.pendingActivityTimer = window.setTimeout(() => {
    this.pendingActivityTimer = void 0;
    this.flushPendingActivity();
  }, e);
}

export function clearPendingActivityTimer() {
  if (this.pendingActivityTimer) window.clearTimeout(this.pendingActivityTimer);
  this.pendingActivityTimer = void 0;
}

export function flushPendingActivity() {
  if (!this.pendingActivity || Date.now() < this.activityStickyUntil) {
    this.pendingActivity && this.schedulePendingActivity();
    return;
  }
  if (!this.running || this.streamingAssistantContent || this.activeToolCalls.size > 0) {
    this.pendingActivity = void 0;
    return;
  }
  let e = this.pendingActivity;
  this.pendingActivity = void 0;
  this.applyActivity(e.text, e.kind, e.detail);
}

export function updateActivityDom() {
  if (
    !this.running ||
    !this.activityText ||
    !this.activityItemEl ||
    !this.activityDetailsEl ||
    !this.activityLabelEl ||
    !this.activityItemEl.isConnected ||
    !this.activityDetailsEl.isConnected
  )
    return !1;
  const label = this.activityText.toUpperCase();
  const title = this.activityDetail || this.activityText;
  if (this.activityDetailsEl.getAttribute("title") !== title)
    this.activityDetailsEl.setAttr("title", title);
  if (this.activityLabelEl.getAttribute("aria-label") !== `${this.activityText} in progress`)
    this.activityLabelEl.setAttr("aria-label", `${this.activityText} in progress`);
  if (this.activityLabelEl.textContent !== label) this.activityLabelEl.setText(label);
  return !0;
}

export function captureContextUsage(e) {
  let t = extractEventTokenUsage(e == null ? void 0 : e.raw),
    n = this.getContextUsageForTokens(t);
  if (n) {
    if (this.runningThreadId) this.invalidatedContextThreadIds.delete(this.runningThreadId);
    this.currentRunContextUsage = { contextUsage: n, tokenUsage: t };
    this.updateActivityDom();
    this.renderToolBadges();
  }
}

export function getContextUsageForTokens(e) {
  var a;
  if (!e) return;
  let t = this.plugin.getSelectedModelInfo(e),
    n = (a = t == null ? void 0 : t.contextWindow) != null ? a : e?.contextWindow;
  return createContextUsage(e, n);
}

export function handleRunEvent(e) {
  let t = this.normalizeRunEventType(e.type);
  this.captureContextUsage(e);
  if (t === "queue_update") {
    this.nativePiQueue = {
      steering: Array.isArray(e.raw?.steering) ? e.raw.steering : [],
      followUp: Array.isArray(e.raw?.followUp) ? e.raw.followUp : []
    };
    this.renderPromptQueue();
    return;
  }
  if (t === "context_ready") {
    this.setActivity("Starting Pi", "context");
    return;
  }
  if (t === "compaction_start") {
    let n = this.currentRunContextUsage?.contextUsage
      ? formatContextUsageTitle(
          this.currentRunContextUsage.contextUsage,
          this.currentRunContextUsage.tokenUsage
        )
      : "";
    if (this.runningThreadId) this.invalidatedContextThreadIds.add(this.runningThreadId);
    this.currentRunContextUsage = void 0;
    this.renderToolBadges();
    this.setActivity("Compacting context", "context", n);
    return;
  }
  if (t === "compaction_end") {
    if (e.raw && e.raw.errorMessage) {
      this.setActivity("Compaction failed", "error", String(e.raw.errorMessage));
      return;
    }
    if (e.raw && e.raw.aborted) {
      this.setActivity("Compaction skipped", "thinking");
      return;
    }
    let n = e.raw && e.raw.result ? e.raw.result.tokensBefore : void 0;
    if (this.runningThreadId) this.invalidatedContextThreadIds.add(this.runningThreadId);
    this.currentRunContextUsage = {
      compacted: true,
      contextWindow: this.plugin.getSelectedModelInfo()?.contextWindow
    };
    this.renderToolBadges();
    this.setActivity(
      e.raw && e.raw.willRetry ? "Compacted context, retrying" : "Finishing",
      e.raw && e.raw.willRetry ? "context" : "finishing",
      n ? `Before compaction: ${formatTokenCount(n)} tokens` : ""
    );
    return;
  }
  if (t === "auto_retry_start") {
    this.setActivity("Retrying", "finishing", formatRetryDetail(e.raw));
    return;
  }
  if (t === "extension_error" || t === "extension_ui_error") {
    this.setActivity(
      "Extension failed",
      "error",
      String(e.raw?.error ?? e.raw?.message ?? "Pi extension error")
    );
    return;
  }
  if (
    t === "pi_start" ||
    t === "agent_start" ||
    t === "turn_start" ||
    t === "message_start" ||
    t === "thinking_start" ||
    t === "thinking_delta" ||
    t === "thinking_end"
  ) {
    this.streamingAssistantContent || this.setActivity("Thinking", "thinking");
    return;
  }
  if (t === "toolcall_start" || t === "toolcall_delta" || t === "toolcall_end") {
    let n = formatToolStatus(e.toolName, e.toolArgs, "preparing");
    this.setActivity(n.label, n.kind, n.detail);
    return;
  }
  if (t === "tool_start" || t === "tool_update") {
    this.trackActiveTool(e);
    let n = this.formatActiveToolStatus();
    this.setActivity(n.label, n.kind, n.detail);
    return;
  }
  if (t === "tool_end") {
    this.untrackActiveTool(e);
    if (this.activeToolCalls.size > 0) {
      let n = this.formatActiveToolStatus();
      this.setActivity(n.label, n.kind, n.detail);
      return;
    }
    this.streamingAssistantContent ||
      this.setActivity(
        e.isError ? "Tool failed" : "Reviewing results",
        e.isError ? "error" : "thinking"
      );
    return;
  }
  if (t === "text_start") {
    this.setActivity("Responding", "answer");
    return;
  }
  if (t === "message_end" || t === "turn_end") {
    this.streamingAssistantContent || this.setActivity("Thinking", "thinking");
    return;
  }
  if (t === "agent_end") {
    this.activityText = "";
    this.activityDetail = "";
    this.activityStickyUntil = 0;
    this.pendingActivity = void 0;
    this.clearPendingActivityTimer();
    this.activeToolCalls.clear();
    this.renderMessages();
  }
}

export function normalizeRunEventType(e) {
  return e === "auto_compaction_start" || e === "session_before_compact"
    ? "compaction_start"
    : e === "auto_compaction_end" || e === "session_compact"
      ? "compaction_end"
      : e;
}

export function trackActiveTool(e) {
  let t = getToolEventKey(e),
    n = String(e.toolName || e.message || "tool"),
    s = e.toolArgs || {};
  this.activeToolCalls.set(t, { name: n, args: s });
}

export function untrackActiveTool(e) {
  this.activeToolCalls.delete(getToolEventKey(e));
}

export function formatActiveToolStatus() {
  let e = [...this.activeToolCalls.values()];
  if (e.length === 0) return { label: "Thinking", kind: "thinking", detail: "" };
  if (e.length === 1) return formatToolStatus(e[0].name, e[0].args, "running");
  let t = e.map((n) => formatToolStatus(n.name, n.args, "running"));
  return {
    label: `Running ${e.length} actions`,
    kind: t.some((n) => n.kind === "shell")
      ? "shell"
      : t.some((n) => n.kind === "edit")
        ? "edit"
        : t.some((n) => n.kind === "search")
          ? "search"
          : "read",
    detail: t.map((n) => n.label).join(" • ")
  };
}
