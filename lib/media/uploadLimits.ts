/**
 * Shared ImageKit upload size caps (client toast/UI + server persist check).
 * Images (cover + university ID): 1MB. Videos (trailer): 20MB.
 * Parent: REQ-0026 / REQ-0033 free-tier storage hygiene
 */

export type MediaUploadKind = "image" | "video";

export const MEDIA_UPLOAD_LIMITS = {
  image: { maxBytes: 1 * 1024 * 1024, label: "1MB" },
  video: { maxBytes: 20 * 1024 * 1024, label: "20MB" },
} as const satisfies Record<
  MediaUploadKind,
  { maxBytes: number; label: string }
>;

export function mediaUploadMaxBytes(kind: MediaUploadKind): number {
  return MEDIA_UPLOAD_LIMITS[kind].maxBytes;
}

export function mediaUploadMaxLabel(kind: MediaUploadKind): string {
  return MEDIA_UPLOAD_LIMITS[kind].label;
}

/** Short empty-state hint, e.g. "Max 1MB". */
export function mediaUploadMaxHint(kind: MediaUploadKind): string {
  return `Max ${MEDIA_UPLOAD_LIMITS[kind].label}`;
}
