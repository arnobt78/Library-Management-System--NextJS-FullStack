/**
 * Shared chrome for admin book create/edit — toolbar + full-width form panel.
 * Parent: admin books catalog polish
 */
"use client";

import type { ReactNode } from "react";
import { ArrowLeft, BookMarked } from "lucide-react";
import PrefetchLink from "@/components/PrefetchLink";
import { AdminDetailIdChip } from "@/components/admin/AdminDetailIdChip";
import { AdminDetailToolbar } from "@/components/admin/AdminDetailToolbar";
import { useBackWithRefresh } from "@/hooks/useBackWithRefresh";
import { LIGHT_GLASS_CTA } from "@/lib/ui/glassActionChrome";
import { cn } from "@/lib/utils";

export function AdminBookFormShell({
  mode,
  bookId,
  bookTitle,
  deleteAction,
  children,
}: {
  mode: "create" | "edit";
  bookId?: string;
  bookTitle?: string;
  deleteAction?: ReactNode;
  children: ReactNode;
}) {
  const backHref =
    mode === "edit" && bookId ? `/admin/books/${bookId}` : "/admin/books";
  const goBack = useBackWithRefresh("book.write", backHref);

  return (
    <section className="w-full space-y-4">
      <AdminDetailToolbar
        hasActions={mode === "edit" && Boolean(deleteAction)}
        back={
          <button
            type="button"
            onClick={goBack}
            className={cn(
              LIGHT_GLASS_CTA.host,
              "border-gray-200 bg-white text-dark-400 hover:bg-gray-50",
            )}
          >
            <ArrowLeft className="size-3.5" aria-hidden />
            {mode === "edit" ? "Back to Book Detail" : "Back to Book Catalog"}
          </button>
        }
        idChip={
          bookId ? (
            <AdminDetailIdChip
              label="Book ID"
              value={bookId}
              icon={BookMarked}
            />
          ) : (
            <span className="text-xs text-gray-500 sm:text-sm">
              {bookTitle ?? "New book"}
            </span>
          )
        }
        actions={mode === "edit" ? deleteAction : undefined}
      />

      <div className="admin-panel space-y-2">
        <h2 className="text-base font-medium text-dark-400 sm:text-lg">
          {mode === "create" ? "Create a New Book" : "Edit Book"}
        </h2>
        <p className="text-xs text-gray-500 sm:text-sm">
          {mode === "create"
            ? "Add catalog identity, media, and inventory for a new title."
            : "Update catalog fields. Changes densify across admin and public views."}
        </p>
        {mode === "edit" && bookId ? (
          <PrefetchLink
            href={`/admin/books/${bookId}`}
            className="text-xs font-medium text-sky-700 hover:text-sky-600 sm:text-sm"
          >
            View catalog detail
          </PrefetchLink>
        ) : null}
        <div className="pt-2">{children}</div>
      </div>
    </section>
  );
}
