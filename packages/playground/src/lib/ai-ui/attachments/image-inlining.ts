/**
 * Which attached images are shown to the model, and which are only uploaded.
 *
 * Every attachment is uploaded to the workspace — that is not negotiable and
 * this module does not change it. What it decides is the *second* thing an
 * image gets to do: travel in the same user message as an image part, so a
 * vision-capable model can actually look at it instead of being handed a path
 * and a suggestion.
 */

/**
 * The raster formats every vision model accepts.
 *
 * SVG is deliberately absent. It is markup, not pixels: an `<svg>` is a
 * document that can carry scripts, external references and — the reason it
 * matters here — arbitrary text the model would read as instructions. It is
 * uploaded and named like any other document.
 *
 * `image/jpg` is not a registered type but plenty of tools emit it.
 */
const INLINE_IMAGE_TYPES = new Set(['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/gif']);

/**
 * The largest image the composer will put in the prompt.
 *
 * Base64 costs a third of the file again, so 3 MB of pixels arrive as ~4 MB of
 * message — under the 5 MB per-image ceiling the strictest of the major
 * provider APIs enforces, and far under the rest. It is also about the point
 * where the inlining stops being worth it: a photograph past this size is
 * downsampled by the provider before the model ever sees it, so the extra
 * megabytes buy tokens and latency and no additional detail. Screenshots and
 * ordinary phone photos land under it; a raw camera capture does not, and is
 * uploaded only.
 */
export const INLINE_IMAGE_BYTE_LIMIT = 3 * 1024 * 1024;

/** The bare type, without the `; charset=…` parameters a browser may attach. */
function normalizeContentType(contentType: string | undefined): string {
  return (contentType ?? '').split(';')[0]!.trim().toLowerCase();
}

export function isInlineImageType(contentType: string | undefined): boolean {
  return INLINE_IMAGE_TYPES.has(normalizeContentType(contentType));
}

/** True when this file both is a supported image and fits under the cap. */
export function canInlineImage(file: File | undefined | null): file is File {
  return !!file && isInlineImageType(file.type) && file.size > 0 && file.size <= INLINE_IMAGE_BYTE_LIMIT;
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const units = ['KB', 'MB', 'GB'];
  let value = bytes / 1024;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${value >= 10 || Number.isInteger(value) ? Math.round(value) : value.toFixed(1)} ${units[unit]}`;
}

/**
 * Why this image will not be shown to the model, phrased for the user, or
 * `undefined` when it will be — or when the file is not an image at all and
 * there is nothing surprising to explain.
 *
 * Silence here is the failure mode worth avoiding: an image that is uploaded
 * but not shown looks identical in the composer to one that is, and the user
 * only finds out when the model answers as though it never saw the picture.
 */
export function describeSkippedImageInlining(file: File): string | undefined {
  const type = normalizeContentType(file.type);
  if (!type.startsWith('image/')) return undefined;

  const tail = 'It was uploaded to the workspace instead — ask the agent to open it from the path in your message.';

  if (!INLINE_IMAGE_TYPES.has(type)) {
    return `${file.name} is ${type}, which is not shown to the model as an image. ${tail}`;
  }
  if (file.size > INLINE_IMAGE_BYTE_LIMIT) {
    return `${file.name} is ${formatFileSize(file.size)}, over the ${formatFileSize(
      INLINE_IMAGE_BYTE_LIMIT,
    )} limit for showing an image to the model. ${tail}`;
  }
  return undefined;
}

/**
 * The same fact, phrased for the model and appended to the upload notice.
 *
 * Without it the model has a path ending in `.png` and no reason to think it
 * was not already looking at the picture.
 */
export function skippedImageNoticeSuffix(file: File): string {
  return `\n(${file.name} is an image that was not shown to you directly; open it from that path if you need to see it.)`;
}
