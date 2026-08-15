/**
 * Shared chrome for admin book create/edit — detail-style Back, AdminPageHeader,
 * Cancel + form= primary + Delete toolbar; form body in admin-panel.
 * Parent: REQ-0033 book form UI polish
 */
"use client";

import type { ReactNode } from "react";
import {
  ArrowLeft,
  BookMarked,
  BookPlus,
  Pencil,
  Plus,
  X,
} from "lucide-react";
import PrefetchLink from "@/components/PrefetchLink";
import { AdminDetailIdChip } from "@/components/admin/AdminDetailIdChip";
import { AdminDetailToolbar } from "@/components/admin/AdminDetailToolbar";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { useBackWithRefresh } from "@/hooks/useBackWithRefresh";
import { LIGHT_GLASS_CTA } from "@/lib/ui/glassActionChrome";
import { cn } from "@/lib/utils";

/** Form id shared with BookForm so toolbar submit uses native form= attribute. */
export const BOOK_ADMIN_FORM_ID = "book-admin-form";

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
  const isCreate = mode === "create";

  return (
    <section className="w-full space-y-4 sm:space-y-6">
      <AdminDetailToolbar
        hasActions
        back={
          <button
            type="button"
            onClick={goBack}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-primary-admin"
          >
            <ArrowLeft className="size-4" aria-hidden />
            <span className="max-w-44 truncate sm:max-w-none">
              {isCreate ? "Back to Book Catalog" : "Back to Book Detail"}
            </span>
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
            <span className="text-xs text-gray-500 sm:text-sm">New book</span>
          )
        }
        actions={
          <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-end">
            <button
              type="button"
              onClick={goBack}
              className={cn(
                LIGHT_GLASS_CTA.host,
                "border-gray-200 bg-white text-dark-400 hover:bg-gray-50",
              )}
            >
              <X className="size-3.5" aria-hidden />
              Cancel
            </button>
            <button
              type="submit"
              form={BOOK_ADMIN_FORM_ID}
              className={cn(LIGHT_GLASS_CTA.host, LIGHT_GLASS_CTA.edit)}
            >
              {isCreate ? (
                <Plus className="size-3.5" aria-hidden />
              ) : (
                <Pencil className="size-3.5" aria-hidden />
              )}
              {isCreate ? "Add Book to Library" : "Update Book"}
            </button>
            {mode === "edit" ? deleteAction : null}
          </div>
        }
      />

      <AdminPageHeader
        icon={isCreate ? BookPlus : Pencil}
        title={isCreate ? "Create a New Book" : "Edit Book"}
        description={
          isCreate
            ? "Add catalog identity, media, and inventory for a new title."
            : "Update catalog fields. Changes densify across admin and public views."
        }
        actions={
          mode === "edit" && bookId ? (
            <PrefetchLink
              href={`/admin/books/${bookId}`}
              className="text-xs font-medium text-sky-700 hover:text-sky-600 sm:text-sm"
            >
              View catalog detail
            </PrefetchLink>
          ) : bookTitle ? (
            <span className="max-w-48 truncate text-xs text-gray-500 sm:max-w-none sm:text-sm">
              {bookTitle}
            </span>
          ) : undefined
        }
      />

      <div className="admin-panel w-full">{children}</div>
    </section>
  );
}
