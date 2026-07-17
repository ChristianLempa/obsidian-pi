import { describe, expect, it } from "vitest";
import {
  applyPromptEnricher,
  createQueuedPrompt,
  fileToPromptImage,
  MAX_PROMPT_IMAGE_BYTES,
  modelSupportsImages,
  normalizePromptImages,
  toRpcImages
} from "../src/ui/prompt-payload.mjs";

const image = {
  id: "image-1",
  fileName: "sample.png",
  mimeType: "image/png",
  data: "data:image/png;base64,cG5n",
  size: 3
};

describe("prompt image payloads", () => {
  it("normalizes supported images and converts them to Pi RPC image content", () => {
    expect(normalizePromptImages([image, { ...image, mimeType: "image/gif" }])).toHaveLength(1);
    expect(toRpcImages([image])).toEqual([{ type: "image", data: "cG5n", mimeType: "image/png" }]);
  });

  it("rejects unsupported and oversized persisted image payloads", () => {
    expect(
      normalizePromptImages([
        { ...image, size: MAX_PROMPT_IMAGE_BYTES + 1 },
        { ...image, id: "gif", mimeType: "image/gif" }
      ])
    ).toEqual([]);
  });

  it("rejects oversized selected, pasted, or dropped files before reading them", async () => {
    await expect(
      fileToPromptImage({
        name: "large.png",
        type: "image/png",
        size: MAX_PROMPT_IMAGE_BYTES + 1
      })
    ).rejects.toThrow("20 MB or smaller");
  });

  it("allows image-only queued prompts and rejects empty payloads", () => {
    expect(createQueuedPrompt({ images: [image], threadId: "thread" })).toMatchObject({
      prompt: "",
      threadId: "thread",
      state: "pending"
    });
    expect(createQueuedPrompt({ prompt: "  ", images: [] })).toBeUndefined();
  });

  it("applies optional delivery enrichment without coupling queue delivery to an annotator", async () => {
    const unchanged = { prompt: "hello", images: [] };
    await expect(applyPromptEnricher(unchanged, undefined, { mode: "prompt" })).resolves.toBe(
      unchanged
    );
    await expect(
      applyPromptEnricher(
        unchanged,
        async (delivery, context) => ({
          ...delivery,
          prompt: `${delivery.prompt} [${context.mode}]`
        }),
        { mode: "steer" }
      )
    ).resolves.toEqual({ prompt: "hello [steer]", images: [] });
  });

  it("uses full model metadata for image capability checks", () => {
    expect(modelSupportsImages({ supportsImages: true })).toBe(true);
    expect(modelSupportsImages({ supportsImages: false })).toBe(false);
  });
});
