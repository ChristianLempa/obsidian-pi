import * as f from "obsidian";

export async function openVaultLink(e, t = !1) {
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

export function parseVaultLinkTarget(e) {
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

export function normalizeVaultPath(e) {
  let t = e.replace(/\\/g, "/"),
    n = this.getVaultBasePath();
  return (n && t.startsWith(`${n}/`) ? t.slice(n.length + 1) : t)
    .replace(/^\/+/, "")
    .replace(/\.md$/i, ".md");
}

export function formatVaultLinkTarget(e) {
  return e.line ? `${e.path}:${e.line}` : e.path;
}

export function getLinkLabel(e) {
  var s, a;
  let t = this.parseVaultLinkTarget(e),
    n = (s = t == null ? void 0 : t.path) != null ? s : e;
  return (a = n.split("/").pop()) != null ? a : n;
}

export function getLinkSourcePath() {
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

export function getVaultBasePath() {
  var t, n;
  let e = this.plugin.app.vault.adapter;
  return (n = (t = e.getBasePath) == null ? void 0 : t.call(e)) == null
    ? void 0
    : n.replace(/\\/g, "/").replace(/\/+$/, "");
}

export function resolveDirectVaultFile(e) {
  let t = [e, e.endsWith(".md") ? e : `${e}.md`];
  for (let n of t) {
    let s = this.plugin.app.vault.getAbstractFileByPath(n);
    if (s instanceof f.TFile) return s;
  }
}

export function revealLine(e, t) {
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

export async function openVaultPath(e, t = "tab") {
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
