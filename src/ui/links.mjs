export function segmentMessageLinks(text, callbacks) {
  const links = [];
  const addLink = (start, end, label, target) => {
    if (!target) return;
    if (links.some((link) => start < link.end && end > link.start)) return;
    links.push({ start, end, text: label, target });
  };
  const addVaultLink = (start, end, label, target) => {
    addLink(start, end, label, callbacks.parseVaultLinkTarget(target));
  };

  for (const match of text.matchAll(/\[\[([^\]|#]+)(?:#[^\]|]+)?(?:\|([^\]]+))?\]\]/g)) {
    if (match.index !== undefined) {
      addVaultLink(match.index, match.index + match[0].length, match[2] ?? match[1], match[1]);
    }
  }

  for (const match of text.matchAll(/\[([^\]]+)\]\(([^)]+?\.md(?::\d+)?)(?:#[^)]+)?\)/g)) {
    if (match.index !== undefined)
      addVaultLink(match.index, match.index + match[0].length, match[1], match[2]);
  }

  for (const match of text.matchAll(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g)) {
    if (match.index !== undefined) {
      addLink(match.index, match.index + match[0].length, match[1], {
        url: stripTrailingUrlPunctuation(match[2])
      });
    }
  }

  for (const match of text.matchAll(/https?:\/\/[^\s<>()]+/g)) {
    if (match.index === undefined) continue;

    const url = stripTrailingUrlPunctuation(match[0]);
    addLink(match.index, match.index + url.length, url, { url });
  }

  for (const match of text.matchAll(
    /(^|\s)((?:\/?[A-Za-z0-9 _.-]+\/)+[A-Za-z0-9 _.-]+\.md(?::\d+)?)/g
  )) {
    if (match.index !== undefined) {
      const start = match.index + match[1].length;
      const target = match[2];
      addVaultLink(start, start + target.length, callbacks.getLinkLabel(target), target);
    }
  }

  links.sort((left, right) => left.start - right.start);

  const segments = [];
  let offset = 0;
  for (const link of links) {
    if (link.start > offset) segments.push({ text: text.slice(offset, link.start) });
    segments.push({ text: link.text, target: link.target });
    offset = link.end;
  }

  if (offset < text.length) segments.push({ text: text.slice(offset) });
  return segments;
}

export function stripTrailingUrlPunctuation(url) {
  return url.replace(/[.,;:!?]+$/g, "");
}
