import fs from "node:fs";
import { spawnSync } from "node:child_process";

const manifest = JSON.parse(fs.readFileSync("manifest.json", "utf8"));
const requiredFiles = ["main.js", "manifest.json", "styles.css"];
const missing = requiredFiles.filter((file) => !fs.existsSync(file));

if (missing.length > 0) {
  console.error(`Missing release files: ${missing.join(", ")}`);
  process.exit(1);
}

const zipName = `pi-agent-${manifest.version}.zip`;
if (fs.existsSync(zipName)) fs.rmSync(zipName);

const result = spawnSync("zip", ["-r", zipName, ...requiredFiles], {
  stdio: "inherit"
});

if (result.status !== 0) {
  console.error("Failed to create release zip. Make sure the zip command is available.");
  process.exit(result.status ?? 1);
}

console.log(`Created ${zipName}`);
