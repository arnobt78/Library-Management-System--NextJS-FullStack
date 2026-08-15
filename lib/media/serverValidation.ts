// Parent: REQ-0026
// Persistence boundaries independently verify trusted ImageKit metadata and file signatures.
// Size ceilings live in uploadLimits (shared with FileUpload UI/toasts).

import config from "@/lib/config";
import { MEDIA_UPLOAD_LIMITS } from "@/lib/media/uploadLimits";
import { matchesMediaSignature } from "@/lib/media/validation";

type MediaKind = "image" | "video";

const POLICY = {
  image: {
    maximumBytes: MEDIA_UPLOAD_LIMITS.image.maxBytes,
    mimeTypes: new Set(["image/jpeg", "image/png", "image/webp"]),
  },
  video: {
    maximumBytes: MEDIA_UPLOAD_LIMITS.video.maxBytes,
    mimeTypes: new Set(["video/mp4", "video/webm"]),
  },
} as const;

/** Range-fetch budget; cold ImageKit edges can exceed 5s (create toast flake). */
const MEDIA_ASSERT_TIMEOUT_MS = 10_000;

function parseTotalBytes(response: Response): number {
  const contentRange = response.headers.get("content-range");
  const rangeTotal = contentRange?.match(/\/(\d+)$/)?.[1];
  return Number(rangeTotal ?? response.headers.get("content-length"));
}

function isAbortError(error: unknown): boolean {
  return (
    (error instanceof Error && error.name === "AbortError") ||
    (typeof DOMException !== "undefined" &&
      error instanceof DOMException &&
      error.name === "AbortError")
  );
}

async function fetchPersistedMediaOnce(
  candidate: URL,
  kind: MediaKind,
): Promise<void> {
  const response = await fetch(candidate, {
    headers: {
      Range: "bytes=0-15",
      Accept: [...POLICY[kind].mimeTypes].join(","),
    },
    cache: "no-store",
    redirect: "error",
    signal: AbortSignal.timeout(MEDIA_ASSERT_TIMEOUT_MS),
  });
  if (!response.ok && response.status !== 206) {
    throw new Error("Media verification failed");
  }

  const mime = response.headers.get("content-type")?.split(";", 1)[0]?.trim() ?? "";
  const totalBytes = parseTotalBytes(response);
  const reader = response.body?.getReader();
  const firstChunk = reader ? await reader.read() : { value: undefined };
  await reader?.cancel();
  const signature = firstChunk.value?.slice(0, 16) ?? new Uint8Array();
  if (
    !POLICY[kind].mimeTypes.has(mime as never) ||
    !Number.isFinite(totalBytes) ||
    totalBytes <= 0 ||
    totalBytes > POLICY[kind].maximumBytes ||
    !matchesMediaSignature(mime, signature)
  ) {
    throw new Error("Media policy rejected the upload");
  }
}

export async function assertPersistedMediaUrl(
  value: string,
  kind: MediaKind,
): Promise<void> {
  const trustedBase = new URL(config.env.imagekit.urlEndpoint);
  const candidate = new URL(value);
  const trustedPath = trustedBase.pathname.replace(/\/$/, "");
  const pathIsInsideTenant =
    candidate.pathname === trustedPath ||
    candidate.pathname.startsWith(`${trustedPath}/`);
  if (
    candidate.protocol !== "https:" ||
    candidate.origin !== trustedBase.origin ||
    !pathIsInsideTenant
  ) {
    throw new Error("Untrusted media location");
  }

  try {
    await fetchPersistedMediaOnce(candidate, kind);
  } catch (error) {
    if (!isAbortError(error)) throw error;
    // One retry after timeout — transient ImageKit cold starts.
    try {
      await fetchPersistedMediaOnce(candidate, kind);
    } catch (retryError) {
      if (isAbortError(retryError)) {
        throw new Error("Media verification timed out");
      }
      throw retryError;
    }
  }
}
