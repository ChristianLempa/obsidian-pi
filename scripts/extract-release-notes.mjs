import fs from "node:fs";

const manifest = JSON.parse(fs.readFileSync("manifest.json", "utf8"));
const changelog = fs.readFileSync("CHANGELOG.md", "utf8");
const outputPath = process.argv[2] ?? "release-notes.md";
const version = manifest.version;

const escapedVersion = version.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const headingPattern = new RegExp(`^##\\s+\\[?${escapedVersion}\\]?(?:\\s+-\\s+.*)?\\s*$`, "m");
const headingMatch = changelog.match(headingPattern);

if (!headingMatch || headingMatch.index === undefined) {
  console.error(`Could not find CHANGELOG.md section for version ${version}.`);
  process.exit(1);
}

const sectionStart = headingMatch.index;
const contentStart = sectionStart + headingMatch[0].length;
const nextHeadingMatch = changelog.slice(contentStart).match(/^##\s+/m);
const sectionEnd = nextHeadingMatch ? contentStart + nextHeadingMatch.index : changelog.length;
const notes = changelog.slice(contentStart, sectionEnd).trim();

if (!notes) {
  console.error(`CHANGELOG.md section for version ${version} is empty.`);
  process.exit(1);
}

fs.writeFileSync(outputPath, notes.endsWith("\n") ? notes : `${notes}\n`, "utf8");
console.log(`Wrote ${outputPath} for version ${version}.`);
