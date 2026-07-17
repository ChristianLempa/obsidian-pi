import fs from "node:fs";
import { describe, expect, it } from "vitest";

const bundle = fs.readFileSync(new URL("../main.js", import.meta.url), "utf8");

const EXTERNAL_CODEMIRROR_PACKAGES = ["@codemirror/state", "@codemirror/view"];

describe("generated plugin bundle", () => {
  it("uses Obsidian's shared CodeMirror modules instead of bundled copies", () => {
    for (const packageName of EXTERNAL_CODEMIRROR_PACKAGES) {
      expect(bundle).toContain(`require("${packageName}")`);
    }

    expect(bundle).not.toContain("node_modules/@codemirror/");
    expect(bundle).not.toContain("Unrecognized extension value in extension set");
  });
});
