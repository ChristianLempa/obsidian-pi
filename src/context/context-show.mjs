export function isContextShowPrompt(prompt) {
  return /^(?:\/)?context\s+show\s*$/i.test(String(prompt || "").trim());
}

export function formatContextShowResponse(inspection) {
  return [
    "Current Obsidian context:",
    "",
    "```json",
    JSON.stringify(inspection ?? {}, null, 2),
    "```"
  ].join("\n");
}
