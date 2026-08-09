/**
 * Client helper: fetch an admin export file, trigger browser download, return
 * metadata for Activity History densify.
 * Parent: CR-0003 / REQ-0034
 */

export type AdminExportKind =
  | "books"
  | "users"
  | "borrows"
  | "analytics"
  | "borrows-range";

export type AdminExportFormat = "csv" | "json";

const EXPORT_PATH: Record<AdminExportKind, string> = {
  books: "/api/admin/export/books",
  users: "/api/admin/export/users",
  borrows: "/api/admin/export/borrows",
  analytics: "/api/admin/export/analytics",
  "borrows-range": "/api/admin/export/borrows-range",
};

/** Activity-log shape for densify invent after a successful download. */
export function adminExportActivityMeta(kind: AdminExportKind): {
  entityType: "book" | "user" | "borrow";
  status: string;
} {
  switch (kind) {
    case "books":
      return { entityType: "book", status: "EXPORT_BOOKS" };
    case "users":
      return { entityType: "user", status: "EXPORT_USERS" };
    case "borrows":
      return { entityType: "borrow", status: "EXPORT_BORROWS" };
    case "analytics":
      return { entityType: "book", status: "EXPORT_ANALYTICS" };
    case "borrows-range":
      return { entityType: "borrow", status: "EXPORT_BORROWS_RANGE" };
  }
}

function filenameFromDisposition(
  header: string | null,
  fallback: string,
): string {
  if (!header) return fallback;
  const match = /filename="([^"]+)"/i.exec(header);
  return match?.[1] || fallback;
}

/**
 * POST FormData to the export route, save the blob, return filename.
 * Throws on non-OK / JSON error body.
 */
export async function downloadAdminExport(args: {
  kind: AdminExportKind;
  format: AdminExportFormat;
  startDate?: string;
  endDate?: string;
}): Promise<{ filename: string; format: AdminExportFormat }> {
  const form = new FormData();
  form.set("format", args.format);
  if (args.startDate) form.set("startDate", args.startDate);
  if (args.endDate) form.set("endDate", args.endDate);

  const response = await fetch(EXPORT_PATH[args.kind], {
    method: "POST",
    body: form,
  });

  const contentType = response.headers.get("Content-Type") ?? "";
  if (!response.ok) {
    let message = `Export failed (${response.status})`;
    if (contentType.includes("application/json")) {
      try {
        const err = (await response.json()) as { message?: string };
        if (err.message) message = err.message;
      } catch {
        // keep status message
      }
    }
    throw new Error(message);
  }

  const blob = await response.blob();
  const fallback = `${args.kind}_export.${args.format}`;
  const filename = filenameFromDisposition(
    response.headers.get("Content-Disposition"),
    fallback,
  );

  const url = URL.createObjectURL(blob);
  try {
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    anchor.rel = "noopener";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
  } finally {
    URL.revokeObjectURL(url);
  }

  return { filename, format: args.format };
}
