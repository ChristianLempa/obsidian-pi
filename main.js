var import_meta = { url: require("url").pathToFileURL(__filename).href };
("use strict");
var le = Object.defineProperty;
var st = Object.getOwnPropertyDescriptor;
var rt = Object.getOwnPropertyNames;
var at = Object.prototype.hasOwnProperty;
var ot = (r, i) => {
    for (var e in i) le(r, e, { get: i[e], enumerable: !0 });
  },
  lt = (r, i, e, t) => {
    if ((i && typeof i == "object") || typeof i == "function")
      for (let n of rt(i))
        !at.call(r, n) &&
          n !== e &&
          le(r, n, {
            get: () => i[n],
            enumerable: !(t = st(i, n)) || t.enumerable
          });
    return r;
  };
var dt = (r) => lt(le({}, "__esModule", { value: !0 }), r);
var Kt = {};
ot(Kt, { default: () => oe });
module.exports = dt(Kt);
var P = require("obsidian");
var T = "obsidian-pi-view",
  Ce = "Obsidian Pi",
  I = "obsidian-pi-agent",
  O =
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 800" aria-hidden="true" focusable="false"><path fill="currentColor" fill-rule="evenodd" d="M165.29 165.29H517.36V400H400V517.36H282.65V634.72H165.29ZM282.65 282.65V400H400V282.65Z"/><path fill="currentColor" d="M517.36 400H634.72V634.72H517.36Z"/></svg>';
var be = `# Obsidian Pi Coding Agent

You are Pi, an agentic AI coding assistant from https://pi.dev, running inside Obsidian Pi.

The user is working in an Obsidian vault made of Markdown notes, scripts, configs, and sometimes plugin/source-code projects. Treat vault paths, wikilinks, frontmatter, headings, tags, backlinks, outgoing links, and code files as first-class context. The plugin may provide the current note, selected text, backlinks, outgoing links, search results, and explicit @note, #tag, or /command attachments.

Your primary role is agentic coding and technical knowledge work inside the vault: inspect files, reason about systems, propose implementation plans, edit code or Markdown when edit tools are enabled, run commands when shell tools are enabled, and summarize concrete changes.

## Operation modes

- Chat: no Pi CLI tools are enabled. Use only the Obsidian context attached by the plugin and ask for more context when needed.
- Review: read/search/list tools are enabled. Inspect files and explain, review, summarize, or propose changes, but do not modify files.
- Edit: read/search/list plus edit/write tools are enabled. Make focused file changes when the user asks. Shell commands are not available, so ask the user to run tests/builds manually when needed.
- Full Agent: read/search/list/edit/write/bash tools are enabled. You may run appropriate shell commands for coding tasks, tests, builds, repo inspection, and diagnostics.

Pi CLI tools are controlled by the selected tool mode. They are not an OS-level sandbox. Use tools intentionally, keep edits small, and avoid destructive commands unless explicitly requested and clearly safe.

## Coding behavior

- Before editing code, inspect the relevant files and existing patterns.
- Prefer minimal, reviewable changes over broad rewrites.
- Run targeted tests or build commands when shell tools are enabled and practical; otherwise tell the user what to run.
- Preserve project conventions, formatting, imports, and file organization.
- If a task touches generated files or dependencies, explain why.
- If you cannot safely determine the right implementation, ask a concise clarification or propose a plan first.
- After code edits, summarize changed files, behavior changes, tests/builds run, and any follow-up checks.

## Vault behavior

- Treat every markdown file as user-owned knowledge.
- When the user says "this", "here", "this note", or "this idea", start from the current note and selected text before using broader search context.
- Preserve existing headings, links, aliases, tags, and frontmatter unless the user asks to change them.
- Cite vault references as wikilinks when possible, for example [[Project Alpha]].
- Do not infer facts that are not present in notes. Say when references are weak or missing.
- If a referenced note, heading, block, or file is not present in the provided context, say it was not found instead of inventing content.
- Preserve Obsidian callouts, embeds, block IDs, footnotes, comments, and dataview/base-related sections unless the user explicitly asks to change them.
- Prefer Obsidian wikilinks for vault notes. Use [[Note Name]] or [[path/to/note|label]] instead of raw Markdown links for internal vault references.
- Use Obsidian-friendly Markdown: clear headings, compact bullets, tables only when useful, and callouts only when they improve the note.

## Chat responses

- Be concise and action-oriented.
- For normal chat replies, keep formatting readable as plain text. Avoid heavy Markdown unless the user asks for Markdown or the content is meant to be inserted into a note.
- When mentioning vault notes in chat, wikilinks or vault paths are useful because the plugin makes them clickable.

## Frontmatter

- Keep YAML frontmatter compact and stable.
- Common fields: type, status, tags, aliases, created, updated, project, area, source.
- Prefer arrays for tags and aliases.
- Do not delete unknown fields.
- Do not rewrite the entire YAML block unless asked. Add or update only the specific fields needed.
- Preserve existing field names, ordering, quoting style, and unknown system-managed fields as much as possible.

## Backlinks and references

- Use backlinks to understand who depends on the current note.
- Use outgoing links to understand what the current note depends on.
- Use unresolved links as possible missing notes, typos, or future note ideas.
- When researching a topic, start with exact title and alias matches, then tags, then full-text mentions.
- Before renaming, moving, deleting, or substantially changing the meaning of a note, consider backlinks and outgoing links and mention likely affected references.
- When adding new links, prefer existing note titles or aliases discovered from context instead of creating duplicate concepts.

## Obsidian Bases

- Bases are useful when notes share predictable frontmatter.
- A good Base starts from the fields already used in a folder.
- Suggested fields: type, status, tags, project, area, created, updated.
- Propose a Base config before creating it unless the user explicitly asks you to create it immediately.`;
var y = require("obsidian"),
  b = "__custom",
  ct = { "": "Use Pi default", [b]: "Custom model ID" },
  xe = {
    "": "Pi default",
    off: "Off",
    minimal: "Minimal - may be unavailable with tools",
    low: "Low",
    medium: "Medium",
    high: "High",
    xhigh: "XHigh - deepest"
  },
  H = {
    model: "",
    customModel: "",
    reasoningEffort: "",
    sandboxMode: "read-only",
    acknowledgedToolRisk: !1,
    availableModels: [],
    dryRun: !1,
    maxSearchResults: 8,
    maxSearchFiles: 200,
    maxFileChars: 12e3,
    archiveFolder: "Pi/Chats",
    ignoredFolders: [".obsidian", ".git", "node_modules", "Templates"],
    customInstructions: "",
    includeDefaultSkills: !0,
    additionalSkillFolders: [],
    effectiveModel: "",
    effectiveReasoning: ""
  },
  V = class extends y.PluginSettingTab {
    constructor(i, e) {
      (super(i, e), (this.plugin = e));
    }
    display() {
      let { containerEl: i } = this;
      (i.empty(),
        i.createEl("h2", { text: "Obsidian Pi" }),
        new y.Setting(i)
          .setName("Model")
          .setDesc(
            "Provider/model from Pi's built-in and custom model registry. Use default to follow ~/.pi/agent/settings.json or .pi/settings.json."
          )
          .addDropdown((e) =>
            e
              .addOptions(_(this.plugin.settings))
              .setValue(this.getModelDropdownValue())
              .onChange(async (t) => {
                ((this.plugin.settings.model = t),
                  (this.plugin.settings.reasoningEffort = ""),
                  await this.plugin.saveSettings(),
                  this.display());
              })
          )
          .addButton((e) =>
            e
              .setButtonText("Refresh")
              .setTooltip("Refresh models from Pi")
              .onClick(async () => {
                (e.setButtonText("Refreshing..."),
                  e.setDisabled(!0),
                  await this.plugin.refreshModelCatalog(!0),
                  this.display());
              })
          ),
        this.plugin.settings.model === b &&
          new y.Setting(i)
            .setName("Custom model ID")
            .setDesc("Provider/model ID, for example anthropic/claude-sonnet-4-5.")
            .addText((e) =>
              e
                .setPlaceholder("e.g. anthropic/claude-sonnet-4-5")
                .setValue(this.plugin.settings.customModel)
                .onChange(async (t) => {
                  ((this.plugin.settings.customModel = t.trim()), await this.plugin.saveSettings());
                })
            ),
        new y.Setting(i)
          .setName("Thinking level")
          .setDesc(
            "Controls reasoning effort only. Values come from the selected model returned by Pi."
          )
          .addDropdown((e) =>
            e
              .addOptions(this.getReasoningOptions())
              .setValue(this.getReasoningDropdownValue())
              .onChange(async (t) => {
                ((this.plugin.settings.reasoningEffort = t), await this.plugin.saveSettings());
              })
          ),
        new y.Setting(i)
          .setName("Tool mode")
          .setDesc(
            "Controls which Pi CLI tools are enabled. Tool modes are not an OS-level sandbox."
          )
          .addDropdown((e) =>
            e
              .addOptions(ce())
              .setValue(this.plugin.settings.sandboxMode)
              .onChange(async (t) => {
                if (
                  (t === "edit" || t === "full-agent" || t === "workspace-write") &&
                  !this.plugin.settings.acknowledgedToolRisk &&
                  !window.confirm(
                    "Pi tool modes are not an OS-level sandbox. Edit and Full Agent can modify vault/project files, and Full Agent can run shell commands. Continue?"
                  )
                ) {
                  this.display();
                  return;
                }
                ((this.plugin.settings.sandboxMode = t),
                  (t === "edit" || t === "full-agent" || t === "workspace-write") &&
                    (this.plugin.settings.acknowledgedToolRisk = !0),
                  await this.plugin.saveSettings());
              })
          ),
        new y.Setting(i)
          .setName("Custom instructions")
          .setDesc("Vault-specific instructions added to every Pi run.")
          .addTextArea((e) =>
            e
              .setPlaceholder("Prefer PARA folders. Keep project notes concise.")
              .setValue(this.plugin.settings.customInstructions)
              .onChange(async (t) => {
                ((this.plugin.settings.customInstructions = t), await this.plugin.saveSettings());
              })
          ),
        i.createEl("h3", { text: "Skills" }),
        new y.Setting(i)
          .setName("Include default Pi skills")
          .setDesc(
            "Load skills discovered by Pi from global and vault/project skill locations. Turn this off to use only the additional skill folders below."
          )
          .addToggle((e) =>
            e.setValue(this.plugin.settings.includeDefaultSkills !== !1).onChange(async (t) => {
              ((this.plugin.settings.includeDefaultSkills = t), await this.plugin.saveSettings());
            })
          ),
        new y.Setting(i)
          .setName("Additional skill folders")
          .setDesc(
            "One skill file or folder per line. Supports absolute paths, ~, and vault-relative paths. Only add trusted skills."
          )
          .addTextArea((e) =>
            e
              .setPlaceholder(".pi/skills\n~/my-skills")
              .setValue(
                normalizeSkillFolderList(this.plugin.settings.additionalSkillFolders).join("\n")
              )
              .onChange(async (t) => {
                ((this.plugin.settings.additionalSkillFolders = t
                  .split(/\r?\n/)
                  .map((n) => n.trim())
                  .filter(Boolean)),
                  await this.plugin.saveSettings());
              })
          ),
        i.createEl("h3", { text: "Advanced context" }),
        new y.Setting(i)
          .setName("Max context results")
          .setDesc("Number of ranked notes/links returned to Pi as Obsidian context.")
          .addSlider((e) =>
            e
              .setLimits(3, 25, 1)
              .setValue(this.plugin.settings.maxSearchResults)
              .setDynamicTooltip()
              .onChange(async (t) => {
                ((this.plugin.settings.maxSearchResults = t), await this.plugin.saveSettings());
              })
          ),
        new y.Setting(i)
          .setName("Max searched files")
          .setDesc("Maximum markdown files scanned for each vault search.")
          .addText((e) =>
            e
              .setPlaceholder("200")
              .setValue(String(this.plugin.settings.maxSearchFiles))
              .onChange(async (t) => {
                let n = Number.parseInt(t, 10);
                Number.isFinite(n) &&
                  n > 0 &&
                  ((this.plugin.settings.maxSearchFiles = n), await this.plugin.saveSettings());
              })
          ),
        new y.Setting(i)
          .setName("Max note characters")
          .setDesc("Maximum characters read from a single note for context.")
          .addText((e) =>
            e
              .setPlaceholder("12000")
              .setValue(String(this.plugin.settings.maxFileChars))
              .onChange(async (t) => {
                let n = Number.parseInt(t, 10);
                Number.isFinite(n) &&
                  n > 500 &&
                  ((this.plugin.settings.maxFileChars = n), await this.plugin.saveSettings());
              })
          ),
        new y.Setting(i)
          .setName("Ignored folders")
          .setDesc("Comma-separated folder prefixes that Pi retrieval should ignore.")
          .addTextArea((e) =>
            e
              .setPlaceholder(".obsidian, .git, node_modules")
              .setValue(this.plugin.settings.ignoredFolders.join(", "))
              .onChange(async (t) => {
                ((this.plugin.settings.ignoredFolders = t
                  .split(",")
                  .map((n) => n.trim())
                  .filter(Boolean)),
                  await this.plugin.saveSettings());
              })
          ));
    }
    getModelDropdownValue() {
      let { model: i } = this.plugin.settings;
      return Object.prototype.hasOwnProperty.call(_(this.plugin.settings), i) ? i : b;
    }
    getReasoningOptions() {
      return de(this.plugin.settings);
    }
    getReasoningDropdownValue() {
      let i = this.getReasoningOptions(),
        e = this.plugin.settings.reasoningEffort;
      return Object.prototype.hasOwnProperty.call(i, e) ? e : "";
    }
    getCatalogDescription() {
      let i = this.plugin.settings.availableModels.length,
        e = [
          i === 0
            ? "Using fallback options until Pi's model registry is loaded."
            : `${i} models loaded from Pi's model registry.`
        ];
      return (
        this.plugin.settings.effectiveModel &&
          e.push(`Pi default model: ${this.plugin.settings.effectiveModel}`),
        this.plugin.settings.effectiveReasoning &&
          e.push(`Pi default thinking: ${this.plugin.settings.effectiveReasoning}`),
        e.join(" ")
      );
    }
  };
function F(r) {
  return ht(r, H.archiveFolder);
}
function ht(r, i) {
  return (
    r
      .split("/")
      .map((e) => e.trim())
      .filter(Boolean)
      .join("/") || i
  );
}
function _(r) {
  let i = r.availableModels,
    e = { "": "Use Pi default" };
  if (i.length === 0) return { ...ct, ...e, [b]: "Custom model ID" };
  for (let t of i) e[t.slug] = ut(t);
  return ((e[b] = "Custom model ID"), e);
}
function de(r) {
  var n, s;
  let i = Te(r) != null ? Te(r) : rt(r),
    e = (n = i == null ? void 0 : i.supportedReasoningLevels) != null ? n : [];
  if (e.length === 0) return { "": "Use Pi/model default" };
  let t = { "": "Use Pi/model default" };
  for (let a of e) t[a] = (s = xe[a]) != null ? s : a;
  return t;
}
function W(r) {
  var i, e;
  return r.reasoningEffort
    ? r.reasoningEffort
    : (e = (i = Te(r) != null ? Te(r) : rt(r)) == null ? void 0 : i.defaultReasoningLevel) != null
      ? e
      : r.effectiveReasoning || "pi-default";
}
function rt(r) {
  return r.effectiveModel ? r.availableModels.find((i) => i.slug === r.effectiveModel) : void 0;
}
function ce() {
  return {
    chat: "Chat \u2014 no Pi CLI tools",
    "read-only": "Review \u2014 read/search/list only",
    edit: "Edit \u2014 edit/write, no shell",
    "full-agent": "Full Agent \u2014 edit/write and shell"
  };
}
function Te(r) {
  let i = r.model === b ? r.customModel : r.model;
  return r.availableModels.find((e) => e.slug === i);
}
function ut(r) {
  let i = r.supportedReasoningLevels,
    e = [i.length > 0 ? `thinking ${i.join("/")}` : ""].filter(Boolean);
  return e.length > 0 ? `${r.displayName} - ${e.join(", ")}` : r.displayName;
}
var Ae = require("fs"),
  j = require("path"),
  Me = require("child_process");
function he() {
  return { filesChanged: 0, additions: 0, deletions: 0 };
}
var ke = require("fs"),
  Se = require("path"),
  gt = ["/opt/homebrew/bin/node", "/usr/local/bin/node", "/usr/bin/node"],
  pt = ["/opt/homebrew/bin", "/usr/local/bin", "/usr/bin", "/bin", "/usr/sbin", "/sbin"];
function z() {
  for (let r of gt) if ((0, ke.existsSync)(r)) return r;
  return (0, Se.basename)(process.execPath).startsWith("node") ? process.execPath : "node";
}
function U() {
  var e;
  let i = ((e = process.env.PATH) != null ? e : "").split(":").filter(Boolean);
  for (let t of pt) i.includes(t) || i.push(t);
  return { ...process.env, PATH: i.join(":") };
}
function normalizeSkillFolderList(r) {
  return Array.isArray(r)
    ? r.map((i) => String(i).trim()).filter(Boolean)
    : typeof r == "string"
      ? r
          .split(/\r?\n|,/)
          .map((i) => i.trim())
          .filter(Boolean)
      : [];
}
function resolveConfiguredSkillPath(r, i) {
  let e = String(r || "").trim();
  if (!e) return "";
  return (
    e.startsWith("~") && (e = (process.env.HOME || process.env.USERPROFILE || "") + e.slice(1)),
    j.isAbsolute(e) ? e : (0, j.join)(i || "", e)
  );
}
function getConfiguredSkillPaths(r, i) {
  return normalizeSkillFolderList(r == null ? void 0 : r.additionalSkillFolders)
    .map((e) => resolveConfiguredSkillPath(e, i))
    .filter(Boolean);
}
var K = class {
  constructor(i, e, t, n) {
    this.settings = i;
    this.contextBuilder = e;
    this.workingDirectory = t;
    this.pluginDirectory = n;
    this.cancelRequested = !1;
  }
  async run(i, e, t, n = [], s) {
    let a = this.contextBuilder.formatPrompt(i, e, n);
    return this.settings.dryRun
      ? {
          finalResponse: this.formatDryRunResponse(i, e),
          sessionId: t,
          threadId: t,
          pendingChanges: [],
          events: [],
          changes: [],
          changedFiles: [],
          changeStats: he()
        }
      : this.runPiCli(a, t, s);
  }
  cancelCurrentRun() {
    this.activeChild &&
      ((this.cancelRequested = !0),
      this.activeChild.kill("SIGTERM"),
      window.setTimeout(() => {
        this.activeChild && this.activeChild.kill("SIGKILL");
      }, 1500));
  }
  runPiCli(i, e, t) {
    if (!this.pluginDirectory) throw new Error("Plugin directory is not available.");
    let n = e != null ? e : this.createSessionFilePath(),
      a = this.buildPiArgs(n);
    return new Promise((o, l) => {
      var k, ye, Pe;
      this.cancelRequested = !1;
      let d = (0, Me.spawn)("pi", a, {
        cwd: (k = this.workingDirectory) != null ? k : this.pluginDirectory,
        env: U()
      });
      ((this.activeChild = d),
        (Pe = t == null ? void 0 : t.onEvent) == null ||
          Pe.call(t, {
            type: "pi_start",
            raw: {
              args: a.slice(1),
              cwd: (ye = this.workingDirectory) != null ? ye : this.pluginDirectory
            }
          }));
      let h = "",
        u = "",
        g = "",
        m = !1,
        c = [],
        p = (w) => {
          m || ((m = !0), l(w));
        },
        v = () => {
          var x;
          if (m) return;
          m = !0;
          let w = { type: "agent_end", raw: { sessionFile: n } };
          (c.push(w),
            (x = t == null ? void 0 : t.onEvent) == null || x.call(t, w),
            o({
              finalResponse: g.trim(),
              sessionId: n,
              threadId: n,
              pendingChanges: [],
              events: c,
              changes: [],
              changedFiles: [],
              changeStats: he()
            }),
            d.kill("SIGTERM"));
        };
      (d.stdout.on("data", (w) => {
        var we;
        h += w.toString("utf8");
        let x = h.split(/\r?\n/);
        h = (we = x.pop()) != null ? we : "";
        for (let it of x)
          Ee(
            it,
            t,
            c,
            (nt) => {
              g += nt;
            },
            v
          );
      }),
        d.stderr.on("data", (w) => {
          u += w.toString("utf8");
        }),
        d.once("error", (w) =>
          p(
            w && w.code === "ENOENT"
              ? new Error(
                  "Pi CLI not found. Install it with `npm install -g @mariozechner/pi-coding-agent`, then restart Obsidian so it can find `pi` on PATH."
                )
              : w
          )
        ),
        d.once("close", (w) => {
          if ((this.activeChild === d && (this.activeChild = void 0), !m)) {
            if (this.cancelRequested) {
              ((this.cancelRequested = !1), p(new Error("Pi run canceled.")));
              return;
            }
            (h.trim() &&
              Ee(
                h.trim(),
                t,
                c,
                (x) => {
                  g += x;
                },
                v
              ),
              !m && p(new Error(u.trim() || `Pi exited with code ${w != null ? w : 1}.`)));
          }
        }),
        d.stdin.write(i),
        d.stdin.end());
    });
  }
  buildPiArgs(i) {
    let e = ["--mode", "json", "--session", i],
      t = this.settings.model === "__custom" ? this.settings.customModel : this.settings.model;
    (t && e.push("--model", t),
      this.settings.reasoningEffort && e.push("--thinking", this.settings.reasoningEffort),
      this.settings.includeDefaultSkills === !1 && e.push("--no-skills"));
    for (let s of getConfiguredSkillPaths(this.settings, this.workingDirectory))
      e.push("--skill", s);
    let n = this.settings.sandboxMode === "workspace-write" ? "edit" : this.settings.sandboxMode;
    return (
      n === "chat"
        ? e.push("--no-tools")
        : e.push(
            "--tools",
            n === "full-agent"
              ? "read,grep,find,ls,edit,write,bash"
              : n === "edit"
                ? "read,grep,find,ls,edit,write"
                : "read,grep,find,ls"
          ),
      e
    );
  }
  createSessionFilePath() {
    var e;
    let i = (0, j.join)((e = this.pluginDirectory) != null ? e : ".", "pi-sessions");
    return (
      (0, Ae.mkdirSync)(i, { recursive: !0 }),
      (0, j.join)(i, `${Date.now()}-${Math.random().toString(36).slice(2)}.jsonl`)
    );
  }
  formatDryRunResponse(i, e) {
    let t = [
      "Dry run: Pi CLI was not called.",
      "",
      `Prompt: ${i}`,
      "",
      e.activeNote
        ? `Active note: [[${e.activeNote.path.replace(/\.md$/i, "")}]]`
        : "Active note: none",
      `Search results: ${e.searchResults.length}`,
      `Linked notes: ${e.linkedNeighborhood.length}`
    ];
    return (
      e.activeNote &&
        t.push(
          "",
          "Backlinks:",
          ...e.activeNote.backlinks
            .slice(0, 8)
            .map((n) => `- [[${n.path.replace(/\.md$/i, "")}]] (${n.count})`),
          "",
          "Outgoing links:",
          ...e.activeNote.outgoingLinks
            .slice(0, 8)
            .map((n) => `- [[${n.path.replace(/\.md$/i, "")}]] (${n.count})`),
          "",
          "Unresolved links:",
          ...e.activeNote.unresolvedLinks.slice(0, 8).map((n) => `- [[${n.display}]] (${n.count})`)
        ),
      e.searchResults.length > 0 &&
        t.push(
          "",
          "Top note matches:",
          ...e.searchResults.map((n) => `- [[${n.path.replace(/\.md$/i, "")}]] score=${n.score}`)
        ),
      t.join(`
`)
    );
  }
};
function Ee(r, i, e, t, n) {
  var l, d, h, u, g, m, c, p, v, k;
  if (!r.trim()) return;
  let s;
  try {
    s = JSON.parse(r);
  } catch (w) {
    return;
  }
  let a = String((l = s.type) != null ? l : "event");
  if (a === "tool_execution_start" || a === "tool_execution_update") {
    let w = {
      type: a === "tool_execution_start" ? "tool_start" : "tool_update",
      raw: s,
      message: String((d = s.toolName) != null ? d : "tool")
    };
    (e.push(w), (h = i == null ? void 0 : i.onEvent) == null || h.call(i, w));
    return;
  }
  if (a === "tool_execution_end") {
    let w = {
      type: "tool_end",
      raw: s,
      message: String((u = s.toolName) != null ? u : "tool")
    };
    (e.push(w), (g = i == null ? void 0 : i.onEvent) == null || g.call(i, w));
    return;
  }
  let o = s.assistantMessageEvent;
  if (a === "message_update" && (o == null ? void 0 : o.type) === "text_delta") {
    let w = (m = o.delta) != null ? m : "";
    t(w);
    let x = { type: "text_delta", raw: s, textDelta: w };
    (e.push(x),
      (c = i == null ? void 0 : i.onEvent) == null || c.call(i, x),
      (p = i == null ? void 0 : i.onTextDelta) == null || p.call(i, w, x));
    return;
  }
  if (a === "agent_end") {
    let w = { type: "agent_end", raw: s };
    (e.push(w), (v = i == null ? void 0 : i.onEvent) == null || v.call(i, w), n());
    return;
  }
  let w = { type: a, raw: s };
  (e.push(w), (k = i == null ? void 0 : i.onEvent) == null || k.call(i, w));
}
var Re = require("child_process"),
  Le = require("path");
var q = class {
  constructor(i) {
    this.pluginDirectory = i;
  }
  async getAvailableModels() {
    let i = "pi",
      e = await this.execPi(i, ["--list-models"]);
    return ft(e);
  }
  getEffectiveConfig(i) {
    return rn(i);
  }
  execPi(i, e) {
    return new Promise((t, n) => {
      (0, Re.execFile)(i, e, { env: U(), timeout: 2e4 }, (s, a, o) => {
        if (s) {
          n(
            new Error(
              `Could not query Pi model registry: ${s.message}${
                o
                  ? `
${o}`
                  : ""
              }`
            )
          );
          return;
        }
        t(a || o);
      });
    });
  }
};
function ft(r) {
  return r
    .replace(/\x1b\[[0-9;?]*[ -/]*[@-~]/g, "")
    .split(/\r?\n/)
    .map((i) => i.trim())
    .filter(Boolean)
    .filter((i) => !i.startsWith("provider"))
    .map((i) => i.split(/\s{2,}/))
    .filter((i) => i.length >= 5)
    .map((i) => {
      let e = i[0],
        t = i[1],
        n = hn(i[4]);
      return {
        slug: `${e}/${t}`,
        displayName: `${e}: ${t}`,
        defaultReasoningLevel: n.includes("medium") ? "medium" : n[0] || "off",
        supportedReasoningLevels: n
      };
    });
}
function hn(r) {
  let i = String(r || "")
    .trim()
    .toLowerCase();
  return !i || i === "no" || i === "false"
    ? ["off"]
    : i === "yes" || i === "true"
      ? ["off", "minimal", "low", "medium", "high", "xhigh"]
      : i
          .split(/[\/,|]+/)
          .map((e) => e.trim())
          .filter(Boolean)
          .filter((e) => ["off", "minimal", "low", "medium", "high", "xhigh"].includes(e));
}
function rn(r) {
  let i = tn(),
    e = r ? (0, Le.join)(r, ".pi", "settings.json") : "",
    t = nn(sn(i), sn(e)),
    n = t.defaultModel ? String(t.defaultModel) : "",
    s = t.defaultProvider ? String(t.defaultProvider) : "",
    a = n ? (n.includes("/") ? n : s ? `${s}/${n}` : n) : "",
    o = t.defaultThinkingLevel ? String(t.defaultThinkingLevel) : "";
  return { effectiveModel: a, effectiveReasoning: o };
}
function tn() {
  let r = process.env.PI_CODING_AGENT_DIR;
  if (r) return un(r, "settings.json");
  let i = process.env.HOME || process.env.USERPROFILE || "";
  return i ? (0, Le.join)(i, ".pi", "agent", "settings.json") : "";
}
function sn(r) {
  try {
    return r && Re && Le && require("fs").existsSync(r)
      ? JSON.parse(require("fs").readFileSync(r, "utf8"))
      : {};
  } catch (i) {
    return {};
  }
}
function nn(r, i) {
  let e = { ...r };
  for (let [t, n] of Object.entries(i || {}))
    n &&
    typeof n === "object" &&
    !Array.isArray(n) &&
    typeof e[t] === "object" &&
    !Array.isArray(e[t])
      ? (e[t] = nn(e[t], n))
      : (e[t] = n);
  return e;
}
function un(r, ...i) {
  return (r.startsWith("~") && (r = (process.env.HOME || "") + r.slice(1)), (0, Le.join)(r, ...i));
}
var skillCommandCache = { key: "", at: 0, commands: [] };
function getSkillSlashCommands(r, i) {
  let e = JSON.stringify({
      defaults: !r || r.includeDefaultSkills !== !1,
      additional: normalizeSkillFolderList(r == null ? void 0 : r.additionalSkillFolders),
      base: i || ""
    }),
    t = Date.now();
  return skillCommandCache.key === e && t - skillCommandCache.at < 5e3
    ? skillCommandCache.commands
    : ((skillCommandCache = {
        key: e,
        at: t,
        commands: discoverSkillCommands(r, i)
      }),
      skillCommandCache.commands);
}
function discoverSkillCommands(r, i) {
  return discoverSkills(r, i)
    .sort((a, o) => a.sourceRank - o.sourceRank || a.name.localeCompare(o.name))
    .map((a) => ({
      command: `/skill:${a.name}`,
      label: a.name,
      detail: a.description || "Pi skill",
      insertText: `/skill:${a.name} `,
      implemented: !0
    }));
}
function discoverSkills(r, i) {
  let e = [],
    t = (a, o) => {
      a && !e.some((l) => l.path === a) && e.push({ path: a, rank: o });
    };
  for (let a of normalizeSkillFolderList(r == null ? void 0 : r.additionalSkillFolders))
    t(resolveSkillCommandPath(a, i), 0);
  if (!r || r.includeDefaultSkills !== !1) {
    let a = process.env.HOME || process.env.USERPROFILE || "",
      o = process.env.PI_CODING_AGENT_DIR;
    (t(o ? un(o, "skills") : a ? (0, Le.join)(a, ".pi", "agent", "skills") : "", 1),
      t(a ? (0, Le.join)(a, ".agents", "skills") : "", 1),
      i && (t((0, Le.join)(i, ".pi", "skills"), 1), t((0, Le.join)(i, ".agents", "skills"), 1)));
    for (let l of getSettingsSkillPaths(i)) t(l, 1);
  }
  let n = new Map();
  for (let { path: a, rank: o } of e)
    for (let l of findSkillFiles(a))
      try {
        let d = parseSkillFile(l, o);
        d && d.name && !n.has(d.name) && n.set(d.name, d);
      } catch (d) {}
  return [...n.values()];
}
function resolveSkillCommandPath(r, i) {
  let e = String(r || "").trim();
  return e
    ? (e.startsWith("~") && (e = (process.env.HOME || process.env.USERPROFILE || "") + e.slice(1)),
      Le.isAbsolute(e) ? e : (0, Le.join)(i || "", e))
    : "";
}
function getSettingsSkillPaths(r) {
  let i = [],
    e = (n, s) => {
      for (let a of normalizeSkillFolderList(n.skills)) i.push(resolveSkillCommandPath(a, s));
    },
    t = tn();
  (t && e(sn(t), Le.dirname(t)), r && e(sn((0, Le.join)(r, ".pi", "settings.json")), r));
  return i.filter(Boolean);
}
function findSkillByName(r, i, e) {
  return discoverSkills(r, i).find((t) => t.name === e);
}
function readSkillContent(r) {
  return require("fs").readFileSync(r, "utf8");
}
function findSkillFiles(r, i = 5, e = !0, t = []) {
  if (!r || t.length >= 100) return t;
  let n = require("fs"),
    s;
  try {
    s = n.statSync(r);
  } catch (a) {
    return t;
  }
  if (s.isFile()) {
    (/(^|\/)SKILL\.md$/i.test(r) || /\.md$/i.test(r)) && t.push(r);
    return t;
  }
  if (!s.isDirectory() || i < 0) return t;
  let a = (0, Le.join)(r, "SKILL.md");
  try {
    n.existsSync(a) && t.push(a);
  } catch (o) {}
  let o = [];
  try {
    o = n.readdirSync(r, { withFileTypes: !0 });
  } catch (l) {
    return t;
  }
  for (let l of o) {
    if (t.length >= 100) break;
    let d = (0, Le.join)(r, l.name);
    l.isDirectory()
      ? findSkillFiles(d, i - 1, !1, t)
      : e && /\.md$/i.test(l.name) && l.name.toUpperCase() !== "SKILL.MD" && t.push(d);
  }
  return t;
}
function parseSkillFile(r, i = 1) {
  let e = require("fs").readFileSync(r, "utf8").slice(0, 8192),
    t = e.match(/^---\s*\r?\n([\s\S]*?)\r?\n---/),
    n = t ? parseSkillFrontmatter(t[1]) : {},
    s = normalizeSkillName(n.name || inferSkillNameFromPath(r)),
    a = n.description || inferSkillDescription(e, t);
  return s ? { name: s, description: a || "Pi skill", path: r, sourceRank: i } : void 0;
}
function parseSkillFrontmatter(r) {
  let i = {},
    e = "",
    t = "",
    n = [],
    s = () => {
      e &&
        ((i[e] = cleanSkillYamlValue(
          (t === "|" ? n.join("\n") : n.join(" ").replace(/\s+/g, " ")).trim()
        )),
        (e = ""),
        (t = ""),
        (n = []));
    };
  for (let a of r.split(/\r?\n/)) {
    let o = a.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (o) {
      s();
      let l = o[1],
        d = o[2].trim();
      if (/^[>|][+-]?$/.test(d)) {
        ((e = l), (t = d.charAt(0)), (n = []));
        continue;
      }
      i[l] = cleanSkillYamlValue(d);
    } else e && /^\s+/.test(a) && n.push(a.trim());
  }
  return (s(), i);
}
function cleanSkillYamlValue(r) {
  return String(r || "")
    .trim()
    .replace(/^['\"]|['\"]$/g, "");
}
function inferSkillNameFromPath(r) {
  let i =
    Le.basename(r).toLowerCase() === "skill.md"
      ? Le.basename(Le.dirname(r))
      : Le.basename(r, Le.extname(r));
  return i;
}
function normalizeSkillName(r) {
  return String(r || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-+/g, "-")
    .slice(0, 64);
}
function inferSkillDescription(r, i) {
  let e = i ? r.slice(i[0].length) : r,
    t = e.match(/^#\s+(.+)$/m),
    n = e
      .split(/\r?\n/)
      .map((s) => s.trim())
      .find((s) => s && !s.startsWith("#") && !s.startsWith("---"));
  return n || (t ? t[1].trim() : "Pi skill");
}
var mt = [
  {
    command: "/current",
    label: "Current note",
    detail: "Attach the active note, selection, links, tags, headings, and frontmatter.",
    insertText: "/current ",
    implemented: !0
  },
  {
    command: "/backlinks",
    label: "Backlinks",
    detail: "Attach notes that link to the active note.",
    insertText: "/backlinks ",
    implemented: !0
  },
  {
    command: "/links",
    label: "Outgoing links",
    detail: "Attach notes linked from the active note.",
    insertText: "/links ",
    implemented: !0
  },
  {
    command: "/search",
    label: "Vault search",
    detail: "Attach ranked vault note matches for a query.",
    insertText: "/search ",
    argumentHint: "query",
    implemented: !0
  }
];
function G(r, i) {
  return [...mt.map((e) => ({ ...e })), ...getSkillSlashCommands(r, i)];
}
function Ie(r) {
  var e, t;
  let i = [],
    n = (s) => {
      let a = s
        .trim()
        .replace(/^\[\[|\]\]$/g, "")
        .replace(/\|.*$/, "");
      a &&
        i.push(
          a.endsWith("/")
            ? { type: "folder", value: a.replace(/\/+$/, "") }
            : { type: "note", value: a }
        );
    };
  for (let s of r.matchAll(/(?:^|\s)@\[\[([^\]]+)\]\]/g)) n(s[1]);
  for (let s of r.matchAll(/(?:^|\s)@"([^"]+)"/g)) n(s[1]);
  for (let s of r.matchAll(/(?:^|\s)@'([^']+)'/g)) n(s[1]);
  for (let s of r.matchAll(/(?:^|\s)@([^\s"'[]+)/g)) n(s[1]);
  for (let s of r.matchAll(/(?:^|\s)#([A-Za-z0-9/_-]+)/g))
    i.push({ type: "tag", value: `#${s[1]}` });
  for (let s of r.split(/\r?\n/)) {
    let o = s.match(/^\/skill:([a-z0-9-]+)(?:\s+(.+))?$/i);
    o &&
      i.push({
        type: "skill",
        value: o[1].toLowerCase(),
        argument: (t = (e = o[2]) == null ? void 0 : e.trim()) != null ? t : ""
      });
    let a = s.match(/^\/([A-Za-z0-9_-]+)(?:\s+(.+))?$/);
    a &&
      i.push({
        type: "command",
        value: a[1],
        argument: (t = (e = a[2]) == null ? void 0 : e.trim()) != null ? t : ""
      });
  }
  return { cleanPrompt: r, references: vt(i) };
}
function vt(r) {
  let i = new Set();
  return r.filter((e) => {
    let t = JSON.stringify(e);
    return i.has(t) ? !1 : (i.add(t), !0);
  });
}
var J = class {
  constructor(i, e, t, n) {
    this.graph = i;
    this.settings = e;
    this.bundledInstructions = t;
    this.vaultBasePath = n;
  }
  async build(i, e = "") {
    let t = Ie(i),
      n = await this.graph.getActiveNoteContext(e),
      s = n ? await this.graph.getLinkedNeighborhood(n.path, 1) : [],
      a = await this.graph.searchNotes(t.cleanPrompt, {
        limit: this.settings.maxSearchResults
      }),
      o = await this.resolveAttachments(t.references, n),
      l = this.getToolCatalog(),
      d = G(this.settings, this.vaultBasePath),
      h = this.createInspection({
        activeNote: n,
        linkedNeighborhood: s,
        searchResults: a,
        attachments: o
      });
    return {
      activeNote: n,
      linkedNeighborhood: s,
      searchResults: a,
      attachments: o,
      instructions: [this.bundledInstructions, this.settings.customInstructions]
        .map((u) => u.trim())
        .filter(Boolean).join(`

`),
      toolCatalog: l,
      inspection: h,
      slashCommands: d
    };
  }
  async inspectContext(i, e = "") {
    return (await this.build(i, e)).inspection;
  }
  formatPrompt(i, e, t = []) {
    var n;
    return [
      "Use the following Obsidian vault context to answer the user.",
      "Prefer cited wikilinks or vault paths when referring to notes.",
      "Respect the selected tool mode. Chat has no Pi CLI tools. Review can read/search/list only. Edit can edit/write but not run shell commands. Full Agent can edit/write and run shell commands. Tool modes are not an OS-level sandbox.",
      "",
      "## User prompt",
      i,
      "",
      "## Instructions",
      e.instructions,
      "",
      "## Obsidian context helpers",
      e.toolCatalog.map((s) => `- ${s}`).join(`
`),
      "",
      "## Context inspection",
      JSON.stringify(e.inspection, null, 2),
      "",
      "## Slash commands",
      e.slashCommands.map((s) => {
        let a = s.argumentHint ? ` <${s.argumentHint}>` : "";
        return `- ${s.command}${a}: ${s.label} - ${s.detail}`;
      }).join(`
`),
      "",
      "## Local chat thread history",
      this.formatThreadHistory(t),
      "",
      "## Active note",
      JSON.stringify((n = e.activeNote) != null ? n : null, null, 2),
      "",
      "## Linked neighborhood",
      JSON.stringify(e.linkedNeighborhood, null, 2),
      "",
      "## Search results",
      JSON.stringify(e.searchResults, null, 2),
      "",
      "## Explicit prompt attachments",
      JSON.stringify(e.attachments, null, 2)
    ].join(`
`);
  }
  formatThreadHistory(i) {
    let e = i.slice(-12);
    return e.length === 0
      ? "[]"
      : JSON.stringify(
          e.map((t) => ({ role: t.role, content: t.content })),
          null,
          2
        );
  }
  async resolveAttachments(i, e) {
    let t = [];
    for (let n of i)
      try {
        if (n.type === "note") {
          let s = this.graph.resolveNoteFile(n.value);
          t.push({
            type: "note",
            label: n.value,
            content: s
              ? {
                  context: await this.graph.getNoteContext(s),
                  content: await this.graph.readVaultFile(s.path)
                }
              : { error: `Note not found: ${n.value}` }
          });
        } else
          n.type === "folder"
            ? t.push({
                type: "folder",
                label: n.value,
                content: await this.graph.getFolderSummary(n.value)
              })
            : n.type === "tag"
              ? t.push({
                  type: "tag",
                  label: n.value,
                  content: await this.graph.getNotesByTag(n.value)
                })
              : n.type === "skill"
                ? t.push({
                    type: "skill",
                    label: `/skill:${n.value}`,
                    content: this.resolveSkill(n.value, n.argument)
                  })
                : n.type === "command" &&
                  t.push({
                    type: "command",
                    label: `/${n.value}`,
                    content: await this.resolveCommand(n.value, n.argument, e)
                  });
      } catch (s) {
        t.push({
          type: n.type,
          label: "value" in n ? n.value : "command",
          content: { error: s instanceof Error ? s.message : String(s) }
        });
      }
    return t;
  }
  resolveSkill(i, e = "") {
    let t = findSkillByName(this.settings, this.vaultBasePath, i);
    return t
      ? {
          name: t.name,
          description: t.description,
          path: t.path,
          argument: e,
          instructions: readSkillContent(t.path)
        }
      : { error: `Skill not found: ${i}` };
  }
  async resolveCommand(i, e, t) {
    return i === "current"
      ? t != null
        ? t
        : null
      : i === "backlinks"
        ? t
          ? await this.graph.getBacklinks(t.path)
          : []
        : i === "links"
          ? t
            ? this.graph.getOutgoingLinks(t.path)
            : []
          : i === "search"
            ? e
              ? await this.graph.searchNotes(e, {
                  limit: this.settings.maxSearchResults
                })
              : []
            : { error: `Unknown command: /${i}` };
  }
  getToolCatalog() {
    let i = this.settings.sandboxMode === "workspace-write" ? "edit" : this.settings.sandboxMode;
    if (i === "chat") return ["No Pi CLI tools enabled. Use pre-attached Obsidian context only."];
    let e = ["read(path)", "grep(pattern, path)", "find(glob)", "ls(path)"];
    return (
      (i === "edit" || i === "full-agent") &&
        e.push("edit(path, oldText, newText)", "write(path, content)"),
      i === "full-agent" && e.push("bash(command)"),
      e.push(
        "Tool modes are not an OS-level sandbox; avoid destructive actions unless explicitly requested."
      ),
      e
    );
  }
  createInspection(i) {
    return {
      activeNote: i.activeNote
        ? {
            path: i.activeNote.path,
            title: i.activeNote.title,
            hasSelection: i.activeNote.selection.trim().length > 0,
            selectionLength: i.activeNote.selection.length,
            backlinkCount: i.activeNote.backlinks.length,
            outgoingLinkCount: i.activeNote.outgoingLinks.length,
            unresolvedLinkCount: i.activeNote.unresolvedLinks.length,
            tagCount: i.activeNote.tags.length,
            headingCount: i.activeNote.headings.length
          }
        : void 0,
      attachments: this.summarizeAttachments(i.attachments),
      searchResults: {
        count: i.searchResults.length,
        paths: i.searchResults.map((e) => e.path)
      },
      linkedNeighborhood: {
        count: i.linkedNeighborhood.length,
        paths: i.linkedNeighborhood.map((e) => e.path)
      },
      tools: { badges: this.getToolBadges() },
      run: {
        model: this.getEffectiveModelSummary(),
        reasoning: W(this.settings),
        mode: this.settings.sandboxMode,
        dryRun: this.settings.dryRun
      }
    };
  }
  summarizeAttachments(i) {
    var t;
    let e = {};
    for (let n of i) e[n.type] = ((t = e[n.type]) != null ? t : 0) + 1;
    return {
      total: i.length,
      byType: e,
      items: i.map((n) => ({ type: n.type, label: n.label }))
    };
  }
  getToolBadges() {
    let i = this.settings.sandboxMode === "workspace-write" ? "edit" : this.settings.sandboxMode,
      e = i !== "chat",
      t = i === "edit" || i === "full-agent",
      n = i === "full-agent";
    return [
      {
        id: "read",
        label: "Read files",
        detail: e
          ? "Pi can read files via CLI tools."
          : "Pi CLI file reads are disabled; only attached Obsidian context is available.",
        enabled: e,
        kind: "read"
      },
      {
        id: "search",
        label: "Search files",
        detail: e
          ? "Pi can search/list files via CLI tools."
          : "Pi CLI search/list tools are disabled.",
        enabled: e,
        kind: "search"
      },
      {
        id: "write",
        label: "Edit files",
        detail: t
          ? "Pi can edit and write files. Not OS-sandboxed."
          : "File editing is disabled in this mode.",
        enabled: t,
        kind: "write"
      },
      {
        id: "shell",
        label: "Shell",
        detail: n
          ? "Pi can run shell commands. Not OS-sandboxed."
          : "Shell commands are disabled in this mode.",
        enabled: n,
        kind: "shell"
      }
    ];
  }
  getEffectiveModelSummary() {
    return this.settings.model === b
      ? this.settings.customModel.trim() || "custom"
      : this.settings.model.trim() || "default";
  }
};
var ge = "New chat";
var N = class {
  constructor(i, e, t) {
    this.history = yt(i, e, t);
  }
  get currentThreadId() {
    return this.history.currentThreadId;
  }
  getCurrentThread() {
    return D(this.getMutableCurrentThread());
  }
  getCurrentMessages() {
    return this.getMutableCurrentThread().messages.map($);
  }
  listThreads(i = {}) {
    var t;
    let e = (t = i.includeArchived) != null ? t : !1;
    return this.history.threads
      .filter((n) => e || !n.archived)
      .sort((n, s) => s.updatedAt - n.updatedAt)
      .map(D);
  }
  startNewThread(i) {
    let e = Date.now(),
      t = ue({ title: i, now: e });
    return (
      (this.history = {
        currentThreadId: t.id,
        threads: [t, ...this.history.threads]
      }),
      D(t)
    );
  }
  switchThread(i) {
    let e = this.history.threads.find((t) => t.id === i);
    return e ? ((this.history.currentThreadId = e.id), !0) : !1;
  }
  archiveThread(i = this.history.currentThreadId) {
    return this.updateThread(i, (e, t) => {
      ((e.archived = !0), (e.updatedAt = t));
    });
  }
  unarchiveThread(i) {
    return this.updateThread(i, (e, t) => {
      ((e.archived = !1), (e.updatedAt = t));
    });
  }
  deleteThread(i) {
    var t, n, s, a;
    let e = this.history.threads.filter((o) => o.id !== i);
    return e.length === this.history.threads.length
      ? !1
      : ((this.history.threads = e),
        this.history.currentThreadId === i &&
          (this.history.currentThreadId =
            (a =
              (s =
                (t = this.getMostRecentThread(e.filter((o) => !o.archived))) == null
                  ? void 0
                  : t.id) != null
                ? s
                : (n = this.getMostRecentThread(e)) == null
                  ? void 0
                  : n.id) != null
              ? a
              : this.startNewThread().id),
        !0);
  }
  clearArchivedThreads() {
    let i = this.history.threads.length;
    return (
      (this.history.threads = this.history.threads.filter(
        (e) => !e.archived || e.id === this.history.currentThreadId
      )),
      i - this.history.threads.length
    );
  }
  renameThread(i, e) {
    let t = Y(e);
    return this.updateThread(i, (n, s) => {
      ((n.title = t), (n.updatedAt = s));
    });
  }
  addMessage(i) {
    let e = this.getMutableCurrentThread(),
      t = $(i);
    return (
      (e.messages = [...e.messages, t].slice(-50)),
      (e.updatedAt = Math.max(e.updatedAt, t.createdAt, Date.now())),
      e.title === ge && t.role === "user" && (e.title = Be(t.content)),
      D(e)
    );
  }
  setCurrentPiSessionId(i) {
    this.updateThread(this.history.currentThreadId, (e, t) => {
      ((e.piSessionId = i), (e.updatedAt = t));
    });
  }
  toJSON() {
    return {
      currentThreadId: this.history.currentThreadId,
      threads: this.history.threads.map(D)
    };
  }
  updateThread(i, e) {
    let t = this.history.threads.find((n) => n.id === i);
    return t ? (e(t, Date.now()), !0) : !1;
  }
  getMutableCurrentThread() {
    let i = this.history.threads.find((t) => t.id === this.history.currentThreadId);
    if (i) return i;
    let e = ue({ now: Date.now() });
    return (
      (this.history.currentThreadId = e.id),
      (this.history.threads = [e, ...this.history.threads]),
      e
    );
  }
  getMostRecentThread(i) {
    return [...i].sort((e, t) => t.updatedAt - e.updatedAt)[0];
  }
};
function yt(r, i, e) {
  var l, d, h, u;
  let t = pe(r) ? r : {},
    n = Array.isArray(t.threads) ? t.threads : [],
    s = new Set(),
    a = n.map((g) => Pt(g, s)).filter(bt);
  return (
    a.length === 0 && a.push(wt(i, e)),
    {
      currentThreadId:
        typeof t.currentThreadId == "string" && a.some((g) => g.id === t.currentThreadId)
          ? t.currentThreadId
          : (u =
                (h = (l = De(a.filter((g) => !g.archived))) == null ? void 0 : l.id) != null
                  ? h
                  : (d = De(a)) == null
                    ? void 0
                    : d.id) != null
            ? u
            : a[0].id,
      threads: a
    }
  );
}
function Pt(r, i) {
  var l, d, h, u, g, m, c;
  if (!pe(r)) return;
  let e = Ne(r.messages),
    t = Date.now(),
    n =
      (h = (d = Fe(r.createdAt)) != null ? d : (l = e[0]) == null ? void 0 : l.createdAt) != null
        ? h
        : t,
    s =
      (m =
        (g = Fe(r.updatedAt)) != null ? g : (u = e[e.length - 1]) == null ? void 0 : u.createdAt) !=
      null
        ? m
        : n,
    a = typeof r.id == "string" && r.id.trim() ? r.id : "",
    o = a && !i.has(a) ? a : Oe(t);
  return (
    i.add(o),
    {
      id: o,
      title: Y(typeof r.title == "string" && r.title.trim() ? r.title : fe(e)),
      messages: e,
      createdAt: n,
      updatedAt: s,
      archived: r.archived === !0,
      piSessionId: $e((c = r.piSessionId) != null ? c : r.piThreadId)
    }
  );
}
function wt(r, i) {
  let e = Ne(r),
    t = Date.now();
  return ue({ title: fe(e), now: t, messages: e, piSessionId: $e(i) });
}
function ue(r) {
  var n, s, a, o, l, d;
  let i = ((n = r.messages) != null ? n : []).map($).slice(-50),
    e = (a = (s = i[0]) == null ? void 0 : s.createdAt) != null ? a : r.now,
    t = (l = (o = i[i.length - 1]) == null ? void 0 : o.createdAt) != null ? l : r.now;
  return {
    id: Oe(r.now),
    title: Y((d = r.title) != null ? d : fe(i)),
    messages: i,
    createdAt: e,
    updatedAt: t,
    archived: !1,
    piSessionId: r.piSessionId
  };
}
function Ne(r) {
  return Array.isArray(r) ? r.filter(Ct).map($).slice(-50) : [];
}
function Ct(r) {
  return pe(r)
    ? (r.role === "user" || r.role === "assistant" || r.role === "system") &&
        typeof r.content == "string" &&
        typeof r.createdAt == "number" &&
        Number.isFinite(r.createdAt)
    : !1;
}
function $(r) {
  var i, e;
  return {
    role: r.role,
    content: r.content,
    createdAt: r.createdAt,
    changeSummaries:
      (i = r.changeSummaries) == null
        ? void 0
        : i.map((t) => {
            var n;
            return {
              files: t.files.map((s) => ({ ...s })),
              stats: { ...t.stats },
              sourceEventType: t.sourceEventType,
              unifiedDiff: t.unifiedDiff,
              fileSnapshots: (n = t.fileSnapshots) == null ? void 0 : n.map((s) => ({ ...s }))
            };
          }),
    changedFiles: (e = r.changedFiles) == null ? void 0 : e.map((t) => ({ ...t })),
    changeStats: r.changeStats ? { ...r.changeStats } : void 0
  };
}
function D(r) {
  return {
    id: r.id,
    title: r.title,
    messages: r.messages.map($),
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
    archived: r.archived,
    piSessionId: r.piSessionId
  };
}
function bt(r) {
  return !!r;
}
function pe(r) {
  return !!r && typeof r == "object" && !Array.isArray(r);
}
function Fe(r) {
  return typeof r == "number" && Number.isFinite(r) ? r : void 0;
}
function $e(r) {
  return typeof r == "string" && r.trim() ? r.trim() : void 0;
}
function Y(r) {
  return r.replace(/\s+/g, " ").trim().slice(0, 80) || ge;
}
function fe(r) {
  let i = r.find((e) => e.role === "user");
  return i ? Be(i.content) : ge;
}
function Be(r) {
  return Y(r.replace(/^#+\s*/g, "").replace(/[`*_#[\]()>]/g, ""));
}
function Oe(r) {
  return `thread-${r}-${Math.random().toString(36).slice(2, 10)}`;
}
function De(r) {
  return [...r].sort((i, e) => e.updatedAt - i.updatedAt)[0];
}
var Z = class {
  constructor(i, e) {
    this.app = i;
    this.settings = e;
  }
  async snapshot() {
    let i = new Map();
    for (let e of this.getTrackedFiles()) i.set(e.path, await this.app.vault.cachedRead(e));
    return { files: i };
  }
  async diff(i) {
    let e = await this.snapshot(),
      t = new Set([...i.files.keys(), ...e.files.keys()]),
      n = [],
      s = [],
      a = [];
    for (let o of [...t].sort((l, d) => l.localeCompare(d))) {
      let l = i.files.get(o),
        d = e.files.get(o);
      if (l === d) continue;
      let h = Ve(l != null ? l : ""),
        u = Ve(d != null ? d : ""),
        g = xt(h, u),
        m = g.filter((v) => v.kind === "add").length,
        c = g.filter((v) => v.kind === "delete").length,
        p = l === void 0 ? "added" : d === void 0 ? "deleted" : "modified";
      (n.push({ path: o, status: p, additions: m, deletions: c }),
        s.push({ path: o, status: p, before: l, after: d }),
        a.push(kt(o, g)));
    }
    if (n.length !== 0)
      return {
        files: n,
        stats: St(n),
        sourceEventType: "vault-snapshot",
        fileSnapshots: s,
        unifiedDiff: a.join(`
`)
      };
  }
  getTrackedFiles() {
    let i =
      typeof this.app.vault.getFiles == "function"
        ? this.app.vault.getFiles()
        : this.app.vault.getMarkdownFiles();
    return i.filter((e) => this.isPathAllowed(e.path) && this.isTextFile(e.path));
  }
  isTextFile(i) {
    let e = i.split(".").pop();
    return (
      !!e &&
      [
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
      ].includes(e.toLowerCase())
    );
  }
  isPathAllowed(i) {
    let e = i.replace(/\\/g, "/");
    return !this.settings.ignoredFolders.some((t) => {
      let n = t.replace(/\/+$/, "");
      return e === n || e.startsWith(`${n}/`);
    });
  }
};
function Ve(r) {
  return r.length === 0 ? [] : r.split(/\r?\n/);
}
function xt(r, i) {
  if (r.length * i.length > 25e4)
    return [
      ...r.map((e) => ({ kind: "delete", text: e })),
      ...i.map((e) => ({ kind: "add", text: e }))
    ];
  let e = Tt(r, i),
    t = [],
    n = r.length,
    s = i.length;
  for (; n > 0 || s > 0; )
    n > 0 && s > 0 && r[n - 1] === i[s - 1]
      ? (t.push({ kind: "same", text: r[n - 1] }), n--, s--)
      : s > 0 && (n === 0 || e[n][s - 1] >= e[n - 1][s])
        ? (t.push({ kind: "add", text: i[s - 1] }), s--)
        : n > 0 && (t.push({ kind: "delete", text: r[n - 1] }), n--);
  return t.reverse();
}
function Tt(r, i) {
  let e = Array.from({ length: r.length + 1 }, () => Array.from({ length: i.length + 1 }, () => 0));
  for (let t = 1; t <= r.length; t++)
    for (let n = 1; n <= i.length; n++)
      e[t][n] = r[t - 1] === i[n - 1] ? e[t - 1][n - 1] + 1 : Math.max(e[t - 1][n], e[t][n - 1]);
  return e;
}
function kt(r, i) {
  return [
    `--- a/${r}`,
    `+++ b/${r}`,
    "@@",
    ...i.map((e) =>
      e.kind === "add" ? `+${e.text}` : e.kind === "delete" ? `-${e.text}` : ` ${e.text}`
    )
  ].join(`
`);
}
function St(r) {
  return {
    filesChanged: r.length,
    additions: r.reduce((i, e) => i + e.additions, 0),
    deletions: r.reduce((i, e) => i + e.deletions, 0)
  };
}
var B = require("obsidian");
function S(r) {
  return r
    .toLowerCase()
    .split(/\s+/)
    .map((i) => i.trim())
    .filter((i) => i.length > 1);
}
function _e(r, i, e) {
  var o, l;
  let t = r.toLowerCase(),
    n = i.toLowerCase(),
    s =
      (l = (o = r.split("/").pop()) == null ? void 0 : o.replace(/\.md$/i, "").toLowerCase()) !=
      null
        ? l
        : r,
    a = 0;
  for (let d of e) {
    (s.includes(d) && (a += 12), t.includes(d) && (a += 4));
    let h = n.match(new RegExp(Et(d), "g"));
    h && (a += Math.min(h.length, 10));
  }
  return a;
}
function E(r, i, e = 240) {
  let t = r.replace(/\s+/g, " ").trim();
  if (t.length <= e) return t;
  let n = t.toLowerCase(),
    s = i
      .map((h) => n.indexOf(h))
      .filter((h) => h >= 0)
      .sort((h, u) => h - u)[0],
    a = Math.max(0, (s != null ? s : 0) - Math.floor(e / 3)),
    o = Math.min(t.length, a + e),
    l = a > 0 ? "..." : "",
    d = o < t.length ? "..." : "";
  return `${l}${t.slice(a, o)}${d}`;
}
function me(r, i) {
  return r
    .filter((e) => e.score > 0)
    .sort((e, t) => t.score - e.score || e.path.localeCompare(t.path))
    .slice(0, i);
}
function Et(r) {
  return r.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
var X = class {
  constructor(i, e, t) {
    this.app = i;
    this.settings = e;
    this.getCurrentContextFile = t;
  }
  getMarkdownFiles() {
    return this.app.vault.getMarkdownFiles().filter((i) => this.isPathAllowed(i.path));
  }
  async searchNotes(i, e = {}) {
    var o;
    let t = S(i);
    if (t.length === 0) return [];
    let n = (o = e.limit) != null ? o : this.settings.maxSearchResults,
      s = this.getMarkdownFiles()
        .filter((l) => !e.folder || l.path.startsWith(e.folder))
        .slice(0, this.settings.maxSearchFiles),
      a = [];
    for (let l of s) {
      let d = await this.readFile(l, this.settings.maxFileChars),
        h = _e(l.path, d, t),
        u = this.app.metadataCache.getFileCache(l);
      a.push({
        path: l.path,
        title: l.basename,
        score: h,
        excerpt: E(d, t),
        tags: this.getTags(u)
      });
    }
    return me(a, n);
  }
  async getActiveNoteContext(i = "") {
    let e = this.getActiveFile();
    if (!e) return;
    let t = await this.readFile(e, this.settings.maxFileChars);
    return { ...(await this.getNoteContext(e)), content: t, selection: i };
  }
  async getNoteContext(i) {
    var s;
    let e = typeof i == "string" ? this.app.vault.getAbstractFileByPath(i) : i;
    if (!(e instanceof B.TFile)) throw new Error(`Note not found: ${String(i)}`);
    let t = this.app.metadataCache.getFileCache(e),
      n = await this.readFile(e, this.settings.maxFileChars);
    return {
      path: e.path,
      title: e.basename,
      frontmatter: (s = t == null ? void 0 : t.frontmatter) != null ? s : {},
      tags: this.getTags(t),
      aliases: this.getAliases(t),
      headings: this.getHeadings(t),
      backlinks: await this.getBacklinks(e.path),
      outgoingLinks: this.getOutgoingLinks(e.path),
      unresolvedLinks: this.getUnresolvedLinks(e.path),
      excerpt: E(n, S(e.basename), 320)
    };
  }
  async findReferences(i) {
    let e = this.getMarkdownFiles()
        .filter((n) => n.basename.toLowerCase().includes(i.toLowerCase()))
        .map((n) => ({
          path: n.path,
          title: n.basename,
          score: 20,
          excerpt: "Title match",
          tags: this.getTags(this.app.metadataCache.getFileCache(n))
        })),
      t = await this.searchNotes(i, { limit: this.settings.maxSearchResults });
    return me([...e, ...t], this.settings.maxSearchResults);
  }
  async getFolderSummary(i) {
    let e = i.replace(/^\/+|\/+$/g, ""),
      t = this.getMarkdownFiles()
        .filter((s) => s.path.startsWith(`${e}/`))
        .slice(0, this.settings.maxSearchResults),
      n = [];
    for (let s of t) {
      let a = await this.readFile(s, this.settings.maxFileChars);
      n.push({
        path: s.path,
        title: s.basename,
        score: 1,
        excerpt: E(a, S(s.basename), 260),
        tags: this.getTags(this.app.metadataCache.getFileCache(s))
      });
    }
    return n;
  }
  async getNotesByTag(i) {
    let e = i.startsWith("#") ? i : `#${i}`,
      t = [];
    for (let n of this.getMarkdownFiles()) {
      let s = this.app.metadataCache.getFileCache(n),
        a = this.getTags(s);
      if (!a.includes(e) && !a.includes(e.slice(1))) continue;
      let o = await this.readFile(n, this.settings.maxFileChars);
      t.push({
        path: n.path,
        title: n.basename,
        score: 1,
        excerpt: E(o, S(e), 260),
        tags: a
      });
    }
    return t.slice(0, this.settings.maxSearchResults);
  }
  resolveNoteFile(i) {
    let e = i.replace(/^\/+/, "").replace(/#.*$/, ""),
      t = [e, e.endsWith(".md") ? e : `${e}.md`, e.replace(/\.md$/i, "")];
    for (let n of t) {
      let s = this.app.vault.getAbstractFileByPath(n);
      if (s instanceof B.TFile && this.isPathAllowed(s.path)) return s;
      let a = this.app.metadataCache.getFirstLinkpathDest(n.replace(/\.md$/i, ""), "");
      if (a && this.isPathAllowed(a.path)) return a;
    }
  }
  async getBacklinks(i) {
    let e = this.app.metadataCache.resolvedLinks,
      t = [];
    for (let [n, s] of Object.entries(e)) {
      if (n === i || !this.isPathAllowed(n)) continue;
      let a = s[i];
      if (!a) continue;
      let o = this.app.vault.getAbstractFileByPath(n),
        l = "";
      if (o instanceof B.TFile) {
        let d = await this.readFile(o, this.settings.maxFileChars);
        l = E(d, S(i.replace(/\.md$/i, "")), 220);
      }
      t.push({
        path: n,
        display: n.replace(/\.md$/i, ""),
        count: a,
        excerpt: l
      });
    }
    return t.sort((n, s) => s.count - n.count || n.path.localeCompare(s.path));
  }
  getOutgoingLinks(i) {
    var t;
    let e = (t = this.app.metadataCache.resolvedLinks[i]) != null ? t : {};
    return Object.entries(e)
      .filter(([n]) => this.isPathAllowed(n))
      .map(([n, s]) => ({
        path: n,
        display: n.replace(/\.md$/i, ""),
        count: s
      }))
      .sort((n, s) => s.count - n.count || n.path.localeCompare(s.path));
  }
  getUnresolvedLinks(i) {
    var t;
    let e = (t = this.app.metadataCache.unresolvedLinks[i]) != null ? t : {};
    return Object.entries(e)
      .map(([n, s]) => ({ path: n, display: n, count: s }))
      .sort((n, s) => s.count - n.count || n.path.localeCompare(s.path));
  }
  async getLinkedNeighborhood(i, e = 1) {
    let t = new Set([i]),
      n = [i],
      s = [];
    for (let a = 0; a < e; a++) {
      let o = new Set();
      for (let l of n) {
        let d = this.getOutgoingLinks(l),
          h = await this.getBacklinks(l);
        for (let u of [...d, ...h])
          t.has(u.path) || !u.path.endsWith(".md") || (t.add(u.path), o.add(u.path));
      }
      for (let l of o)
        try {
          s.push(await this.getNoteContext(l));
        } catch (d) {}
      n = [...o].slice(0, this.settings.maxSearchResults);
    }
    return s.slice(0, this.settings.maxSearchResults);
  }
  getActiveFile() {
    var e, t;
    let i =
      (t = (e = this.getCurrentContextFile) == null ? void 0 : e.call(this)) != null
        ? t
        : this.app.workspace.getActiveFile();
    return i && this.isPathAllowed(i.path) ? i : void 0;
  }
  async readVaultFile(i) {
    let e = this.app.vault.getAbstractFileByPath(i);
    if (!(e instanceof B.TFile)) throw new Error(`File not found: ${i}`);
    if (!this.isPathAllowed(e.path)) throw new Error(`Path is not allowed: ${i}`);
    return this.readFile(e, this.settings.maxFileChars);
  }
  async readFile(i, e) {
    let t = await this.app.vault.cachedRead(i);
    return t.length > e
      ? `${t.slice(0, e)}
...[truncated]`
      : t;
  }
  isPathAllowed(i) {
    let e = i.replace(/\\/g, "/");
    return !this.settings.ignoredFolders.some((t) => {
      let n = t.replace(/\/+$/, "");
      return e === n || e.startsWith(`${n}/`);
    });
  }
  getTags(i) {
    var n, s;
    let e = new Set();
    for (let a of (n = i == null ? void 0 : i.tags) != null ? n : []) e.add(a.tag);
    let t = (s = i == null ? void 0 : i.frontmatter) == null ? void 0 : s.tags;
    if (Array.isArray(t)) for (let a of t) e.add(String(a));
    else typeof t == "string" && e.add(t);
    return [...e].sort();
  }
  getAliases(i) {
    var t;
    let e = (t = i == null ? void 0 : i.frontmatter) == null ? void 0 : t.aliases;
    return Array.isArray(e) ? e.map(String) : typeof e == "string" ? [e] : [];
  }
  getHeadings(i) {
    var e;
    return ((e = i == null ? void 0 : i.headings) != null ? e : [])
      .map((t) => t.heading)
      .filter(Boolean)
      .slice(0, 20);
  }
};
var A = require("obsidian"),
  Q = class extends A.Modal {
    constructor(e, t, n) {
      super(e.app);
      this.change = t;
      this.onDone = n;
      this.settled = !1;
      this.plugin = e;
    }
    onOpen() {
      let { contentEl: e } = this;
      (e.empty(),
        e.addClass("obsidian-pi-approval"),
        e.createEl("h2", { text: "Approve Vault Change" }),
        e.createEl("p", {
          text: `${this.change.path} - ${this.change.reason}`
        }));
      let t = e.createEl("div", { cls: "obsidian-pi-diff" });
      (t.createEl("h3", { text: "Before" }),
        t.createEl("pre", { text: this.change.before || "(new file)" }),
        t.createEl("h3", { text: "After" }),
        t.createEl("pre", { text: this.change.after }));
      let n = e.createDiv({ cls: "obsidian-pi-modal-actions" });
      (n.createEl("button", { text: "Reject" }).addEventListener("click", () => {
        (this.finish(), this.close());
      }),
        n
          .createEl("button", { text: "Apply change", cls: "mod-cta" })
          .addEventListener("click", async () => {
            (await this.applyChange(), this.finish(), this.close());
          }));
    }
    onClose() {
      (this.finish(), this.contentEl.empty());
    }
    async applyChange() {
      let e = this.app.vault.getAbstractFileByPath(this.change.path);
      (e instanceof A.TFile
        ? await this.app.vault.modify(e, this.change.after)
        : await this.app.vault.create(this.change.path, this.change.after),
        new A.Notice(`Applied Pi change to ${this.change.path}`));
    }
    finish() {
      this.settled || ((this.settled = !0), this.onDone());
    }
  };
var f = require("obsidian");
function He(r) {
  return (
    (r.activeNote ? 1 : 0) +
    r.linkedNeighborhood.count +
    r.searchResults.count +
    r.attachments.total
  );
}
function We(r) {
  let i = r.activeNote ? 1 : 0;
  return [
    `${i} active note${i === 1 ? "" : "s"}`,
    `${r.linkedNeighborhood.count} linked note${r.linkedNeighborhood.count === 1 ? "" : "s"}`,
    `${r.searchResults.count} search result${r.searchResults.count === 1 ? "" : "s"}`,
    `${r.attachments.total} attachment${r.attachments.total === 1 ? "" : "s"}`
  ].join(" | ");
}
var C = require("obsidian");
function Ue(r) {
  let i = [],
    e,
    t,
    n = () => {
      (e && t && e.hunks.push(t), (t = void 0));
    },
    s = () => {
      (n(), e && i.push(e), (e = void 0));
    };
  for (let a of r.split(/\r?\n/)) {
    if (a.startsWith("diff --git ")) {
      s();
      let o = Lt(a);
      e = {
        oldPath: o == null ? void 0 : o.oldPath,
        newPath: o == null ? void 0 : o.newPath,
        hunks: []
      };
      continue;
    }
    if (a.startsWith("--- ")) {
      (e && (e.hunks.length > 0 || t) && s(),
        e || (e = { hunks: [] }),
        (e.oldPath = ze(a.slice(4))));
      continue;
    }
    if (a.startsWith("+++ ")) {
      (e || (e = { hunks: [] }), (e.newPath = ze(a.slice(4))));
      continue;
    }
    if (a.startsWith("@@")) {
      (e || (e = { hunks: [] }), n(), (t = []));
      continue;
    }
    t && /^[ +\-]/.test(a) && t.push(a);
  }
  return (s(), i);
}
function je(r, i) {
  var t;
  let e = Rt(r);
  for (let n of i.hunks) {
    let s = qe(n),
      a = At(n),
      o = Mt(e, a);
    if (o === -1)
      throw new Error(
        `Current file no longer matches diff for ${(t = i.newPath) != null ? t : i.oldPath}`
      );
    e = [...e.slice(0, o), ...s, ...e.slice(o + a.length)];
  }
  return e.join(`
`);
}
function Ke(r) {
  return r.hunks.flatMap(qe);
}
function qe(r) {
  return r.filter((i) => i.startsWith(" ") || i.startsWith("-")).map((i) => i.slice(1));
}
function At(r) {
  return r.filter((i) => i.startsWith(" ") || i.startsWith("+")).map((i) => i.slice(1));
}
function Mt(r, i) {
  if (i.length === 0) return 0;
  for (let e = 0; e <= r.length - i.length; e++) {
    let t = !0;
    for (let n = 0; n < i.length; n++)
      if (r[e + n] !== i[n]) {
        t = !1;
        break;
      }
    if (t) return e;
  }
  return -1;
}
function Rt(r) {
  return r.length === 0 ? [] : r.split(/\r?\n/);
}
function Lt(r) {
  let e = r
    .slice(11)
    .trim()
    .match(/^a\/(.+) b\/(.+)$/);
  if (e) return { oldPath: ve(e[1]), newPath: ve(e[2]) };
}
function ze(r) {
  let i = r.trim().split(/\t/)[0];
  return i === "/dev/null" ? i : ve(i);
}
function ve(r) {
  if (!r) return;
  let i = r.trim();
  return (
    i.startsWith('"') && i.endsWith('"') && (i = i.slice(1, -1)),
    (i.startsWith("a/") || i.startsWith("b/")) && (i = i.slice(2)),
    i || void 0
  );
}
var M = class extends C.Modal {
  constructor(e, t) {
    super(e.app);
    this.message = t;
    this.plugin = e;
  }
  onOpen() {
    let { contentEl: e } = this;
    (e.empty(),
      this.modalEl.addClass("obsidian-pi-change-review-modal"),
      e.addClass("obsidian-pi-change-review"),
      e.createEl("h2", { text: "Pi Changes" }));
    let t = this.getStats(),
      n = e.createEl("p", { cls: "obsidian-pi-change-summary" });
    (n.createSpan({ text: `${t.filesChanged} files changed, ` }),
      n.createSpan({
        cls: "obsidian-pi-diff-additions",
        text: `+${t.additions}`
      }),
      n.createSpan({ text: " " }),
      n.createSpan({
        cls: "obsidian-pi-diff-deletions",
        text: `-${t.deletions}`
      }));
    let s = this.getChangedFiles();
    if (s.length > 0) {
      let h = e.createEl("ul", { cls: "obsidian-pi-change-files" });
      for (let u of s)
        h.createEl("li", {
          text: `${u.status} ${u.path} (+${u.additions} -${u.deletions})`
        });
    }
    let a = this.getUnifiedDiffs();
    if (a.length > 0) for (let h of a) this.renderDiff(e, h);
    else
      e.createEl("p", {
        cls: "obsidian-pi-empty",
        text: "Pi reported changed files, but did not emit a unified diff for this response."
      });
    let o = e.createDiv({ cls: "obsidian-pi-modal-actions" }),
      l = this.getFileSnapshots();
    o.createEl("button", { text: "Copy diff" }).addEventListener("click", () => {
      this.copyDiff();
    });
    let d = o.createEl("button", { text: "Revert", cls: "mod-warning" });
    ((d.disabled = l.length === 0),
      d.addEventListener("click", () => {
        this.revertDiff();
      }),
      o
        .createEl("button", { text: "Close", cls: "mod-cta" })
        .addEventListener("click", () => this.close()));
  }
  onClose() {
    (this.modalEl.removeClass("obsidian-pi-change-review-modal"), this.contentEl.empty());
  }
  getStats() {
    if (this.message.changeStats) return this.message.changeStats;
    let e = this.getChangedFiles();
    return {
      filesChanged: e.length,
      additions: e.reduce((t, n) => t + n.additions, 0),
      deletions: e.reduce((t, n) => t + n.deletions, 0)
    };
  }
  getChangedFiles() {
    var t, n;
    if ((t = this.message.changedFiles) != null && t.length) return this.message.changedFiles;
    let e = new Map();
    for (let s of (n = this.message.changeSummaries) != null ? n : [])
      for (let a of s.files) e.set(a.path, a);
    return [...e.values()];
  }
  getUnifiedDiffs() {
    var e;
    return ((e = this.message.changeSummaries) != null ? e : [])
      .map((t) => {
        var n, s;
        return (s = (n = t.unifiedDiff) == null ? void 0 : n.trim()) != null ? s : "";
      })
      .filter(Boolean);
  }
  renderDiff(e, t) {
    let n = e.createDiv({ cls: "obsidian-pi-change-diff" }),
      s = t.split(/\r?\n/);
    for (let a = 0; a < s.length; a++) {
      let o = s[a],
        l = n.createDiv({ cls: this.getDiffLineClass(o) });
      (l.createSpan({
        cls: "obsidian-pi-diff-line-number",
        text: String(a + 1)
      }),
        l.createSpan({ cls: "obsidian-pi-diff-line-text", text: o || " " }));
    }
  }
  getDiffLineClass(e) {
    return e.startsWith("+++") || e.startsWith("---")
      ? "obsidian-pi-diff-line obsidian-pi-diff-line-meta"
      : e.startsWith("+")
        ? "obsidian-pi-diff-line obsidian-pi-diff-line-add"
        : e.startsWith("-")
          ? "obsidian-pi-diff-line obsidian-pi-diff-line-delete"
          : e.startsWith("@@")
            ? "obsidian-pi-diff-line obsidian-pi-diff-line-hunk"
            : "obsidian-pi-diff-line";
  }
  async copyDiff() {
    let e = this.getUnifiedDiffs().join(`

`);
    if (!e) {
      new C.Notice("No unified diff available for this response.");
      return;
    }
    (await navigator.clipboard.writeText(e), new C.Notice("Copied Pi diff."));
  }
  async revertDiff() {
    let e = this.getFileSnapshots(),
      t = this.getUnifiedDiffs().join(`
`);
    if (e.length === 0) {
      new C.Notice("No reversible file snapshot is available for this response.");
      return;
    }
    try {
      let n = await It(this.plugin, e);
      if (n.length === 0) {
        new C.Notice("No reversible changes found in this diff.");
        return;
      }
      (new C.Notice(`Reverted ${n.length} file${n.length === 1 ? "" : "s"}.`), this.close());
    } catch (n) {
      let s = n instanceof Error ? n.message : String(n);
      new C.Notice(`Could not revert diff: ${s}`);
    }
  }
  getFileSnapshots() {
    var e;
    return ((e = this.message.changeSummaries) != null ? e : []).flatMap((t) => {
      var n;
      return (n = t.fileSnapshots) != null ? n : [];
    });
  }
};
async function It(r, i) {
  let e = [];
  for (let t of i) {
    if (t.status === "added") {
      (await Je(r, t.path), e.push(t.path));
      continue;
    }
    t.before !== void 0 && (await Ge(r, t.path, t.before), e.push(t.path));
  }
  return e;
}
async function Ft(r, i, e) {
  let t = [],
    n = new Map(e.map((s) => [s.path, s.status]));
  for (let s of Ue(i)) {
    let a = s.oldPath,
      o = s.newPath,
      l = o && o !== "/dev/null" ? o : a;
    if (!l || l === "/dev/null") continue;
    let d = n.get(l);
    if (a === "/dev/null" || d === "added") {
      (await Je(r, l), t.push(l));
      continue;
    }
    let h = Ke(s);
    if (o === "/dev/null" || d === "deleted") {
      (await Ge(
        r,
        l,
        h.join(`
`)
      ),
        t.push(l));
      continue;
    }
    let u = r.app.vault.getAbstractFileByPath(l);
    if (!(u instanceof C.TFile)) throw new Error(`File not found: ${l}`);
    let g = await r.app.vault.cachedRead(u),
      m = je(g, s);
    (await r.app.vault.modify(u, m), t.push(l));
  }
  return t;
}
async function Ge(r, i, e) {
  let t = r.app.vault.getAbstractFileByPath(i);
  t instanceof C.TFile ? await r.app.vault.modify(t, e) : await r.app.vault.create(i, e);
}
async function Je(r, i) {
  let e = r.app.vault.getAbstractFileByPath(i);
  e instanceof C.TFile && (await r.app.vault.delete(e));
}
var Ye = require("obsidian");
var ee = class {
  constructor(i, e) {
    this.plugin = i;
    this.callbacks = e;
  }
  showMessageMenu(i, e, t) {
    var s;
    let n = new Ye.Menu();
    (e.role === "user"
      ? (n.addItem((a) =>
          a
            .setTitle("Edit and resend")
            .setIcon("pencil")
            .onClick(() => {
              let o = this.callbacks.getInput();
              o && ((o.value = e.content), o.focus());
            })
        ),
        n.addItem((a) =>
          a
            .setTitle("Search vault for this")
            .setIcon("search")
            .onClick(() =>
              this.callbacks.runPrompt(`Search the vault for notes related to:

${e.content}`)
            )
        ))
      : (this.messageHasChanges(e) &&
          n.addItem((a) =>
            a
              .setTitle("Review changes")
              .setIcon("git-compare")
              .onClick(() => new M(this.plugin, e).open())
          ),
        (s = e.changedFiles) != null &&
          s.length &&
          (n.addItem((a) =>
            a
              .setTitle("Open changed files")
              .setIcon("folder-open")
              .onClick(() => {
                var o;
                this.callbacks.openChangedFiles((o = e.changedFiles) != null ? o : []);
              })
          ),
          n.addSeparator()),
        n.addItem((a) =>
          a
            .setTitle("Insert into current note")
            .setIcon("file-plus")
            .onClick(() => this.callbacks.insertIntoCurrentNote(e.content))
        ),
        n.addItem((a) =>
          a
            .setTitle("Create note from response")
            .setIcon("file-text")
            .onClick(() => this.callbacks.createNoteFromResponse(e.content))
        ),
        n.addItem((a) =>
          a
            .setTitle("Open cited notes")
            .setIcon("links-coming-in")
            .setDisabled(this.callbacks.extractVaultLinks(e.content).length === 0)
            .onClick(() => this.callbacks.openCitedNotes(e.content))
        ),
        n.addSeparator(),
        n.addItem((a) =>
          a
            .setTitle("Regenerate")
            .setIcon("refresh-cw")
            .setDisabled(!this.callbacks.getPreviousUserPrompt(t))
            .onClick(() => {
              let o = this.callbacks.getPreviousUserPrompt(t);
              o && this.callbacks.runPrompt(o);
            })
        )),
      n.showAtMouseEvent(i));
  }
  getMessageChangeStats(i) {
    if (i.changeStats) {
      let { filesChanged: t, additions: n, deletions: s } = i.changeStats;
      if (t > 0 || n > 0 || s > 0) return i.changeStats;
    }
    let e = this.getDiffStats(i.content);
    return e ? { filesChanged: 0, additions: e.additions, deletions: e.deletions } : void 0;
  }
  messageHasChanges(i) {
    var e, t;
    return !!(
      ((e = i.changeSummaries) != null && e.length) ||
      ((t = i.changedFiles) != null && t.length) ||
      (i.changeStats &&
        (i.changeStats.filesChanged > 0 ||
          i.changeStats.additions > 0 ||
          i.changeStats.deletions > 0))
    );
  }
  getDiffStats(i) {
    let e = 0,
      t = 0;
    for (let n of i.matchAll(/```(?:diff|patch)?\s*\n([\s\S]*?)```/g))
      for (let s of n[1].split(/\r?\n/))
        s.startsWith("+++") ||
          s.startsWith("---") ||
          (s.startsWith("+") && e++, s.startsWith("-") && t++);
    return e > 0 || t > 0 ? { additions: e, deletions: t } : void 0;
  }
};
var R = require("obsidian");
var te = class {
  constructor(i, e) {
    this.plugin = i;
    this.callbacks = e;
  }
  async archiveCurrentChat() {
    if (this.plugin.messages.length === 0) {
      new R.Notice("No chat to archive.");
      return;
    }
    let i = F(H.archiveFolder);
    await this.ensureFolder(i);
    let e = new Date().toISOString().replace(/[:.]/g, "-"),
      t = await this.getAvailableNotePath(`Chat ${e}.md`, i),
      n = await this.plugin.app.vault.create(t, this.formatTranscript());
    (await this.plugin.app.workspace.getLeaf(!1).openFile(n), new R.Notice("Transcript saved."));
  }
  formatTranscript() {
    let i = new Date().toISOString(),
      e = this.plugin.messages.map(
        (t) => `## ${t.role === "assistant" ? "Pi" : t.role === "user" ? "You" : "System"}

${t.content.trim()}`
      ).join(`

`);
    return `---
type: pi-chat
created: ${i}
---

# Pi chat ${i}

${e}
`;
  }
  async copyText(i) {
    (await navigator.clipboard.writeText(i), new R.Notice("Copied to clipboard."));
  }
  insertIntoCurrentNote(i) {
    var t;
    let e = (t = this.plugin.app.workspace.activeEditor) == null ? void 0 : t.editor;
    if (!e) {
      new R.Notice("Open a note first.");
      return;
    }
    e.replaceSelection(i);
  }
  async createNoteFromResponse(i) {
    let e = this.getResponseTitle(i),
      t = await this.getAvailableNotePath(`${e}.md`);
    await this.ensureFolder("Pi");
    let n = await this.plugin.app.vault.create(t, i);
    await this.plugin.app.workspace.getLeaf(!1).openFile(n);
  }
  async openCitedNotes(i) {
    let e = this.extractVaultLinks(i);
    if (e.length === 0) {
      new R.Notice("No vault links found.");
      return;
    }
    for (let t of e.slice(0, 5)) await this.callbacks.openVaultLink(t);
  }
  getPreviousUserPrompt(i) {
    for (let e = i - 1; e >= 0; e--) {
      let t = this.plugin.messages[e];
      if ((t == null ? void 0 : t.role) === "user") return t.content;
    }
  }
  extractVaultLinks(i) {
    var t;
    let e = new Set();
    for (let n of i.matchAll(/\[\[([^\]|#]+)(?:#[^\]|]+)?(?:\|[^\]]+)?\]\]/g)) e.add(n[1]);
    for (let n of i.matchAll(/\[[^\]]+\]\(([^)]+\.md)(?:#[^)]+)?\)/g))
      e.add(
        this.callbacks.formatVaultLinkTarget(
          (t = this.callbacks.parseVaultLinkTarget(n[1])) != null ? t : { path: n[1] }
        )
      );
    for (let n of i.matchAll(/(?:\/?[A-Za-z0-9 _.-]+\/)+[A-Za-z0-9 _.-]+\.md(?::\d+)?/g)) {
      let s = this.callbacks.parseVaultLinkTarget(n[0]);
      e.add(s ? this.callbacks.formatVaultLinkTarget(s) : n[0]);
    }
    return [...e];
  }
  getResponseTitle(i) {
    var n, s;
    let e = (n = i.match(/^#\s+(.+)$/m)) == null ? void 0 : n[1];
    return (
      ((s = e != null ? e : i.split(/\r?\n/).find((a) => a.trim())) != null ? s : "Pi response")
        .replace(/[\\/:*?"<>|#[\]]/g, "")
        .trim()
        .slice(0, 80) || "Pi response"
    );
  }
  async ensureFolder(i) {
    let e = F(i).split("/"),
      t = "";
    for (let n of e)
      ((t = t ? `${t}/${n}` : n),
        this.plugin.app.vault.getAbstractFileByPath(t) ||
          (await this.plugin.app.vault.createFolder(t)));
  }
  async getAvailableNotePath(i, e = "Pi") {
    let t = F(e),
      n = `${t}/${i}`;
    if (!this.plugin.app.vault.getAbstractFileByPath(n)) return n;
    let s = i.replace(/\.md$/i, "");
    for (let a = 2; a < 100; a++) {
      let o = `${t}/${s} ${a}.md`;
      if (!this.plugin.app.vault.getAbstractFileByPath(o)) return o;
    }
    return `${t}/${s} ${Date.now()}.md`;
  }
};
var L = require("obsidian");
var ie = class {
  constructor(i) {
    this.plugin = i;
  }
  render(i) {
    ((this.row = i.createDiv({ cls: "obsidian-pi-run-settings" })), this.populate(this.row));
  }
  refresh() {
    this.row && (this.row.empty(), this.populate(this.row));
  }
  populate(i) {
    (this.addRunSetting(
      i,
      "Model",
      "sparkles",
      _(this.plugin.settings),
      this.plugin.settings.model,
      async (e) => {
        ((this.plugin.settings.model = e),
          (this.plugin.settings.reasoningEffort = ""),
          e === b &&
            !this.plugin.settings.customModel &&
            new L.Notice("Set custom model ID in plugin settings."),
          await this.plugin.saveSettings(),
          this.refresh());
      }
    ),
      this.addRunSetting(
        i,
        "Think",
        "brain",
        de(this.plugin.settings),
        this.plugin.settings.reasoningEffort,
        async (e) => {
          ((this.plugin.settings.reasoningEffort = e), await this.plugin.saveSettings());
        }
      ),
      this.addRunSetting(
        i,
        "Tools",
        this.getRunSettingIcon("Tools", this.plugin.settings.sandboxMode),
        ce(),
        this.plugin.settings.sandboxMode,
        async (e) => {
          if (
            (e === "edit" || e === "full-agent" || e === "workspace-write") &&
            !this.plugin.settings.acknowledgedToolRisk &&
            !window.confirm(
              "Pi tool modes are not an OS-level sandbox. Edit and Full Agent can modify vault/project files, and Full Agent can run shell commands. Continue?"
            )
          ) {
            this.refresh();
            return;
          }
          ((this.plugin.settings.sandboxMode = e),
            (e === "edit" || e === "full-agent" || e === "workspace-write") &&
              (this.plugin.settings.acknowledgedToolRisk = !0),
            await this.plugin.saveSettings());
        }
      ));
  }
  addRunSetting(i, e, t, n, s, a) {
    var u;
    let o = Object.prototype.hasOwnProperty.call(n, s) ? s : "",
      l = (u = n[o]) != null ? u : "Default",
      d = this.formatRunSettingDisplayLabel(e, o, l),
      h = i.createEl("button", {
        cls: `clickable-icon obsidian-pi-run-setting ${this.getRunSettingClass(e, o)}`,
        attr: { "aria-label": `${e}: ${l}`, title: `${e}: ${l}` }
      });
    ((0, L.setIcon)(h, t),
      h.createSpan({ cls: "obsidian-pi-control-label", text: d }),
      h.addEventListener("click", async (g) => {
        g.preventDefault();
        let m = new L.Menu();
        for (let [c, p] of Object.entries(n))
          m.addItem((v) => {
            (v.setTitle(p).onClick(async () => {
              (await a(c), this.refresh());
            }),
              c === o && v.setIcon("check"));
          });
        m.showAtMouseEvent(g);
      }));
  }
  formatRunSettingDisplayLabel(i, e, t) {
    return i === "Model"
      ? e === b
        ? this.plugin.settings.customModel.trim() || "Custom"
        : e
          ? t.split(" - ")[0].replace(/^GPT-/i, "GPT-")
          : this.formatDefaultModelLabel()
      : i === "Think"
        ? e
          ? t.split(" - ")[0].replace(/^XHigh$/i, "XHigh")
          : this.formatDefaultReasoningLabel()
        : i === "Tools"
          ? e === "chat"
            ? "Chat"
            : e === "read-only"
              ? "Review"
              : e === "full-agent"
                ? "Full"
                : e === "edit" || e === "workspace-write"
                  ? "Edit"
                  : t
          : t;
  }
  formatDefaultModelLabel() {
    let i = this.plugin.settings.effectiveModel;
    return i ? i.split("/").pop() || i : "Default";
  }
  formatDefaultReasoningLabel() {
    let i = this.plugin.settings.effectiveReasoning;
    return i ? this.formatReasoningLabel(i) : this.formatReasoningLabel(W(this.plugin.settings));
  }
  formatReasoningLabel(i) {
    return i === "pi-default" || i === "cli-default"
      ? "Pi default"
      : i === "xhigh"
        ? "XHigh"
        : i.charAt(0).toUpperCase() + i.slice(1);
  }
  getRunSettingIcon(i, e) {
    return i === "Tools"
      ? e === "chat"
        ? "message-square"
        : e === "full-agent"
          ? "terminal"
          : e === "edit" || e === "workspace-write"
            ? "pencil-line"
            : "eye"
      : "";
  }
  getRunSettingClass(i, e) {
    return i === "Tools"
      ? e === "full-agent"
        ? "obsidian-pi-run-setting-mode-full"
        : e === "edit" || e === "workspace-write"
          ? "obsidian-pi-run-setting-mode-write"
          : "obsidian-pi-run-setting-mode-read"
      : "";
  }
};
var ne = class {
  constructor(i, e, t) {
    this.inputEl = i;
    this.plugin = e;
    this.onApply = t;
    this.suggestions = [];
    this.selectedSuggestionIndex = 0;
  }
  update() {
    let i = this.getActiveSuggestMatch();
    if (!i) {
      this.close();
      return;
    }
    if (
      ((this.activeSuggestRange = { start: i.start, end: i.end }),
      (this.suggestions = this.getSuggestions(i.trigger, i.query).slice(0, 16)),
      (this.selectedSuggestionIndex = 0),
      this.suggestions.length === 0)
    ) {
      this.close();
      return;
    }
    this.render();
  }
  handleKeydown(i) {
    return !this.suggestEl || this.suggestions.length === 0
      ? !1
      : i.key === "ArrowDown"
        ? (i.preventDefault(),
          (this.selectedSuggestionIndex =
            (this.selectedSuggestionIndex + 1) % this.suggestions.length),
          this.render(),
          !0)
        : i.key === "ArrowUp"
          ? (i.preventDefault(),
            (this.selectedSuggestionIndex =
              (this.selectedSuggestionIndex - 1 + this.suggestions.length) %
              this.suggestions.length),
            this.render(),
            !0)
          : i.key === "Enter" || i.key === "Tab"
            ? (i.preventDefault(), this.apply(this.selectedSuggestionIndex), !0)
            : i.key === "Escape"
              ? (i.preventDefault(), this.close(), !0)
              : !1;
  }
  close() {
    var i;
    ((i = this.suggestEl) == null || i.remove(),
      (this.suggestEl = void 0),
      (this.suggestions = []),
      (this.activeSuggestRange = void 0),
      (this.selectedSuggestionIndex = 0));
  }
  getActiveSuggestMatch() {
    let i = this.inputEl.selectionStart,
      e = this.inputEl.value.slice(0, i),
      t = e.match(/(^|\s)([@#\/])([^\s]*)$/);
    if (!t || t.index === void 0) return;
    let n = t.index + t[1].length;
    if (t[2] === "/" && e.slice(e.lastIndexOf("\n", n - 1) + 1, n).trim().length > 0) return;
    return { trigger: t[2], query: t[3].toLowerCase(), start: n, end: i };
  }
  getSuggestions(i, e) {
    return i === "@"
      ? this.getNoteAndFolderSuggestions(e)
      : i === "#"
        ? this.getTagSuggestions(e)
        : this.getCommandSuggestions(e);
  }
  formatAttachmentInsert(i) {
    return /\s/.test(i) ? `@"${i.replace(/"/g, '\\"')}" ` : `@${i} `;
  }
  getNoteAndFolderSuggestions(i) {
    let e = this.plugin.app.vault.getMarkdownFiles(),
      t = new Set();
    for (let a of e) {
      let o = a.path.split("/");
      for (let l = 1; l < o.length; l++) t.add(o.slice(0, l).join("/"));
    }
    let n = [...t].map((a) => ({
        label: `${a}/`,
        detail: "Folder",
        insertText: this.formatAttachmentInsert(`${a}/`)
      })),
      s = e.map((a) => {
        let o = a.path.replace(/\.md$/i, "");
        return {
          label: o,
          detail: "Note",
          insertText: this.formatAttachmentInsert(o)
        };
      });
    return [...n, ...s]
      .filter((a) => a.label.toLowerCase().includes(i))
      .sort((a, o) => a.label.localeCompare(o.label));
  }
  getTagSuggestions(i) {
    var t, n;
    let e = new Set();
    for (let s of this.plugin.app.vault.getMarkdownFiles()) {
      let a = this.plugin.app.metadataCache.getFileCache(s);
      for (let l of (t = a == null ? void 0 : a.tags) != null ? t : []) e.add(l.tag);
      let o = (n = a == null ? void 0 : a.frontmatter) == null ? void 0 : n.tags;
      if (Array.isArray(o)) for (let l of o) e.add(String(l).startsWith("#") ? String(l) : `#${l}`);
      else typeof o == "string" && e.add(o.startsWith("#") ? o : `#${o}`);
    }
    return [...e]
      .filter((s) => s.toLowerCase().includes(i))
      .sort()
      .map((s) => ({ label: s, detail: "Tag", insertText: `${s} ` }));
  }
  getCommandSuggestions(i) {
    return G(this.plugin.settings, this.plugin.getVaultBasePath())
      .map((e) => ({
        label: e.command,
        detail: e.command.startsWith("/skill:") ? `Skill — ${e.detail}` : e.detail,
        insertText: e.insertText
      }))
      .filter((e) => `${e.label} ${e.detail} ${e.insertText}`.toLowerCase().includes(i));
  }
  render() {
    var e;
    (e = this.suggestEl) == null || e.remove();
    let i = this.inputEl.parentElement;
    if (i) {
      this.suggestEl = i.createDiv({
        cls: "obsidian-pi-suggest",
        attr: { role: "listbox" }
      });
      for (let t = 0; t < this.suggestions.length; t++) {
        let n = this.suggestions[t],
          s = this.suggestEl.createDiv({
            cls: `obsidian-pi-suggest-item${t === this.selectedSuggestionIndex ? " is-selected" : ""}`,
            attr: {
              role: "option",
              "aria-selected": t === this.selectedSuggestionIndex ? "true" : "false"
            }
          });
        (s.createSpan({ cls: "obsidian-pi-suggest-label", text: n.label }),
          s.createSpan({ cls: "obsidian-pi-suggest-detail", text: n.detail }),
          s.addEventListener("mousedown", (a) => {
            (a.preventDefault(), this.apply(t));
          }));
      }
    }
  }
  apply(i) {
    if (!this.activeSuggestRange) return;
    let e = this.suggestions[i];
    if (!e) return;
    let t = this.inputEl.value;
    this.inputEl.value =
      t.slice(0, this.activeSuggestRange.start) +
      e.insertText +
      t.slice(this.activeSuggestRange.end);
    let n = this.activeSuggestRange.start + e.insertText.length;
    (this.inputEl.setSelectionRange(n, n), this.close(), this.onApply(), this.inputEl.focus());
  }
};
var re = require("obsidian"),
  se = class {
    constructor(i, e) {
      this.plugin = i;
      this.callbacks = e;
    }
    showThreadMenu(i) {
      let e = new re.Menu(),
        t = this.plugin.messages.length > 0,
        n = this.plugin.getCurrentThread(),
        s = this.plugin.listThreads({ includeArchived: !0 }).filter((a) => a.archived);
      (e.addItem((a) =>
        a
          .setTitle("New chat")
          .setIcon("plus")
          .onClick(() => this.startNewArchivedChat())
      ),
        e.addItem((a) =>
          a
            .setTitle("Save transcript as note...")
            .setIcon("file-output")
            .setDisabled(!t)
            .onClick(() => {
              this.callbacks.archiveCurrentChat();
            })
        ),
        e.addItem((a) =>
          a
            .setTitle("Copy transcript")
            .setIcon("copy")
            .setDisabled(!t)
            .onClick(() => {
              this.callbacks.copyTranscript();
            })
        ),
        e.addSeparator(),
        s.length === 0 &&
          e.addItem((a) => a.setTitle("No archived chats").setIcon("archive").setDisabled(!0)));
      for (let a of s.slice(0, 16))
        e.addItem((o) =>
          o
            .setTitle(a.title)
            .setIcon(a.id === n.id ? "check" : "archive")
            .onClick(() => {
              (this.plugin.switchThread(a.id),
                this.callbacks.renderThreadTitle(),
                this.callbacks.renderMessages());
            })
        );
      (e.addSeparator(),
        e.addItem((a) =>
          a
            .setTitle("Clear archived chats")
            .setIcon("trash-2")
            .setDisabled(s.length === 0)
            .onClick(() => {
              if (
                !window.confirm(
                  `Delete ${s.length} archived chat${s.length === 1 ? "" : "s"} from plugin history?`
                )
              )
                return;
              let l = this.plugin.clearArchivedThreads();
              (new re.Notice(`Cleared ${l} archived chat${l === 1 ? "" : "s"}.`),
                this.callbacks.renderMessages());
            })
        ),
        e.addItem((a) =>
          a
            .setTitle("Archive and start new chat")
            .setIcon("archive")
            .setDisabled(!t)
            .onClick(() => {
              (this.plugin.archiveThread(n.id),
                this.plugin.startNewThread(),
                this.callbacks.renderThreadTitle(),
                this.callbacks.renderMessages());
            })
        ),
        e.showAtMouseEvent(i));
    }
    startNewArchivedChat() {
      let i = this.plugin.getCurrentThread();
      (this.plugin.messages.length > 0 && !i.archived && this.plugin.archiveThread(i.id),
        this.plugin.startNewThread(),
        this.callbacks.renderThreadTitle(),
        this.callbacks.renderMessages());
    }
  };
function Xe(r, i) {
  var o;
  let e = [],
    t = (l, d, h, u) => {
      u &&
        (e.some((g) => l < g.end && d > g.start) ||
          e.push({ start: l, end: d, text: h, target: u }));
    },
    n = (l, d, h, u) => {
      t(l, d, h, i.parseVaultLinkTarget(u));
    };
  for (let l of r.matchAll(/\[\[([^\]|#]+)(?:#[^\]|]+)?(?:\|([^\]]+))?\]\]/g))
    l.index !== void 0 && n(l.index, l.index + l[0].length, (o = l[2]) != null ? o : l[1], l[1]);
  for (let l of r.matchAll(/\[([^\]]+)\]\(([^)]+?\.md(?::\d+)?)(?:#[^)]+)?\)/g))
    l.index !== void 0 && n(l.index, l.index + l[0].length, l[1], l[2]);
  for (let l of r.matchAll(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g))
    l.index !== void 0 && t(l.index, l.index + l[0].length, l[1], { url: Ze(l[2]) });
  for (let l of r.matchAll(/https?:\/\/[^\s<>()]+/g)) {
    if (l.index === void 0) continue;
    let d = Ze(l[0]);
    t(l.index, l.index + d.length, d, { url: d });
  }
  for (let l of r.matchAll(/(?:\/?[A-Za-z0-9 _.-]+\/)+[A-Za-z0-9 _.-]+\.md(?::\d+)?/g))
    l.index !== void 0 && n(l.index, l.index + l[0].length, i.getLinkLabel(l[0]), l[0]);
  e.sort((l, d) => l.start - d.start);
  let s = [],
    a = 0;
  for (let l of e)
    (l.start > a && s.push({ text: r.slice(a, l.start) }),
      s.push({ text: l.text, target: l.target }),
      (a = l.end));
  return (a < r.length && s.push({ text: r.slice(a) }), s);
}
function Ze(r) {
  return r.replace(/[.,;:!?]+$/g, "");
}
var ae = class extends f.ItemView {
  constructor(e, t) {
    super(e);
    this.plugin = t;
    this.running = !1;
    this.canceling = !1;
    this.composerBarExpanded = !1;
    this.activityText = "Thinking";
    this.activityKind = "thinking";
    this.activityLog = [];
    this.streamingAssistantContent = "";
    this.stickToBottom = !0;
  }
  getViewType() {
    return T;
  }
  getDisplayText() {
    return Ce;
  }
  getIcon() {
    return I;
  }
  async onOpen() {
    let e = this.containerEl.children[1];
    (e.empty(),
      e.addClass("obsidian-pi-view"),
      (this.noteActions = new te(this.plugin, {
        parseVaultLinkTarget: (c) => this.parseVaultLinkTarget(c),
        formatVaultLinkTarget: (c) => this.formatVaultLinkTarget(c),
        openVaultLink: (c) => this.openVaultLink(c)
      })),
      (this.messageActions = new ee(this.plugin, {
        getInput: () => this.inputEl,
        runPrompt: (c) => {
          this.runPrompt(c);
        },
        openChangedFiles: (c) => this.openChangedFiles(c),
        insertIntoCurrentNote: (c) => {
          var p;
          return (p = this.noteActions) == null ? void 0 : p.insertIntoCurrentNote(c);
        },
        createNoteFromResponse: (c) => {
          var p, v;
          return (v = (p = this.noteActions) == null ? void 0 : p.createNoteFromResponse(c)) != null
            ? v
            : Promise.resolve();
        },
        openCitedNotes: (c) => {
          var p, v;
          return (v = (p = this.noteActions) == null ? void 0 : p.openCitedNotes(c)) != null
            ? v
            : Promise.resolve();
        },
        extractVaultLinks: (c) => {
          var p, v;
          return (v = (p = this.noteActions) == null ? void 0 : p.extractVaultLinks(c)) != null
            ? v
            : [];
        },
        getPreviousUserPrompt: (c) => {
          var p;
          return (p = this.noteActions) == null ? void 0 : p.getPreviousUserPrompt(c);
        }
      })),
      (this.threadMenu = new se(this.plugin, {
        renderThreadTitle: () => this.renderThreadTitle(),
        renderMessages: () => this.renderMessages(),
        archiveCurrentChat: () => {
          var c, p;
          return (p = (c = this.noteActions) == null ? void 0 : c.archiveCurrentChat()) != null
            ? p
            : Promise.resolve();
        },
        copyTranscript: () =>
          this.noteActions
            ? this.noteActions.copyText(this.noteActions.formatTranscript())
            : Promise.resolve()
      })));
    let t = e.createDiv({ cls: "obsidian-pi-header" }),
      n = t.createDiv({ cls: "obsidian-pi-brand" }),
      s = n.createSpan({
        cls: "obsidian-pi-brand-icon",
        attr: { title: "Obsidian Pi" }
      });
    (this.renderPiIcon(s),
      (this.threadTitleEl = n.createSpan({
        cls: "obsidian-pi-thread-title",
        attr: { role: "button", tabindex: "0", title: "Rename chat" }
      })),
      this.threadTitleEl.addEventListener("click", () => this.startThreadTitleRename()),
      this.threadTitleEl.addEventListener("keydown", (c) => {
        (c.key === "Enter" || c.key === " ") && (c.preventDefault(), this.startThreadTitleRename());
      }),
      this.renderThreadTitle());
    let a = t.createDiv({ cls: "obsidian-pi-header-actions" }),
      o = a.createEl("button", {
        cls: "clickable-icon obsidian-pi-header-action",
        attr: { "aria-label": "New chat", title: "New chat" }
      });
    ((0, f.setIcon)(o, "plus"),
      o.addEventListener("click", (c) => {
        var p;
        (c.preventDefault(), (p = this.threadMenu) == null || p.startNewArchivedChat());
      }));
    let l = a.createEl("button", {
      cls: "clickable-icon obsidian-pi-thread-menu",
      attr: {
        "aria-label": "Chat threads and archive",
        title: "Chat threads and archive"
      }
    });
    ((0, f.setIcon)(l, "archive"),
      l.addEventListener("click", (c) => {
        var p;
        (c.preventDefault(), (p = this.threadMenu) == null || p.showThreadMenu(c));
      }),
      this.registerDomEvent(document, "keydown", (c) => {
        c.key !== "Escape" || !this.running || (c.preventDefault(), this.cancelCurrentRun());
      }),
      (this.messagesEl = e.createDiv({ cls: "obsidian-pi-messages" })),
      this.messagesEl.addEventListener("scroll", () => {
        if (!this.messagesEl) return;
        let c =
          this.messagesEl.scrollHeight - this.messagesEl.scrollTop - this.messagesEl.clientHeight;
        this.stickToBottom = c < 40;
      }));
    let d = e.createDiv({ cls: "obsidian-pi-composer" });
    ((this.toolBadgesEl = d.createDiv({ cls: "obsidian-pi-tool-badges" })),
      this.renderToolBadges(),
      this.registerEvent(
        this.plugin.app.workspace.on("file-open", () => {
          this.renderToolBadges();
        })
      ),
      this.registerEvent(
        this.plugin.app.workspace.on("active-leaf-change", () => {
          this.renderToolBadges();
        })
      ),
      (this.inputEl = d.createEl("textarea", {
        placeholder: "Ask Pi about your vault... Enter sends, Shift+Enter adds a line."
      })),
      this.inputEl.addEventListener("keydown", (c) => {
        var p;
        ((p = this.suggestions) != null && p.handleKeydown(c)) ||
          (c.key === "Enter" &&
            !c.shiftKey &&
            !c.isComposing &&
            (c.preventDefault(), this.submitInput()),
          c.key === "Escape" && this.running && (c.preventDefault(), this.cancelCurrentRun()));
      }),
      this.inputEl.addEventListener("input", () => {
        var c;
        (this.resizeInput(), (c = this.suggestions) == null || c.update());
      }),
      this.inputEl.addEventListener("click", () => {
        var c;
        return (c = this.suggestions) == null ? void 0 : c.update();
      }),
      this.inputEl.addEventListener("blur", () => {
        window.setTimeout(() => {
          var c;
          return (c = this.suggestions) == null ? void 0 : c.close();
        }, 120);
      }),
      (this.suggestions = new ne(this.inputEl, this.plugin, () => this.resizeInput())),
      this.resizeInput());
    let h = d.createDiv({ cls: "obsidian-pi-composer-bar" });
    ((this.composerBarEl = h),
      (this.runSettings = new ie(this.plugin)),
      this.runSettings.render(h));
    let m = h.createEl("button", {
      cls: "clickable-icon obsidian-pi-send-button",
      attr: { "aria-label": "Send message", title: "Send message" }
    });
    ((0, f.setIcon)(m, "send"),
      m.createSpan({ cls: "obsidian-pi-control-label", text: "Send" }),
      (this.sendButtonEl = m),
      m.addEventListener("click", () => this.handleSendButtonClick()),
      this.observeComposerBar(h),
      this.renderMessages());
  }
  async onClose() {
    var e;
    ((this.messagesEl = void 0),
      (this.inputEl = void 0),
      (this.sendButtonEl = void 0),
      (this.composerBarEl = void 0),
      (this.composerBarExpandEl = void 0),
      (this.runSettings = void 0),
      (this.toolBadgesEl = void 0),
      (this.threadTitleEl = void 0),
      (this.messageActions = void 0),
      (this.noteActions = void 0),
      (this.threadMenu = void 0),
      (e = this.suggestions) == null || e.close(),
      (this.suggestions = void 0));
  }
  renderToolBadges() {
    let e = this.toolBadgesEl;
    if (!e) return;
    e.empty();
    let t = this.plugin.getCurrentContextFile(),
      n = t
        ? { label: `Current: ${t.basename}`, enabled: !0, title: t.path }
        : {
            label: "No current note",
            enabled: !1,
            title: "Open a markdown note to attach it automatically"
          };
    e.createSpan({
      cls: `obsidian-pi-tool-badge${n.enabled ? " is-enabled" : ""}`,
      text: n.label,
      attr: { title: n.title }
    });
  }
  renderThreadTitle() {
    if (!this.threadTitleEl) return;
    let e = this.plugin.getCurrentThread();
    (this.threadTitleEl.empty(),
      this.threadTitleEl.createSpan({ text: e.title }),
      e.archived &&
        this.threadTitleEl.createSpan({
          cls: "obsidian-pi-thread-archived",
          text: "Archived"
        }));
  }
  startThreadTitleRename() {
    var a;
    if (!((a = this.threadTitleEl) != null && a.isConnected)) return;
    let e = this.plugin.getCurrentThread();
    (this.threadTitleEl.empty(), this.threadTitleEl.addClass("is-editing"));
    let t = this.threadTitleEl.createEl("input", {
        cls: "obsidian-pi-thread-title-input",
        attr: { type: "text", value: e.title, "aria-label": "Chat title" }
      }),
      n = (o) => {
        var d;
        let l = t.value.trim();
        ((d = this.threadTitleEl) == null || d.removeClass("is-editing"),
          o && l && l !== e.title && this.plugin.renameThread(e.id, l),
          this.renderThreadTitle());
      },
      s = (o) => {
        o.stopPropagation();
      };
    (t.addEventListener(
      "keydown",
      (o) => {
        (s(o), o.key === "Enter" && n(!0), o.key === "Escape" && n(!1));
      },
      { capture: !0 }
    ),
      t.addEventListener("keypress", s, { capture: !0 }),
      t.addEventListener("keyup", s, { capture: !0 }),
      t.addEventListener("click", (o) => o.stopPropagation()),
      t.addEventListener("blur", () => n(!0)),
      t.focus(),
      t.select());
  }
  submitInput() {
    var t, n;
    if (this.running) {
      this.cancelCurrentRun();
      return;
    }
    let e = (t = this.inputEl) == null ? void 0 : t.value.trim();
    e &&
      (this.inputEl && (this.inputEl.value = ""),
      (n = this.suggestions) == null || n.close(),
      this.resizeInput(),
      this.runPrompt(e));
  }
  handleSendButtonClick() {
    if (this.running) {
      this.cancelCurrentRun();
      return;
    }
    this.submitInput();
  }
  cancelCurrentRun() {
    this.canceling ||
      ((this.canceling = !0),
      this.setActivity("Canceling", "finishing"),
      this.plugin.cancelPiRun(),
      this.setRunningState(!0));
  }
  observeComposerBar(e) {
    let t = () => this.updateComposerBarMode(e.clientWidth);
    if ((t(), typeof ResizeObserver == "undefined")) {
      this.registerDomEvent(window, "resize", t);
      return;
    }
    let n = new ResizeObserver((s) => {
      var o, l;
      let a = (l = (o = s[0]) == null ? void 0 : o.contentRect.width) != null ? l : e.clientWidth;
      this.updateComposerBarMode(a);
    });
    (n.observe(e), this.register(() => n.disconnect()));
  }
  updateComposerBarMode(e) {
    let t = this.composerBarEl;
    if (!t) return;
    let n = e < 560,
      s = e < 390;
    (!n && this.composerBarExpanded && (this.composerBarExpanded = !1),
      t.toggleClass("is-compact", n),
      t.toggleClass("is-narrow", s),
      this.updateComposerBarExpansion());
  }
  updateComposerBarExpansion() {
    let e = this.composerBarEl,
      t = this.composerBarExpandEl;
    if (!e || !t) return;
    let n = this.composerBarExpanded && e.hasClass("is-compact");
    (e.toggleClass("is-expanded", n),
      t.setAttr("aria-label", n ? "Collapse run options" : "Expand run options"),
      t.setAttr("title", n ? "Collapse run options" : "Expand run options"),
      (0, f.setIcon)(t, n ? "chevrons-right" : "chevrons-left"));
  }
  resizeInput() {
    this.inputEl &&
      ((this.inputEl.style.height = "auto"),
      (this.inputEl.style.height = `${Math.min(this.inputEl.scrollHeight, 160)}px`));
  }
  async runPrompt(e) {
    if (this.running) {
      new f.Notice("Pi is already running.");
      return;
    }
    ((this.running = !0),
      (this.canceling = !1),
      (this.activityText = "Preparing context"),
      (this.activityKind = "context"),
      (this.activityLog = ["Preparing Obsidian context"]),
      (this.streamingAssistantContent = ""),
      (this.stickToBottom = !0),
      this.setRunningState(!0),
      this.plugin.addMessage({
        role: "user",
        content: e,
        createdAt: Date.now()
      }),
      this.renderThreadTitle(),
      this.renderMessages());
    try {
      let t = await this.plugin.runPiPrompt(e, {
        onEvent: (n) => this.handleRunEvent(n),
        onTextDelta: (n) => this.appendStreamingDelta(n)
      });
      ((this.streamingAssistantContent = ""),
        (this.streamingItemEl = void 0),
        (this.streamingTextEl = void 0),
        this.plugin.addMessage({
          role: "assistant",
          content: t.finalResponse,
          createdAt: Date.now(),
          changeSummaries: t.changes,
          changedFiles: t.changedFiles,
          changeStats: t.changeStats
        }),
        this.renderThreadTitle(),
        this.renderMessages());
    } catch (t) {
      let n = t instanceof Error ? t.message : String(t);
      if (n === "Pi run canceled.") {
        (new f.Notice("Pi run canceled."), this.renderMessages());
        return;
      }
      (this.plugin.addMessage({
        role: "assistant",
        content: `Pi run failed: ${n}`,
        createdAt: Date.now()
      }),
        this.renderThreadTitle(),
        this.renderMessages(),
        new f.Notice(n));
    } finally {
      ((this.running = !1),
        (this.canceling = !1),
        (this.streamingAssistantContent = ""),
        this.setRunningState(!1));
    }
  }
  renderMessages() {
    if (!this.messagesEl) return;
    this.messagesEl.empty();
    let e = this.plugin.messages;
    if (e.length === 0) {
      this.renderEmptyState();
      return;
    }
    for (let t = 0; t < e.length; t++) this.renderMessage(e[t], t);
    (this.running && this.streamingAssistantContent
      ? this.renderStreamingAssistantMessage()
      : this.running && this.activityText && this.renderActivityMessage(),
      this.stickToBottom && (this.messagesEl.scrollTop = this.messagesEl.scrollHeight));
  }
  renderEmptyState() {
    if (!this.messagesEl) return;
    let t = this.messagesEl
      .createDiv({ cls: "obsidian-pi-empty-state" })
      .createSpan({ cls: "obsidian-pi-empty-icon" });
    (0, f.setIcon)(t, "messages-square");
  }
  renderMessage(e, t) {
    if (!this.messagesEl) return;
    let n = this.messagesEl.createDiv({
      cls: `obsidian-pi-message obsidian-pi-message-${e.role}`
    });
    this.renderRoleLabel(n, e.role === "user" ? "user" : "pi", e, t);
    let s = n.createDiv({ cls: "obsidian-pi-message-content" });
    e.role === "assistant"
      ? this.renderMarkdownMessageContent(s, e.content)
      : this.renderPlainMessageContent(s, e.content);
  }
  async renderMarkdownMessageContent(e, t) {
    var n, s;
    e.addClass("obsidian-pi-message-content-markdown");
    try {
      (await f.MarkdownRenderer.render(
        this.app,
        t,
        e,
        (s = (n = this.plugin.getCurrentContextFile()) == null ? void 0 : n.path) != null ? s : "",
        this
      ),
        this.enhanceRenderedLinks(e),
        this.messagesEl &&
          this.stickToBottom &&
          (this.messagesEl.scrollTop = this.messagesEl.scrollHeight));
    } catch (a) {
      (console.warn("Obsidian Pi: markdown rendering failed", a),
        this.renderPlainMessageContent(e, t),
        this.messagesEl &&
          this.stickToBottom &&
          (this.messagesEl.scrollTop = this.messagesEl.scrollHeight));
    }
  }
  enhanceRenderedLinks(e) {
    for (let t of Array.from(e.querySelectorAll("a.internal-link")))
      t.addEventListener("click", (n) => {
        (n.preventDefault(), n.stopPropagation());
        let s = n,
          a = t.getAttribute("href") || t.getAttribute("data-href") || t.textContent || "";
        this.openVaultPath(a, s.metaKey || s.ctrlKey ? "tab" : !1);
      });
  }
  renderPlainMessageContent(e, t) {
    let n = document.createDocumentFragment();
    for (let s of Xe(t, {
      parseVaultLinkTarget: (a) => this.parseVaultLinkTarget(a),
      getLinkLabel: (a) => this.getLinkLabel(a)
    }))
      s.target
        ? n.appendChild(this.createChatLink(s.text, s.target))
        : n.appendChild(document.createTextNode(s.text));
    e.appendChild(n);
  }
  createChatLink(e, t) {
    let n = document.createElement("a");
    return (
      n.addClass("obsidian-pi-vault-link"),
      n.setText(e),
      this.isExternalLinkTarget(t)
        ? (n.setAttr("href", t.url), n.setAttr("title", t.url))
        : (n.setAttr("href", "#"), n.setAttr("title", this.formatVaultLinkTarget(t))),
      n.addEventListener("click", (s) => {
        if ((s.preventDefault(), s.stopPropagation(), this.isExternalLinkTarget(t))) {
          this.openExternalUrl(t.url);
          return;
        }
        let a = s.metaKey || s.ctrlKey ? "tab" : !1;
        this.openVaultLink(t, a);
      }),
      n.addEventListener("contextmenu", (s) => {
        if ((s.preventDefault(), s.stopPropagation(), this.isExternalLinkTarget(t))) {
          this.showExternalLinkMenu(s, t.url);
          return;
        }
        this.showVaultLinkMenu(s, t);
      }),
      n
    );
  }
  isExternalLinkTarget(e) {
    return "url" in e;
  }
  showExternalLinkMenu(e, t) {
    let n = new f.Menu();
    (n.addItem((s) =>
      s
        .setTitle("Open link")
        .setIcon("external-link")
        .onClick(() => this.openExternalUrl(t))
    ),
      n.addItem((s) =>
        s
          .setTitle("Copy link")
          .setIcon("copy")
          .onClick(() => {
            var a;
            (a = this.noteActions) == null ? void 0 : a.copyText(t);
          })
      ),
      n.showAtMouseEvent(e));
  }
  openExternalUrl(e) {
    var s, a, o;
    let t = window,
      n =
        (o =
          (a = (s = t.require) == null ? void 0 : s.call(t, "electron")) == null
            ? void 0
            : a.shell) == null
          ? void 0
          : o.openExternal;
    if (n) {
      n(e);
      return;
    }
    window.open(e, "_blank", "noopener");
  }
  showVaultLinkMenu(e, t) {
    let n = new f.Menu();
    (n.addItem((s) =>
      s
        .setTitle("Open")
        .setIcon("file")
        .onClick(() => {
          this.openVaultLink(t, !1);
        })
    ),
      n.addItem((s) =>
        s
          .setTitle("Open in new tab")
          .setIcon("lucide-panel-top-open")
          .onClick(() => {
            this.openVaultLink(t, "tab");
          })
      ),
      n.addItem((s) =>
        s
          .setTitle("Open in split")
          .setIcon("separator-vertical")
          .onClick(() => {
            this.openVaultLink(t, "split");
          })
      ),
      n.addItem((s) =>
        s
          .setTitle("Open in new window")
          .setIcon("picture-in-picture-2")
          .onClick(() => {
            this.openVaultLink(t, "window");
          })
      ),
      n.showAtMouseEvent(e));
  }
  async openVaultLink(e, t = !1) {
    var h, u, g;
    let n = typeof e == "string" ? this.parseVaultLinkTarget(e) : e;
    if (!n) {
      new f.Notice(`Note not found: ${String(e)}`);
      return;
    }
    let s = n.path,
      a = s.replace(/\.md$/i, ""),
      o = this.getLinkSourcePath(),
      l =
        (g =
          (u = (h = this.resolveDirectVaultFile(s)) != null ? h : this.resolveDirectVaultFile(a)) !=
          null
            ? u
            : this.plugin.app.metadataCache.getFirstLinkpathDest(a, o)) != null
          ? g
          : this.plugin.app.metadataCache.getFirstLinkpathDest(s, o);
    if (!l) {
      new f.Notice(`Note not found: ${this.formatVaultLinkTarget(n)}`);
      return;
    }
    let d = this.plugin.app.workspace.getLeaf(t);
    (await d.openFile(l, { active: !0 }), this.revealLine(d, n.line));
  }
  parseVaultLinkTarget(e) {
    let t = e
        .trim()
        .replace(/^obsidian:\/\//, "")
        .replace(/\|.*$/, "")
        .replace(/#.*$/, ""),
      n = t.match(/:(\d+)$/),
      s = n ? Number.parseInt(n[1], 10) : void 0,
      a = n ? t.slice(0, -n[0].length) : t,
      o = this.normalizeVaultPath(a);
    return o ? { path: o, line: s } : void 0;
  }
  normalizeVaultPath(e) {
    let t = e.replace(/\\/g, "/"),
      n = this.getVaultBasePath();
    return (n && t.startsWith(`${n}/`) ? t.slice(n.length + 1) : t)
      .replace(/^\/+/, "")
      .replace(/\.md$/i, ".md");
  }
  formatVaultLinkTarget(e) {
    return e.line ? `${e.path}:${e.line}` : e.path;
  }
  getLinkLabel(e) {
    var s, a;
    let t = this.parseVaultLinkTarget(e),
      n = (s = t == null ? void 0 : t.path) != null ? s : e;
    return (a = n.split("/").pop()) != null ? a : n;
  }
  getLinkSourcePath() {
    var e, t, n, s;
    return (s =
      (n = (e = this.plugin.getCurrentContextFile()) == null ? void 0 : e.path) != null
        ? n
        : (t = this.plugin.app.workspace.getActiveFile()) == null
          ? void 0
          : t.path) != null
      ? s
      : "";
  }
  getVaultBasePath() {
    var t, n;
    let e = this.plugin.app.vault.adapter;
    return (n = (t = e.getBasePath) == null ? void 0 : t.call(e)) == null
      ? void 0
      : n.replace(/\\/g, "/").replace(/\/+$/, "");
  }
  resolveDirectVaultFile(e) {
    let t = [e, e.endsWith(".md") ? e : `${e}.md`];
    for (let n of t) {
      let s = this.plugin.app.vault.getAbstractFileByPath(n);
      if (s instanceof f.TFile) return s;
    }
  }
  revealLine(e, t) {
    !t ||
      t < 1 ||
      window.setTimeout(() => {
        var o, l, d;
        let s = e.view.editor;
        if (!s) return;
        let a = { line: t - 1, ch: 0 };
        ((o = s.setCursor) == null || o.call(s, a),
          (l = s.scrollIntoView) == null || l.call(s, { from: a, to: a }, !0),
          (d = s.focus) == null || d.call(s));
      }, 50);
  }
  appendStreamingDelta(e) {
    if (e) {
      if (
        ((this.activityText = ""), (this.streamingAssistantContent += e), !this.streamingTextEl)
      ) {
        this.renderMessages();
        return;
      }
      (this.streamingTextEl.appendText(e),
        this.messagesEl &&
          this.stickToBottom &&
          (this.messagesEl.scrollTop = this.messagesEl.scrollHeight));
    }
  }
  setActivity(e, t, n) {
    ((this.activityText = e),
      (this.activityKind = t),
      this.addActivityLog(n != null ? n : e),
      this.renderMessages());
  }
  addActivityLog(e) {
    e &&
      this.activityLog[this.activityLog.length - 1] !== e &&
      (this.activityLog = [...this.activityLog, e].slice(-5));
  }
  handleRunEvent(e) {
    var t;
    if (e.type === "context_ready") {
      this.setActivity("Starting Pi", "context", "Preparing Obsidian context");
      return;
    }
    if (
      e.type === "pi_start" ||
      e.type === "agent_start" ||
      e.type === "turn_start" ||
      e.type === "message_start"
    ) {
      this.setActivity("Thinking", "thinking");
      return;
    }
    if (e.type !== "text_delta") {
      if (e.type === "tool_start" || e.type === "tool_update") {
        let n = (t = e.message) != null ? t : "tool";
        this.setActivity($t(n), Nt(n), Yt(n, e.raw));
        return;
      }
      if (e.type === "tool_end") {
        this.streamingAssistantContent || this.setActivity("Thinking", "thinking");
        return;
      }
      e.type === "agent_end" && ((this.activityText = ""), this.renderMessages());
    }
  }
  setRunningState(e) {
    var n;
    ((n = this.inputEl) == null || n.toggleAttribute("disabled", e),
      this.sendButtonEl &&
        (this.sendButtonEl.empty(),
        (0, f.setIcon)(this.sendButtonEl, e ? (this.canceling ? "loader" : "x") : "send"),
        this.sendButtonEl.createSpan({
          cls: "obsidian-pi-control-label",
          text: e ? (this.canceling ? "Canceling" : "Cancel") : "Send"
        }),
        this.sendButtonEl.toggleAttribute("disabled", e && this.canceling),
        this.sendButtonEl.setAttr("aria-label", e ? "Cancel Pi run" : "Send message"),
        this.sendButtonEl.setAttr("title", e ? "Cancel Pi run" : "Send message")),
      this.renderMessages());
  }
  renderStreamingAssistantMessage() {
    if (!this.messagesEl) return;
    let e = this.messagesEl.createDiv({
      cls: "obsidian-pi-message obsidian-pi-message-assistant obsidian-pi-message-streaming"
    });
    ((this.streamingItemEl = e), this.renderRoleLabel(e, "pi"));
    let t = e.createDiv({
      cls: "obsidian-pi-message-content obsidian-pi-message-content-streaming"
    });
    ((this.streamingTextEl = t.createSpan({
      cls: "obsidian-pi-streaming-text"
    })),
      this.streamingTextEl.setText(this.streamingAssistantContent),
      t.createSpan({ cls: "obsidian-pi-typing-cursor", text: "\u258C" }));
  }
  renderActivityMessage() {
    if (!this.messagesEl) return;
    let e = this.messagesEl.createDiv({
      cls: "obsidian-pi-message obsidian-pi-message-assistant obsidian-pi-message-activity"
    });
    (this.renderRoleLabel(e, "pi"), this.activityLog.length > 0 && this.renderActivityLog(e));
  }
  renderActivityLog(e) {
    let t = e.createDiv({ cls: "obsidian-pi-activity-log" });
    for (let n of this.activityLog.slice(-5).reverse())
      t.createDiv({ cls: "obsidian-pi-activity-log-item", text: n });
  }
  renderRoleLabel(e, t, n, s) {
    var d;
    let a = e.createDiv({ cls: "obsidian-pi-message-role" }),
      o = a.createSpan({ cls: "obsidian-pi-message-role-title" }),
      l = o.createSpan({
        cls: `obsidian-pi-role-icon obsidian-pi-role-icon-${t}`
      });
    if (t === "user") ((0, f.setIcon)(l, "user"), o.createSpan({ text: "You" }));
    else if (
      (this.renderPiIcon(l), o.createSpan({ text: "Pi" }), !n && this.running && this.activityText)
    ) {
      let h = o.createSpan({
        cls: `obsidian-pi-inline-activity obsidian-pi-activity-${this.activityKind}`
      });
      h.createSpan({
        cls: "obsidian-pi-inline-activity-text",
        text: this.activityText
      });
    }
    if (n && s !== void 0) {
      let h =
        n.role === "assistant"
          ? (d = this.messageActions) == null
            ? void 0
            : d.getMessageChangeStats(n)
          : void 0;
      if (h) {
        let g = a.createEl("button", {
          cls: "obsidian-pi-message-diff-stat",
          attr: { title: "Review changed files and diff lines" }
        });
        (h.filesChanged &&
          g.createSpan({
            cls: "obsidian-pi-diff-files",
            text: `${h.filesChanged} files`
          }),
          g.createSpan({
            cls: "obsidian-pi-diff-additions",
            text: `+${h.additions}`
          }),
          g.createSpan({
            cls: "obsidian-pi-diff-deletions",
            text: `-${h.deletions}`
          }),
          g.addEventListener("click", (m) => {
            (m.preventDefault(), m.stopPropagation(), new M(this.plugin, n).open());
          }));
      }
      let u = a.createEl("button", {
        cls: "clickable-icon obsidian-pi-message-actions",
        attr: { "aria-label": "Message actions" }
      });
      ((0, f.setIcon)(u, "ellipsis"),
        u.addEventListener("click", (g) => {
          var m;
          (g.preventDefault(),
            g.stopPropagation(),
            (m = this.messageActions) == null || m.showMessageMenu(g, n, s));
        }));
    }
  }
  renderPiIcon(e) {
    e.innerHTML = O;
  }
  async openChangedFiles(e) {
    if (e.length !== 0) for (let t of e.slice(0, 5)) await this.openVaultPath(t.path);
  }
  async openVaultPath(e, t = "tab") {
    let n = this.parseVaultLinkTarget(e);
    if (!n) {
      new f.Notice(`Note not found: ${e}`);
      return;
    }
    let s = n.path,
      a = this.plugin.app.vault.getAbstractFileByPath(s);
    if (a instanceof f.TFile) {
      let o = this.plugin.app.workspace.getLeaf(t);
      (await o.openFile(a, { active: !0 }), this.revealLine(o, n.line));
      return;
    }
    await this.openVaultLink(n, t);
  }
};
function Dt(r) {
  return r === "write"
    ? "pencil-line"
    : r === "shell"
      ? "terminal"
      : r === "search"
        ? "search"
        : "file-text";
}
function Nt(r) {
  return r === "bash"
    ? "shell"
    : r === "edit" || r === "write"
      ? "edit"
      : r === "grep" || r === "find" || r === "ls"
        ? "search"
        : r === "read"
          ? "read"
          : "thinking";
}
function $t(r) {
  return r === "bash"
    ? "Running command"
    : r === "edit" || r === "write"
      ? "Editing files"
      : r === "grep" || r === "find" || r === "ls"
        ? "Searching files"
        : r === "read"
          ? "Reading files"
          : "Using tool";
}
function Yt(r, i) {
  let e = $t(r),
    t = Kt(i, r);
  return t ? `${e}: ${t}` : e;
}
function Kt(r, i) {
  let e = qt(r, i);
  return e ? String(e).replace(/\s+/g, " ").trim().slice(0, 140) : "";
}
function qt(r, i) {
  let e = String(i || "").toLowerCase(),
    t =
      e === "bash"
        ? ["command", "cmd"]
        : e === "grep" || e === "find" || e === "ls"
          ? ["pattern", "query", "path", "glob", "directory", "dir"]
          : ["path", "filePath", "file", "target", "command", "cmd", "pattern", "query"],
    n = Zt(r, t);
  if (n) return n;
  if (r && typeof r === "object") {
    let s = JSON.stringify(r).match(
      /(?:\"path\"|\"filePath\"|\"file\"|\"command\"|\"cmd\"|\"pattern\"|\"query\")\s*:\s*\"([^\"]+)\"/
    );
    return s == null ? void 0 : s[1];
  }
}
function Zt(r, i, e = new Set()) {
  if (!r || typeof r !== "object" || e.has(r)) return;
  e.add(r);
  for (let t of i) if (typeof r[t] === "string") return r[t];
  for (let t of ["input", "args", "arguments", "parameters", "params", "toolInput", "data"])
    if (r[t]) {
      let n = Zt(r[t], i, e);
      if (n) return n;
    }
  for (let t of Object.values(r)) {
    let n = Zt(t, i, e);
    if (n) return n;
  }
}
function Bt(r) {
  return r === "context"
    ? "paperclip"
    : r === "answer"
      ? "message-square"
      : r === "shell"
        ? "terminal"
        : r === "edit"
          ? "pencil-line"
          : r === "search"
            ? "search"
            : r === "read"
              ? "file-text"
              : r === "done" || r === "finishing"
                ? "check-circle"
                : "brain";
}
function Ot(r) {
  if (
    !r.startsWith(`---
`)
  )
    return { frontmatter: {}, body: r, raw: "" };
  let i = r.indexOf(
    `
---`,
    4
  );
  if (i < 0) return { frontmatter: {}, body: r, raw: "" };
  let e = r.slice(4, i).trim(),
    t = r.slice(i + 4).replace(/^\n/, "");
  return { frontmatter: Vt(e), body: t, raw: e };
}
function tt(r, i) {
  let e = Ot(r);
  if (!e.raw)
    return `---
${_t(i)}
---
${r}`;
  let t = e.raw.split(/\r?\n/),
    n = Object.fromEntries(
      Object.entries(i)
        .filter(([, o]) => o !== void 0)
        .map(([o, l]) => [o, Ht(o, l).split(/\r?\n/)])
    ),
    s = [],
    a = 0;
  for (; a < t.length; ) {
    let o = t[a].match(/^([A-Za-z0-9_-]+):\s*/);
    if (o && n[o[1]]) {
      (s.push(...n[o[1]]), delete n[o[1]], a++);
      for (; a < t.length && !/^[A-Za-z0-9_-]+:\s*/.test(t[a]); a++);
      continue;
    }
    (s.push(t[a]), a++);
  }
  for (let o of Object.values(n)) s.push(...o);
  return `---
${s.join(`
`)}
---
${e.body}`;
}
function Vt(r) {
  let i = {},
    e = r.split(/\r?\n/),
    t = null;
  for (let n of e) {
    let s = n.trim();
    if (!s || s.startsWith("#")) continue;
    let a = n.match(/^\s+-\s+(.+)$/);
    if (a && t) {
      let d = i[t],
        h = Array.isArray(d) ? d : [];
      (h.push(Qe(a[1])), (i[t] = h));
      continue;
    }
    let o = n.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (!o) continue;
    t = o[1];
    let l = o[2];
    l === "" ? (i[t] = []) : (i[t] = Qe(l));
  }
  return i;
}
function _t(r) {
  return Object.entries(r)
    .filter(([, i]) => i !== void 0)
    .map(([i, e]) => Ht(i, e)).join(`
`);
}
function Ht(r, i) {
  return Array.isArray(i)
    ? i.length === 0
      ? `${r}: []`
      : `${r}:
${i.map((e) => `  - ${et(e)}`).join(`
`)}`
    : `${r}: ${et(i)}`;
}
function Qe(r) {
  let i = r.trim();
  return i === "true"
    ? !0
    : i === "false"
      ? !1
      : /^-?\d+(\.\d+)?$/.test(i)
        ? Number(i)
        : i.startsWith("[") && i.endsWith("]")
          ? i
              .slice(1, -1)
              .split(",")
              .map((e) => e.trim())
              .filter(Boolean)
              .map((e) => e.replace(/^["']|["']$/g, ""))
          : i.replace(/^["']|["']$/g, "");
}
function et(r) {
  return typeof r == "string" ? (/[:#\n\r]/.test(r) ? JSON.stringify(r) : r) : String(r);
}
var oe = class extends P.Plugin {
  constructor() {
    super(...arguments);
    this.settings = H;
    this.messages = [];
    this.threadHistory = new N();
    this.dataSaveChain = Promise.resolve();
  }
  async onload() {
    if ((await this.loadSettings(), !P.Platform.isDesktopApp)) {
      new P.Notice("Obsidian Pi is desktop-only.");
      return;
    }
    ((0, P.addIcon)(I, O),
      this.rebuildServices(),
      this.refreshCurrentContextFile(),
      this.registerEvent(
        this.app.workspace.on("file-open", (e) => {
          this.setCurrentContextFile(e);
        })
      ),
      this.registerEvent(
        this.app.workspace.on("active-leaf-change", () => {
          this.refreshCurrentContextFile();
        })
      ),
      this.refreshModelCatalog(!1),
      this.registerView(T, (e) => new ae(e, this)),
      this.addRibbonIcon(I, "Open Pi", () => {
        this.activateView();
      }),
      this.addCommand({
        id: "open-pi",
        name: "Open Pi chat",
        callback: () => {
          this.activateView();
        }
      }),
      this.addCommand({
        id: "ask-about-current-note",
        name: "Ask about current note",
        callback: () => {
          this.runCommandPrompt(
            "Use the active note as context. Summarize the key facts, assumptions, and useful follow-up questions."
          );
        }
      }),
      this.addCommand({
        id: "research-around-current-note",
        name: "Research around current note",
        callback: () => {
          this.runCommandPrompt(
            "Research around the active note using backlinks, outgoing links, unresolved links, tags, and search results. Return concise findings with vault references."
          );
        }
      }),
      this.addCommand({
        id: "suggest-frontmatter",
        name: "Suggest frontmatter for current note",
        callback: () => {
          this.suggestFrontmatterForCurrentNote();
        }
      }),
      this.addCommand({
        id: "draft-base-from-current-note",
        name: "Draft Base from current note context",
        callback: () => {
          this.runCommandPrompt(
            "Draft an Obsidian Base for notes related to the active note. Infer useful fields from frontmatter, tags, backlinks, and linked notes."
          );
        }
      }),
      this.addSettingTab(new V(this.app, this)));
  }
  onunload() {
    this.app.workspace.detachLeavesOfType(T);
  }
  async loadSettings() {
    let e = await this.loadData(),
      { chatHistory: t, messages: n, threadId: s, sessionId: a, ...o } = e != null ? e : {};
    ((this.settings = Object.assign({}, H, o)),
      (this.settings.additionalSkillFolders = normalizeSkillFolderList(
        this.settings.additionalSkillFolders
      )),
      (this.settings.includeDefaultSkills = this.settings.includeDefaultSkills !== !1),
      (this.settings.dryRun = !1),
      (this.settings.sandboxMode === "danger-full-access" ||
        this.settings.sandboxMode === "workspace-write") &&
        (this.settings.sandboxMode = "edit"),
      (this.threadHistory = new N(t, n, a != null ? a : s)));
    let l = rn(this.getVaultBasePath());
    ((this.settings.effectiveModel = l.effectiveModel || ""),
      (this.settings.effectiveReasoning = l.effectiveReasoning || ""),
      this.syncCurrentThreadState(),
      this.settings.model &&
        Wt(this.settings.model) &&
        ((this.settings.customModel = `openai/${this.settings.model}`),
        (this.settings.model = "__custom")));
  }
  async saveSettings() {
    (await this.savePluginData(), this.rebuildServices());
  }
  async refreshModelCatalog(e) {
    var t;
    this.catalog || this.rebuildServices();
    try {
      let n = await ((t = this.catalog) == null ? void 0 : t.getAvailableModels()),
        s = this.catalog ? this.catalog.getEffectiveConfig(this.getVaultBasePath()) : {};
      if (!n || n.length === 0) {
        e && new P.Notice("Pi returned no models.");
        return;
      }
      ((this.settings.availableModels = n),
        (this.settings.effectiveModel = s.effectiveModel || ""),
        (this.settings.effectiveReasoning = s.effectiveReasoning || ""),
        await this.saveSettings(),
        e &&
          new P.Notice(
            `Loaded ${n.length} Pi models${this.settings.effectiveModel ? `; default ${this.settings.effectiveModel}` : ""}.`
          ));
    } catch (n) {
      let s = n instanceof Error ? n.message : String(n);
      (e && new P.Notice(s), console.warn("Obsidian Pi: failed to refresh model catalog", n));
    }
  }
  addMessage(e) {
    (e.role === "user" &&
      this.threadHistory.getCurrentThread().archived &&
      this.threadHistory.unarchiveThread(this.threadHistory.currentThreadId),
      this.threadHistory.addMessage(e),
      this.syncCurrentThreadState(),
      this.saveThreadHistory());
  }
  startNewThread(e) {
    let t = this.threadHistory.startNewThread(e);
    return (this.syncCurrentThreadState(), this.saveThreadHistory(), t);
  }
  getCurrentThread() {
    return this.threadHistory.getCurrentThread();
  }
  listThreads(e) {
    return this.threadHistory.listThreads(e);
  }
  switchThread(e) {
    return this.threadHistory.switchThread(e)
      ? (this.syncCurrentThreadState(), this.saveThreadHistory(), !0)
      : !1;
  }
  archiveThread(e = this.threadHistory.currentThreadId) {
    return this.threadHistory.archiveThread(e)
      ? (this.syncCurrentThreadState(), this.saveThreadHistory(), !0)
      : !1;
  }
  unarchiveThread(e) {
    return this.threadHistory.unarchiveThread(e)
      ? (this.syncCurrentThreadState(), this.saveThreadHistory(), !0)
      : !1;
  }
  deleteThread(e) {
    return this.threadHistory.deleteThread(e)
      ? (this.syncCurrentThreadState(), this.saveThreadHistory(), !0)
      : !1;
  }
  clearArchivedThreads() {
    let e = this.threadHistory.clearArchivedThreads();
    return e === 0 ? 0 : (this.syncCurrentThreadState(), this.saveThreadHistory(), e);
  }
  renameThread(e, t) {
    return this.threadHistory.renameThread(e, t)
      ? (this.syncCurrentThreadState(), this.saveThreadHistory(), !0)
      : !1;
  }
  async activateView() {
    var n;
    let t = (n = this.app.workspace.getLeavesOfType(T)[0]) != null ? n : null;
    if (!t) {
      if (((t = this.app.workspace.getRightLeaf(!1)), !t)) {
        new P.Notice("Could not open Pi view.");
        return;
      }
      await t.setViewState({ type: T, active: !0 });
    }
    this.app.workspace.revealLeaf(t);
  }
  async runPiPrompt(e, t) {
    var g;
    if (
      ((!this.graph || !this.contextBuilder || !this.pi || !this.changeTracker) &&
        this.rebuildServices(),
      !this.graph || !this.contextBuilder || !this.pi || !this.changeTracker)
    )
      throw new Error("Pi services are not available.");
    let n = this.getEditorSelection(),
      s = await this.contextBuilder.build(e, n),
      a = this.threadHistory.getCurrentThread(),
      o = Ut(a.messages, e),
      l = this.shouldTrackPiChanges() ? await this.changeTracker.snapshot() : void 0;
    (g = t == null ? void 0 : t.onEvent) == null ||
      g.call(t, {
        type: "context_ready",
        raw: {
          searchResults: s.searchResults.length,
          linkedNeighborhood: s.linkedNeighborhood.length
        }
      });
    let d = await this.pi.run(e, s, a.piSessionId, o, t),
      h = l ? await this.changeTracker.diff(l) : void 0,
      u = h ? zt(d, h) : d;
    return (
      d.sessionId &&
        (this.threadHistory.setCurrentPiSessionId(d.sessionId),
        this.syncCurrentThreadState(),
        this.saveThreadHistory()),
      u
    );
  }
  shouldTrackPiChanges() {
    let e = this.settings.sandboxMode === "workspace-write" ? "edit" : this.settings.sandboxMode;
    return e === "edit" || e === "full-agent";
  }
  async inspectPiContext(e) {
    if (((!this.graph || !this.contextBuilder) && this.rebuildServices(), !this.contextBuilder))
      throw new Error("Pi context builder is not available.");
    return this.contextBuilder.inspectContext(e, this.getEditorSelection());
  }
  getCurrentContextFile() {
    return (this.refreshCurrentContextFile(), this.currentContextFile);
  }
  cancelPiRun() {
    var e;
    (e = this.pi) == null || e.cancelCurrentRun();
  }
  rebuildServices() {
    ((this.graph = new X(this.app, this.settings, () => this.getCurrentContextFile())),
      (this.contextBuilder = new J(this.graph, this.settings, be, this.getVaultBasePath())),
      (this.catalog = new q(this.getPluginDirectory())),
      (this.changeTracker = new Z(this.app, this.settings)),
      (this.pi = new K(
        this.settings,
        this.contextBuilder,
        this.getVaultBasePath(),
        this.getPluginDirectory()
      )));
  }
  syncCurrentThreadState() {
    this.messages = this.threadHistory.getCurrentMessages();
  }
  saveThreadHistory() {
    this.savePluginData().catch((e) => {
      console.warn("Obsidian Pi: failed to save thread history", e);
    });
  }
  savePluginData() {
    let e = {
      ...this.settings,
      availableModels: [],
      chatHistory: sanitizeThreadHistory(this.threadHistory.toJSON())
    };
    return (
      (this.dataSaveChain = this.dataSaveChain.catch(() => {}).then(() => this.saveData(e))),
      this.dataSaveChain
    );
  }
  refreshCurrentContextFile() {
    this.setCurrentContextFile(this.app.workspace.getActiveFile());
  }
  setCurrentContextFile(e) {
    this.currentContextFile = e && e.extension === "md" ? e : void 0;
  }
  async runCommandPrompt(e) {
    if (this.pi && this.pi.activeChild) {
      new P.Notice("Pi is already running.");
      return;
    }
    (await this.activateView(),
      this.addMessage({ role: "user", content: e, createdAt: Date.now() }));
    try {
      let t = await this.runPiPrompt(e);
      (this.addMessage({
        role: "assistant",
        content: t.finalResponse,
        createdAt: Date.now(),
        changeSummaries: t.changes,
        changedFiles: t.changedFiles,
        changeStats: t.changeStats
      }),
        new P.Notice("Pi response added to the chat view."));
    } catch (t) {
      let n = t instanceof Error ? t.message : String(t);
      new P.Notice(n);
    }
  }
  async suggestFrontmatterForCurrentNote() {
    var o;
    this.graph || this.rebuildServices();
    let e = (o = this.graph) == null ? void 0 : o.getActiveFile();
    if (!e) {
      new P.Notice("Open a markdown note first.");
      return;
    }
    let t = await this.app.vault.cachedRead(e),
      n = new Date().toISOString().slice(0, 10),
      s = tt(t, {
        type: "note",
        status: "draft",
        updated: n,
        tags: this.inferTags(e, t)
      }),
      a = {
        id: `${Date.now()}-${e.path}`,
        path: e.path,
        before: t,
        after: s,
        reason: "Add baseline Pi-suggested frontmatter"
      };
    new Q(this, a, () => {}).open();
  }
  inferTags(e, t) {
    var a, o, l;
    let n = new Set(),
      s = (a = e.parent) == null ? void 0 : a.path;
    s &&
      s !== "/" &&
      n.add(
        (l = (o = s.split("/").pop()) == null ? void 0 : o.toLowerCase().replace(/\s+/g, "-")) !=
          null
          ? l
          : ""
      );
    for (let d of t.matchAll(/#([A-Za-z0-9/_-]+)/g)) n.add(d[1]);
    return [...n].filter(Boolean).slice(0, 6);
  }
  getEditorSelection() {
    var n;
    let e = this.app.workspace.activeEditor,
      t = e == null ? void 0 : e.editor;
    return (n = t == null ? void 0 : t.getSelection()) != null ? n : "";
  }
  getVaultBasePath() {
    var t;
    let e = this.app.vault.adapter;
    return (t = e.getBasePath) == null ? void 0 : t.call(e);
  }
  getPluginDirectory() {
    var a;
    let e = this.getVaultBasePath();
    if (!e) return;
    let t = (a = this.manifest.dir) != null ? a : `plugins/${this.manifest.id}`,
      n = e.replace(/\/+$/, ""),
      s = t.replace(/^\/+/, "");
    return s.startsWith(".obsidian/")
      ? `${n}/${s}`
      : n.endsWith("/.obsidian")
        ? `${n}/${s}`
        : `${n}/.obsidian/${s}`;
  }
};
function sanitizeThreadHistory(r) {
  return {
    currentThreadId: r.currentThreadId,
    threads: [...(r.threads || [])]
      .sort((i, e) => e.updatedAt - i.updatedAt)
      .slice(0, 40)
      .map((i) => ({
        ...i,
        messages: (i.messages || []).map((e) => {
          let { changeSummaries: t, changedFiles: n, changeStats: s, ...a } = e;
          return a;
        })
      }))
  };
}
function Wt(r) {
  return !r.includes("/") && r !== "__custom";
}
function zt(r, i) {
  var n, s;
  let e = [...((n = r.changes) != null ? n : []), i],
    t = jt([...((s = r.changedFiles) != null ? s : []), ...i.files]);
  return {
    ...r,
    changes: e,
    changedFiles: t,
    changeStats: {
      filesChanged: t.length,
      additions: t.reduce((a, o) => a + o.additions, 0),
      deletions: t.reduce((a, o) => a + o.deletions, 0)
    }
  };
}
function Ut(r, i) {
  let e = r[r.length - 1];
  return (e == null ? void 0 : e.role) === "user" && e.content === i ? r.slice(0, -1) : r;
}
function jt(r) {
  let i = new Map();
  for (let e of r) {
    let t = i.get(e.path);
    if (!t) {
      i.set(e.path, { ...e });
      continue;
    }
    ((t.additions = Math.max(t.additions, e.additions)),
      (t.deletions = Math.max(t.deletions, e.deletions)),
      t.status === "unknown" && (t.status = e.status),
      e.previousPath && (t.previousPath = e.previousPath));
  }
  return [...i.values()];
}
