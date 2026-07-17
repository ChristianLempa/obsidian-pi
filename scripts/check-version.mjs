import fs from "node:fs";

const manifest = JSON.parse(fs.readFileSync("manifest.json", "utf8"));
const pkg = JSON.parse(fs.readFileSync("package.json", "utf8"));
const versions = JSON.parse(fs.readFileSync("versions.json", "utf8"));
const isTagRef =
  process.env.GITHUB_REF_TYPE === "tag" || process.env.GITHUB_REF?.startsWith("refs/tags/");
const tag = isTagRef ? process.env.GITHUB_REF_NAME : undefined;

function fail(message) {
  console.error(`Version check failed: ${message}`);
  process.exit(1);
}

if (!manifest.version) fail("manifest.json has no version");
if (!/^\d+(?:\.\d+)*$/.test(manifest.version)) {
  fail(
    `manifest.json version (${manifest.version}) must contain only numbers and dots, for example 1.0.0`
  );
}
if (pkg.version !== manifest.version) {
  fail(`package.json version (${pkg.version}) does not match manifest.json (${manifest.version})`);
}

if (versions[manifest.version] !== manifest.minAppVersion) {
  fail(`versions.json must contain "${manifest.version}": "${manifest.minAppVersion}"`);
}

if (tag && tag !== manifest.version) {
  fail(`git tag (${tag}) does not match manifest.json version (${manifest.version})`);
}

console.log(`Version ${manifest.version} is valid.`);
