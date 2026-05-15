import { TFile } from "obsidian";
import {
  createExcerpt,
  rankSearchResults,
  scoreSearchResult,
  tokenizeQuery
} from "../shared/text.mjs";

export class VaultGraph {
  constructor(app, settings, getCurrentContextFile) {
    this.app = app;
    this.settings = settings;
    this.getCurrentContextFile = getCurrentContextFile;
  }

  getMarkdownFiles() {
    return this.app.vault.getMarkdownFiles().filter((file) => this.isPathAllowed(file.path));
  }

  async searchNotes(query, options = {}) {
    const terms = tokenizeQuery(query);
    if (terms.length === 0) return [];

    const limit = options.limit ?? this.settings.maxSearchResults;
    const files = this.getMarkdownFiles()
      .filter((file) => !options.folder || file.path.startsWith(options.folder))
      .slice(0, this.settings.maxSearchFiles);
    const results = [];

    for (const file of files) {
      const content = await this.readFile(file, this.settings.maxFileChars);
      const score = scoreSearchResult(file.path, content, terms);
      const cache = this.app.metadataCache.getFileCache(file);

      results.push({
        path: file.path,
        title: file.basename,
        score,
        excerpt: createExcerpt(content, terms),
        tags: this.getTags(cache)
      });
    }

    return rankSearchResults(results, limit);
  }

  async getActiveNoteContext(selection = "") {
    const file = this.getActiveFile();
    if (!file) return undefined;

    const content = await this.readFile(file, this.settings.maxFileChars);
    return { ...(await this.getNoteContext(file)), content, selection };
  }

  async getNoteContext(fileOrPath) {
    const file =
      typeof fileOrPath === "string"
        ? this.app.vault.getAbstractFileByPath(fileOrPath)
        : fileOrPath;
    if (!(file instanceof TFile)) throw new Error(`Note not found: ${String(fileOrPath)}`);

    const cache = this.app.metadataCache.getFileCache(file);
    const content = await this.readFile(file, this.settings.maxFileChars);

    return {
      path: file.path,
      title: file.basename,
      frontmatter: cache?.frontmatter ?? {},
      tags: this.getTags(cache),
      aliases: this.getAliases(cache),
      headings: this.getHeadings(cache),
      backlinks: await this.getBacklinks(file.path),
      outgoingLinks: this.getOutgoingLinks(file.path),
      unresolvedLinks: this.getUnresolvedLinks(file.path),
      excerpt: createExcerpt(content, tokenizeQuery(file.basename), 320)
    };
  }

  async findReferences(query) {
    const titleMatches = this.getMarkdownFiles()
      .filter((file) => file.basename.toLowerCase().includes(query.toLowerCase()))
      .map((file) => ({
        path: file.path,
        title: file.basename,
        score: 20,
        excerpt: "Title match",
        tags: this.getTags(this.app.metadataCache.getFileCache(file))
      }));
    const searchMatches = await this.searchNotes(query, { limit: this.settings.maxSearchResults });

    return rankSearchResults([...titleMatches, ...searchMatches], this.settings.maxSearchResults);
  }

  async getFolderSummary(folderPath) {
    const normalizedFolderPath = folderPath.replace(/^\/+|\/+$/g, "");
    const files = this.getMarkdownFiles()
      .filter((file) => file.path.startsWith(`${normalizedFolderPath}/`))
      .slice(0, this.settings.maxSearchResults);
    const results = [];

    for (const file of files) {
      const content = await this.readFile(file, this.settings.maxFileChars);
      results.push({
        path: file.path,
        title: file.basename,
        score: 1,
        excerpt: createExcerpt(content, tokenizeQuery(file.basename), 260),
        tags: this.getTags(this.app.metadataCache.getFileCache(file))
      });
    }

    return results;
  }

  async getNotesByTag(tag) {
    const normalizedTag = tag.startsWith("#") ? tag : `#${tag}`;
    const results = [];

    for (const file of this.getMarkdownFiles()) {
      const cache = this.app.metadataCache.getFileCache(file);
      const tags = this.getTags(cache);
      if (!tags.includes(normalizedTag) && !tags.includes(normalizedTag.slice(1))) continue;

      const content = await this.readFile(file, this.settings.maxFileChars);
      results.push({
        path: file.path,
        title: file.basename,
        score: 1,
        excerpt: createExcerpt(content, tokenizeQuery(normalizedTag), 260),
        tags
      });
      if (results.length >= this.settings.maxSearchResults) break;
    }

    return results;
  }

  resolveNoteFile(notePath) {
    const normalizedPath = notePath.replace(/^\/+/, "").replace(/#.*$/, "");
    const candidates = [
      normalizedPath,
      normalizedPath.endsWith(".md") ? normalizedPath : `${normalizedPath}.md`,
      normalizedPath.replace(/\.md$/i, "")
    ];

    for (const candidate of candidates) {
      const directFile = this.app.vault.getAbstractFileByPath(candidate);
      if (directFile instanceof TFile && this.isPathAllowed(directFile.path)) return directFile;

      const linkedFile = this.app.metadataCache.getFirstLinkpathDest(
        candidate.replace(/\.md$/i, ""),
        ""
      );
      if (linkedFile && this.isPathAllowed(linkedFile.path)) return linkedFile;
    }

    return undefined;
  }

  async getBacklinks(filePath) {
    const backlinkEntries = Object.entries(this.app.metadataCache.resolvedLinks)
      .map(([path, links]) => ({ path, count: links[filePath] || 0 }))
      .filter(
        (backlink) =>
          backlink.path !== filePath && backlink.count > 0 && this.isPathAllowed(backlink.path)
      )
      .sort((left, right) => right.count - left.count || left.path.localeCompare(right.path))
      .slice(0, this.settings.maxSearchResults);
    const backlinks = [];

    for (const backlink of backlinkEntries) {
      const file = this.app.vault.getAbstractFileByPath(backlink.path);
      let excerpt = "";
      if (file instanceof TFile) {
        const content = await this.readFile(file, this.settings.maxFileChars);
        excerpt = createExcerpt(content, tokenizeQuery(filePath.replace(/\.md$/i, "")), 220);
      }

      backlinks.push({
        path: backlink.path,
        display: backlink.path.replace(/\.md$/i, ""),
        count: backlink.count,
        excerpt
      });
    }

    return backlinks;
  }

  getOutgoingLinks(filePath) {
    const links = this.app.metadataCache.resolvedLinks[filePath] ?? {};

    return Object.entries(links)
      .filter(([path]) => this.isPathAllowed(path))
      .map(([path, count]) => ({
        path,
        display: path.replace(/\.md$/i, ""),
        count
      }))
      .sort((left, right) => right.count - left.count || left.path.localeCompare(right.path));
  }

  getUnresolvedLinks(filePath) {
    const links = this.app.metadataCache.unresolvedLinks[filePath] ?? {};

    return Object.entries(links)
      .map(([path, count]) => ({ path, display: path, count }))
      .sort((left, right) => right.count - left.count || left.path.localeCompare(right.path));
  }

  async getLinkedNeighborhood(filePath, depth = 1) {
    const seen = new Set([filePath]);
    let frontier = [filePath];
    const notes = [];

    for (let index = 0; index < depth; index++) {
      const nextFrontier = new Set();

      for (const path of frontier) {
        const outgoingLinks = this.getOutgoingLinks(path);
        const backlinks = await this.getBacklinks(path);
        for (const link of [...outgoingLinks, ...backlinks]) {
          if (!seen.has(link.path) && link.path.endsWith(".md")) {
            seen.add(link.path);
            nextFrontier.add(link.path);
          }
        }
      }

      for (const path of nextFrontier) {
        try {
          notes.push(await this.getNoteContext(path));
        } catch {
          // Ignore stale metadata links.
        }
      }

      frontier = [...nextFrontier].slice(0, this.settings.maxSearchResults);
    }

    return notes.slice(0, this.settings.maxSearchResults);
  }

  getActiveFile() {
    const file = this.getCurrentContextFile?.() ?? this.app.workspace.getActiveFile();
    return file && file.extension === "md" && this.isPathAllowed(file.path) ? file : undefined;
  }

  async readVaultFile(filePath) {
    const file = this.app.vault.getAbstractFileByPath(filePath);
    if (!(file instanceof TFile)) throw new Error(`File not found: ${filePath}`);
    if (!this.isPathAllowed(file.path)) throw new Error(`Path is not allowed: ${filePath}`);

    return this.readFile(file, this.settings.maxFileChars);
  }

  async readFile(file, maxChars) {
    const content = await this.app.vault.cachedRead(file);
    return content.length > maxChars ? `${content.slice(0, maxChars)}\n...[truncated]` : content;
  }

  isPathAllowed(filePath) {
    const normalizedPath = filePath.replace(/\\/g, "/");

    return !this.settings.ignoredFolders.some((ignoredFolder) => {
      const normalizedIgnoredFolder = ignoredFolder.replace(/\/+$/, "");
      return (
        normalizedPath === normalizedIgnoredFolder ||
        normalizedPath.startsWith(`${normalizedIgnoredFolder}/`)
      );
    });
  }

  getTags(cache) {
    const tags = new Set();
    for (const tag of cache?.tags ?? []) tags.add(tag.tag);

    const frontmatterTags = cache?.frontmatter?.tags;
    if (Array.isArray(frontmatterTags)) {
      for (const tag of frontmatterTags) tags.add(String(tag));
    } else if (typeof frontmatterTags === "string") {
      tags.add(frontmatterTags);
    }

    return [...tags].sort();
  }

  getAliases(cache) {
    const aliases = cache?.frontmatter?.aliases;
    return Array.isArray(aliases)
      ? aliases.map(String)
      : typeof aliases === "string"
        ? [aliases]
        : [];
  }

  getHeadings(cache) {
    return (cache?.headings ?? [])
      .map((heading) => heading.heading)
      .filter(Boolean)
      .slice(0, 20);
  }
}
