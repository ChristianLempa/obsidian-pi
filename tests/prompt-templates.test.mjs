import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  discoverPromptTemplates,
  expandPromptTemplate,
  getPromptTemplateSlashCommands
} from "../src/context/prompt-templates.mjs";

function createVault() {
  const vault = fs.mkdtempSync(path.join(os.tmpdir(), "pi-prompts-"));
  fs.mkdirSync(path.join(vault, ".pi", "prompts"), { recursive: true });
  return vault;
}

describe("prompt templates", () => {
  it("discovers vault prompt templates for slash commands", () => {
    const vault = createVault();
    fs.writeFileSync(
      path.join(vault, ".pi", "prompts", "review.md"),
      `---\ndescription: Review changes\nargument-hint: "<target>"\n---\nReview $1`,
      "utf8"
    );

    expect(discoverPromptTemplates(vault)).toMatchObject([
      {
        name: "review",
        command: "/review",
        description: "Review changes",
        argumentHint: "<target>"
      }
    ]);
    expect(getPromptTemplateSlashCommands(vault)[0]).toMatchObject({
      command: "/review",
      label: "Prompt template"
    });
  });

  it("expands a vault prompt template before Pi receives the prompt", () => {
    const vault = createVault();
    fs.writeFileSync(
      path.join(vault, ".pi", "prompts", "component.md"),
      "---\ndescription: Create a component\n---\nCreate $1 with $ARGUMENTS and ${@:2}",
      "utf8"
    );

    expect(expandPromptTemplate('/component Button "click handler"\nUse TypeScript.', vault)).toBe(
      "Create Button with Button click handler and click handler\n\nUse TypeScript."
    );
  });

  it("leaves unknown slash commands unchanged", () => {
    expect(expandPromptTemplate("/missing test", createVault())).toBe("/missing test");
  });
});
