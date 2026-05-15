import { describe, expect, it } from "vitest";
import { normalizeList, normalizeVaultFolder } from "../src/shared/paths.mjs";

describe("path helpers", () => {
  it("normalizes vault folders", () => {
    expect(normalizeVaultFolder("//Pi\\Chats/", "Pi")).toBe("Pi/Chats");
    expect(normalizeVaultFolder("", "Pi")).toBe("Pi");
  });

  it("normalizes newline and comma separated lists", () => {
    expect(normalizeList(".pi/skills\n~/skills, ./more")).toEqual([
      ".pi/skills",
      "~/skills",
      "./more"
    ]);
  });
});
