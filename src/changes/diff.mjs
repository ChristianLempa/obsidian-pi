export function splitLines(text) {
  return text.length === 0 ? [] : text.split(/\r?\n/);
}

export function diffLines(beforeLines, afterLines) {
  if (beforeLines.length * afterLines.length > 250_000) {
    return [
      ...beforeLines.map((text) => ({ kind: "delete", text })),
      ...afterLines.map((text) => ({ kind: "add", text }))
    ];
  }

  const table = createLcsTable(beforeLines, afterLines);
  const changes = [];
  let beforeIndex = beforeLines.length;
  let afterIndex = afterLines.length;

  while (beforeIndex > 0 || afterIndex > 0) {
    if (
      beforeIndex > 0 &&
      afterIndex > 0 &&
      beforeLines[beforeIndex - 1] === afterLines[afterIndex - 1]
    ) {
      changes.push({ kind: "same", text: beforeLines[beforeIndex - 1] });
      beforeIndex--;
      afterIndex--;
    } else if (
      afterIndex > 0 &&
      (beforeIndex === 0 ||
        table[beforeIndex][afterIndex - 1] >= table[beforeIndex - 1][afterIndex])
    ) {
      changes.push({ kind: "add", text: afterLines[afterIndex - 1] });
      afterIndex--;
    } else if (beforeIndex > 0) {
      changes.push({ kind: "delete", text: beforeLines[beforeIndex - 1] });
      beforeIndex--;
    }
  }

  return changes.reverse();
}

export function formatUnifiedDiff(path, changes) {
  return [
    `--- a/${path}`,
    `+++ b/${path}`,
    "@@",
    ...changes.map((change) =>
      change.kind === "add"
        ? `+${change.text}`
        : change.kind === "delete"
          ? `-${change.text}`
          : ` ${change.text}`
    )
  ].join("\n");
}

export function summarizeChangedFiles(files) {
  return {
    filesChanged: files.length,
    additions: files.reduce((sum, file) => sum + file.additions, 0),
    deletions: files.reduce((sum, file) => sum + file.deletions, 0)
  };
}

function createLcsTable(beforeLines, afterLines) {
  const table = Array.from({ length: beforeLines.length + 1 }, () =>
    Array.from({ length: afterLines.length + 1 }, () => 0)
  );

  for (let beforeIndex = 1; beforeIndex <= beforeLines.length; beforeIndex++) {
    for (let afterIndex = 1; afterIndex <= afterLines.length; afterIndex++) {
      table[beforeIndex][afterIndex] =
        beforeLines[beforeIndex - 1] === afterLines[afterIndex - 1]
          ? table[beforeIndex - 1][afterIndex - 1] + 1
          : Math.max(table[beforeIndex - 1][afterIndex], table[beforeIndex][afterIndex - 1]);
    }
  }

  return table;
}
