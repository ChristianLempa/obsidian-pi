import fs from "node:fs";
import { build } from "esbuild";
import prettier from "prettier";

const source = "src/main.js";
const target = "main.js";
const checkOnly = process.argv.includes("--check");

if (!fs.existsSync(source)) {
  throw new Error(`${source} is missing. Keep the release entry source under src/.`);
}

const result = await build({
  entryPoints: [source],
  bundle: true,
  platform: "node",
  format: "cjs",
  external: ["obsidian"],
  write: false,
  legalComments: "none",
  logLevel: "silent"
});

const bundled = result.outputFiles[0].text;
new Function(bundled);

const formatted = await prettier.format(bundled, {
  parser: "babel",
  printWidth: 100,
  semi: true,
  singleQuote: false,
  trailingComma: "none"
});

if (checkOnly) {
  const current = fs.existsSync(target) ? fs.readFileSync(target, "utf8") : "";
  if (current !== formatted) {
    console.error(`${target} is stale. Run npm run build and commit the generated output.`);
    process.exit(1);
  }
  console.log(`${target} is up to date.`);
} else {
  fs.writeFileSync(target, formatted);
  console.log(`Built ${target} from ${source}.`);
}
