import fs from "node:fs";
import path from "node:path";

const targetDir =
  process.argv[2] || process.env.PI_AGENT_DEV_DIR || process.env.OBSIDIAN_PI_DEV_DIR;
const files = ["main.js", "manifest.json", "styles.css"];

if (!targetDir) {
  console.error("Usage: npm run dev:install -- /path/to/vault/.obsidian/plugins/pi-agent");
  console.error("Or set PI_AGENT_DEV_DIR=/path/to/vault/.obsidian/plugins/pi-agent");
  console.error("The legacy OBSIDIAN_PI_DEV_DIR variable is still supported for local setups.");
  process.exit(1);
}

fs.mkdirSync(targetDir, { recursive: true });

for (const file of files) {
  fs.copyFileSync(file, path.join(targetDir, file));
  console.log(`Copied ${file} -> ${targetDir}`);
}

console.log("\nDev install complete. Reload Obsidian or disable/enable the Pi Agent plugin.");
