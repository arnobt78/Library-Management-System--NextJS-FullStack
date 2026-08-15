/**
 * Best-effort ImageKit Media Library purge after successful DB mutations.
 *
 * Clears orphan CDN files when book cover/video or university-card URLs are
 * replaced or rows are deleted. Never throws to callers — mutation success
 * must not depend on ImageKit availability.
 *
 * Allowlisted folders only: books/covers, books/videos, ids.
 * Skips local seed paths (/images, /icons) and untrusted hosts.
 * Parent: REQ-0033 ImageKit free-tier storage hygiene
 *
 * Server actions should prefer scheduleImageKitPurge (after() wrapper).
 * CLI scripts await purgeImageKitMedia directly.
 */

import { or, eq, and, ne, sql } from "drizzle-orm";
import { db } from "@/database/drizzle";
import { books, users } from "@/database/schema";
import config from "@/lib/config";

/** Upload folders used by FileUpload (Auth + BookForm). */
export const IMAGEKIT_PURGE_PREFIXES = [
  "books/covers/",
  "books/videos/",
  "ids/",
] as const;

const IMAGEKIT_API = "https://api.imagekit.io/v1";
const PURGE_TIMEOUT_MS = 5_000;

export type ImageKitPurgeOptions = {
  /** Skip Postgres refcount (caller already verified). */
  skipRefcount?: boolean;
};

/**
 * Map a stored media string to an allowlisted ImageKit filePath (`/books/covers/...`),
 * or null when local / untrusted / outside allowlist.
 */
export function toAllowlistedFilePath(
  value: string | null | undefined,
  urlEndpoint = config.env.imagekit.urlEndpoint,
): string | null {
  const trimmed = value?.trim() ?? "";
  if (!trimmed) return null;

  // Seeded demo cards / static assets — never call ImageKit delete.
  if (trimmed.startsWith("/images/") || trimmed.startsWith("/icons/")) {
    return null;
  }

  let filePath: string;
  try {
    const trustedBase = new URL(urlEndpoint);
    const trustedPath = trustedBase.pathname.replace(/\/$/, "");

    if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
      const candidate = new URL(trimmed);
      const pathIsInsideTenant =
        candidate.pathname === trustedPath ||
        candidate.pathname.startsWith(`${trustedPath}/`);
      if (
        candidate.protocol !== "https:" ||
        candidate.origin !== trustedBase.origin ||
        !pathIsInsideTenant
      ) {
        return null;
      }
      filePath = candidate.pathname.slice(trustedPath.length);
      if (!filePath.startsWith("/")) filePath = `/${filePath}`;
      // Strip query/transform noise already excluded by pathname.
    } else {
      // Relative ImageKit path (legacy)
      filePath = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
    }
  } catch {
    return null;
  }

  const withoutLeading = filePath.replace(/^\//, "");
  const allowed = IMAGEKIT_PURGE_PREFIXES.some((prefix) =>
    withoutLeading.startsWith(prefix),
  );
  if (!allowed) return null;

  return filePath.startsWith("/") ? filePath : `/${filePath}`;
}

function basicAuthHeader(privateKey: string): string {
  const token = Buffer.from(`${privateKey}:`, "utf8").toString("base64");
  return `Basic ${token}`;
}

type ListedFile = { fileId?: string; filePath?: string; type?: string };

async function resolveFileIdByPath(
  filePath: string,
  privateKey: string,
): Promise<string | null> {
  const name = filePath.split("/").pop();
  if (!name) return null;

  const folder = filePath.slice(0, filePath.lastIndexOf("/") + 1) || "/";
  const params = new URLSearchParams({
    path: folder,
    searchQuery: `name="${name}"`,
    limit: "10",
    type: "file",
  });

  const response = await fetch(`${IMAGEKIT_API}/files?${params}`, {
    method: "GET",
    headers: {
      Accept: "application/json",
      Authorization: basicAuthHeader(privateKey),
    },
    cache: "no-store",
    signal: AbortSignal.timeout(PURGE_TIMEOUT_MS),
  });

  if (!response.ok) {
    throw new Error(`ImageKit list failed (${response.status})`);
  }

  const payload: unknown = await response.json();
  if (!Array.isArray(payload)) return null;

  const normalized = filePath.replace(/\/+/g, "/");
  const match = (payload as ListedFile[]).find((item) => {
    if (!item?.fileId || item.type === "folder") return false;
    const listed = (item.filePath ?? "").replace(/\/+/g, "/");
    return listed === normalized || listed === normalized.replace(/^\//, "");
  });

  return match?.fileId ?? null;
}

async function deleteFileById(
  fileId: string,
  privateKey: string,
): Promise<void> {
  const response = await fetch(
    `${IMAGEKIT_API}/files/${encodeURIComponent(fileId)}`,
    {
      method: "DELETE",
      headers: {
        Accept: "application/json",
        Authorization: basicAuthHeader(privateKey),
      },
      cache: "no-store",
      signal: AbortSignal.timeout(PURGE_TIMEOUT_MS),
    },
  );

  // 204 success; 404 already gone — both fine for orphan cleanup.
  if (!response.ok && response.status !== 404) {
    throw new Error(`ImageKit delete failed (${response.status})`);
  }
}

/**
 * Drop URLs still referenced by any book cover/video (shared-asset guard).
 */
export async function filterUnreferencedBookMedia(
  urls: string[],
): Promise<string[]> {
  if (urls.length === 0) return [];

  const survivors: string[] = [];
  for (const url of urls) {
    const [row] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(books)
      .where(or(eq(books.coverUrl, url), eq(books.videoUrl, url)));
    if (Number(row?.count ?? 0) === 0) {
      survivors.push(url);
    }
  }
  return survivors;
}

/**
 * Drop university-card URLs still held by another user.
 */
export async function filterUnreferencedUniversityCards(
  urls: string[],
  excludeUserId?: string,
): Promise<string[]> {
  if (urls.length === 0) return [];

  const survivors: string[] = [];
  for (const url of urls) {
    const where = excludeUserId
      ? and(eq(users.universityCard, url), ne(users.id, excludeUserId))
      : eq(users.universityCard, url);
    const [row] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(users)
      .where(where);
    if (Number(row?.count ?? 0) === 0) {
      survivors.push(url);
    }
  }
  return survivors;
}

async function purgeOneUrl(url: string, privateKey: string): Promise<void> {
  const filePath = toAllowlistedFilePath(url);
  if (!filePath) return;

  const fileId = await resolveFileIdByPath(filePath, privateKey);
  if (!fileId) {
    console.error(
      `[imagekitPurge] no fileId for path ${filePath} (already missing?)`,
    );
    return;
  }
  await deleteFileById(fileId, privateKey);
}

/**
 * Best-effort delete of ImageKit assets for the given stored URLs.
 * Dedupes, allowlists, optional DB refcount, never throws.
 */
export async function purgeImageKitMedia(
  urls: Array<string | null | undefined>,
  options: ImageKitPurgeOptions = {},
): Promise<void> {
  try {
    const privateKey = config.env.imagekit.privateKey;
    if (!privateKey) {
      console.error("[imagekitPurge] IMAGEKIT_PRIVATE_KEY missing — skip");
      return;
    }

    const unique = [
      ...new Set(
        urls
          .map((u) => u?.trim() ?? "")
          .filter((u) => u.length > 0 && toAllowlistedFilePath(u) !== null),
      ),
    ];
    if (unique.length === 0) return;

    let candidates = unique;
    if (!options.skipRefcount) {
      // Book folders vs ids/: each URL uses the matching table refcount.
      const bookSafe = new Set(await filterUnreferencedBookMedia(unique));
      const cardSafe = new Set(
        await filterUnreferencedUniversityCards(unique),
      );
      candidates = unique.filter((url) => {
        const path = toAllowlistedFilePath(url);
        if (!path) return false;
        const relative = path.replace(/^\//, "");
        if (relative.startsWith("ids/")) return cardSafe.has(url);
        return bookSafe.has(url);
      });
    }

    await Promise.all(
      candidates.map(async (url) => {
        try {
          await purgeOneUrl(url, privateKey);
        } catch (error) {
          console.error(
            "[imagekitPurge] failed for",
            url,
            error instanceof Error ? error.message : error,
          );
        }
      }),
    );
  } catch (error) {
    console.error(
      "[imagekitPurge] unexpected",
      error instanceof Error ? error.message : error,
    );
  }
}
