import { describe, expect, it } from "vitest";
import { segmentMessageLinks, stripTrailingUrlPunctuation } from "../src/ui/links.mjs";

const callbacks = {
  parseVaultLinkTarget: (target) => ({ path: target.endsWith(".md") ? target : `${target}.md` }),
  getLinkLabel: (target) => target.split("/").pop()
};

describe("message link helpers", () => {
  it("strips trailing URL punctuation", () => {
    expect(stripTrailingUrlPunctuation("https://example.com/test,")).toBe(
      "https://example.com/test"
    );
  });

  it("segments wikilinks, markdown vault links, external links, and vault paths", () => {
    const segments = segmentMessageLinks(
      "See [[Note|label]], [Doc](Folder/Doc.md), https://example.com/test. Path: Folder/Other.md",
      callbacks
    );

    expect(segments).toEqual([
      { text: "See " },
      { text: "label", target: { path: "Note.md" } },
      { text: ", " },
      { text: "Doc", target: { path: "Folder/Doc.md" } },
      { text: ", " },
      { text: "https://example.com/test", target: { url: "https://example.com/test" } },
      { text: ". Path: " },
      { text: "Other.md", target: { path: "Folder/Other.md" } }
    ]);
  });
});
