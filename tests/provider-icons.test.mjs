import { describe, expect, it } from "vitest";
import { normalizeProviderId, resolveProviderBrand } from "../src/ui/provider-icons.mjs";

describe("model provider branding", () => {
  it.each([
    ["openai-codex", "OpenAI", undefined],
    ["anthropic", "Anthropic", undefined],
    ["xai", "xAI", undefined],
    ["google-gemini", "Google Gemini", undefined],
    ["mistral", "Mistral AI", undefined],
    ["openrouter", "OpenRouter", undefined],
    ["deepseek", "DeepSeek", undefined],
    ["ollama", "Ollama", undefined],
    ["groq", "Groq", "GQ"]
  ])("recognizes %s as %s", (provider, name, mark) => {
    expect(resolveProviderBrand(provider)).toMatchObject({ name, ...(mark ? { mark } : {}) });
  });

  it("derives providers from model records and uses a neutral custom fallback", () => {
    expect(normalizeProviderId({ slug: "Anthropic/claude-sonnet" })).toBe("anthropic");
    expect(resolveProviderBrand("my_custom.provider")).toMatchObject({
      name: "my-custom-provider",
      provider: "my-custom-provider"
    });
  });
});
