export function parsePromptReferences(prompt) {
  const references = [];

  const addAttachment = (rawValue) => {
    const value = rawValue
      .trim()
      .replace(/^\[\[|\]\]$/g, "")
      .replace(/\|.*$/, "");

    if (!value) return;

    references.push(
      value.endsWith("/")
        ? { type: "folder", value: value.replace(/\/+$/, "") }
        : { type: "note", value }
    );
  };

  for (const match of prompt.matchAll(/(?:^|\s)@\[\[([^\]]+)\]\]/g)) addAttachment(match[1]);
  for (const match of prompt.matchAll(/(?:^|\s)@"([^"]+)"/g)) addAttachment(match[1]);
  for (const match of prompt.matchAll(/(?:^|\s)@'([^']+)'/g)) addAttachment(match[1]);
  for (const match of prompt.matchAll(/(?:^|\s)@([^\s"'[]+)/g)) addAttachment(match[1]);

  for (const match of prompt.matchAll(/(?:^|\s)#([A-Za-z0-9/_-]+)/g)) {
    references.push({ type: "tag", value: `#${match[1]}` });
  }

  for (const line of prompt.split(/\r?\n/)) {
    const skillCommand = line.match(/^\/skill:([a-z0-9-]+)(?:\s+(.+))?$/i);
    if (skillCommand) {
      references.push({
        type: "skill",
        value: skillCommand[1].toLowerCase(),
        argument: skillCommand[2]?.trim() ?? ""
      });
    }

    const contextCommand = line.match(/^\/([A-Za-z0-9_-]+)(?:\s+(.+))?$/);
    if (contextCommand) {
      references.push({
        type: "command",
        value: contextCommand[1],
        argument: contextCommand[2]?.trim() ?? ""
      });
    }
  }

  return { cleanPrompt: prompt, references: dedupeReferences(references) };
}

function dedupeReferences(references) {
  const seen = new Set();

  return references.filter((reference) => {
    const key = JSON.stringify(reference);
    if (seen.has(key)) return false;

    seen.add(key);
    return true;
  });
}
