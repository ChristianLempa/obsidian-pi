export const SUPPORTED_IMAGE_MIME_TYPES = ["image/png", "image/jpeg", "image/webp"];
export const MAX_PROMPT_IMAGE_BYTES = 20 * 1024 * 1024;

export function createQueuedPrompt({ prompt = "", images = [], threadId, id, createdAt } = {}) {
  const normalizedPrompt = String(prompt).trim();
  const normalizedImages = normalizePromptImages(images);
  if (!normalizedPrompt && normalizedImages.length === 0) return undefined;
  return {
    id: id || createId(),
    prompt: normalizedPrompt,
    images: normalizedImages,
    threadId: String(threadId || ""),
    createdAt: Number.isFinite(createdAt) ? createdAt : Date.now(),
    state: "pending"
  };
}

export function normalizePromptImages(images) {
  if (!Array.isArray(images)) return [];
  return images
    .filter(
      (image) =>
        image &&
        SUPPORTED_IMAGE_MIME_TYPES.includes(image.mimeType) &&
        typeof image.data === "string" &&
        image.data.length > 0 &&
        (Number.isFinite(image.size)
          ? image.size <= MAX_PROMPT_IMAGE_BYTES
          : estimateBase64Bytes(stripDataUrlPrefix(image.data)) <= MAX_PROMPT_IMAGE_BYTES)
    )
    .map((image) => ({
      id: String(image.id || createId()),
      fileName: String(image.fileName || "image"),
      mimeType: image.mimeType,
      data: stripDataUrlPrefix(image.data),
      size: Number.isFinite(image.size) ? image.size : undefined
    }));
}

export function toRpcImages(images) {
  return normalizePromptImages(images).map(({ data, mimeType }) => ({
    type: "image",
    data,
    mimeType
  }));
}

export function imagePreviewUrl(image) {
  return `data:${image.mimeType};base64,${stripDataUrlPrefix(image.data)}`;
}

export async function fileToPromptImage(file) {
  if (!file || !SUPPORTED_IMAGE_MIME_TYPES.includes(file.type)) {
    throw new Error("Choose a PNG, JPEG, or WebP image.");
  }
  if (file.size > MAX_PROMPT_IMAGE_BYTES) {
    throw new Error("Images must be 20 MB or smaller.");
  }
  const dataUrl = await readFileAsDataUrl(file);
  return {
    id: createId(),
    fileName: file.name || "image",
    mimeType: file.type,
    data: stripDataUrlPrefix(dataUrl),
    size: file.size
  };
}

export function modelSupportsImages(model) {
  return model?.supportsImages === true;
}

export async function applyPromptEnricher(delivery, callback, context) {
  if (typeof callback !== "function") return delivery;
  const enriched = await callback(
    { prompt: delivery.prompt, images: delivery.images || [] },
    context
  );
  return {
    ...delivery,
    ...(enriched && typeof enriched === "object" ? enriched : {})
  };
}

function stripDataUrlPrefix(data) {
  const comma = data.indexOf(",");
  return data.startsWith("data:") && comma >= 0 ? data.slice(comma + 1) : data;
}

function estimateBase64Bytes(data) {
  const padding = data.endsWith("==") ? 2 : data.endsWith("=") ? 1 : 0;
  return Math.max(0, Math.floor((data.length * 3) / 4) - padding);
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new globalThis.FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(reader.error || new Error("Could not read image."));
    reader.readAsDataURL(file);
  });
}

function createId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}
