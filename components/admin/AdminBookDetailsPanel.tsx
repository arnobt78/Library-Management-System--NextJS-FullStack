/**
 * Admin Book Details panel — User 360 Applicant DNA (light).
 * Catalog / Library DB / Borrow Stats / Status from shared view-model.
 * Live via useBook + useBookBorrowStats; SSR seed from borrow-request detail.
 * Parent: Book Details DNA densify
 */

"use client";

import {
  BookOpen,
  Calendar,
  CircleDot,
  Hash,
  Languages,
  Layers,
  Library,
  Package,
} from "lucide-react";
import { AdminBookIdentityCell } from "@/components/admin/AdminBookIdentityCell";
import { AdminSurfacePanel } from "@/components/admin/AdminSurfacePanel";
import CopyableText from "@/components/ui/CopyableText";
import { TicketSectionHeader } from "@/components/support-tickets/TicketSectionHeader";
import { useBook, useBookBorrowStats } from "@/hooks/useQueries";
import {
  buildBookDetailsViewModel,
  bookDetailsSourceFromBorrowRequest,
  type BookDetailsSource,
} from "@/lib/books/bookDetailsViewModel";
import type { BookBorrowStats } from "@/lib/services/books";
import type { BorrowRecordWithDetails } from "@/lib/services/borrows";
import { FIELD_LABEL_ROW } from "@/lib/ui/fieldLabelStyles";
import { cn } from "@/lib/utils";

const AVAIL_TONE: Record<string, string> = {
  emerald: "text-emerald-700",
  amber: "text-amber-700",
  rose: "text-rose-700",
};

function FieldRow({
  label,
  value,
  copyable,
  icon: Icon,
  valueClassName,
}: {
  label: string;
  value: string;
  copyable?: boolean;
  icon: typeof Hash;
  valueClassName?: string;
}) {
  return (
    <div className="space-y-1">
      <dt className={FIELD_LABEL_ROW}>
        <Icon className="size-3.5 shrink-0" aria-hidden />
        {label}
      </dt>
      <dd>
        {copyable && value !== "N/A" ? (
          <CopyableText
            value={value}
            label={label}
            className={cn("text-sm text-gray-900", valueClassName)}
          />
        ) : (
          <span className={cn("text-sm text-gray-700", valueClassName)}>
            {value}
          </span>
        )}
      </dd>
    </div>
  );
}

const CATALOG_ICONS: Record<string, typeof Hash> = {
  isbn: Hash,
  published: Calendar,
  publisher: Library,
  language: Languages,
  pages: BookOpen,
  edition: Layers,
  total: Package,
  available: Package,
};

export function AdminBookDetailsPanel({
  request,
  initialStats,
}: {
  request: BorrowRecordWithDetails;
  initialStats?: BookBorrowStats | null;
}) {
  const ssrSource = bookDetailsSourceFromBorrowRequest(request);
  const ssrBookSeed: Book = {
    id: request.bookId,
    title: ssrSource.title ?? request.bookTitle,
    author: ssrSource.author ?? request.bookAuthor,
    genre: ssrSource.genre ?? request.bookGenre,
    rating: ssrSource.rating ?? 0,
    coverUrl: ssrSource.coverUrl ?? "",
    coverColor: ssrSource.coverColor ?? "#1e293b",
    description: "",
    summary: "",
    videoUrl: "",
    totalCopies: ssrSource.totalCopies ?? 0,
    availableCopies: ssrSource.availableCopies ?? 0,
    isbn: ssrSource.isbn ?? null,
    publicationYear: ssrSource.publicationYear ?? null,
    publisher: ssrSource.publisher ?? null,
    language: ssrSource.language ?? null,
    pageCount: ssrSource.pageCount ?? null,
    edition: ssrSource.edition ?? null,
    isActive: ssrSource.isActive ?? true,
    isFeatured: false,
    createdAt: ssrSource.createdAt ? new Date(ssrSource.createdAt) : null,
    updatedAt: ssrSource.updatedAt ? new Date(ssrSource.updatedAt) : null,
  };
  const { data: liveBook } = useBook(request.bookId, ssrBookSeed);
  const { data: stats } = useBookBorrowStats(
    request.bookId,
    initialStats ?? undefined,
  );

  const source: BookDetailsSource = liveBook
    ? {
        id: liveBook.id,
        title: liveBook.title,
        author: liveBook.author,
        genre: liveBook.genre,
        rating: liveBook.rating,
        coverUrl: liveBook.coverUrl,
        coverColor: liveBook.coverColor,
        isbn: liveBook.isbn,
        publicationYear: liveBook.publicationYear,
        publisher: liveBook.publisher,
        language: liveBook.language,
        pageCount: liveBook.pageCount,
        edition: liveBook.edition,
        totalCopies: liveBook.totalCopies,
        availableCopies: liveBook.availableCopies,
        isActive: liveBook.isActive,
        createdAt: liveBook.createdAt,
        updatedAt: liveBook.updatedAt,
      }
    : ssrSource;

  const vm = buildBookDetailsViewModel(source, stats ?? initialStats ?? null);

  return (
    <AdminSurfacePanel className="space-y-4">
      <TicketSectionHeader
        icon={<BookOpen className="size-4" />}
        title="Book Details"
        subtitle="Catalog, inventory, and borrow health"
      />

      {/* Applicant DNA: fields left | cover + status/meta right */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-[1fr_minmax(10rem,12rem)]">
        <dl className="space-y-3 text-sm">
          {vm.catalog.map((field) => (
            <FieldRow
              key={field.key}
              label={field.label}
              value={field.value}
              copyable={field.copyable}
              icon={CATALOG_ICONS[field.key] ?? Hash}
            />
          ))}
        </dl>

        <div className="space-y-3">
          <AdminBookIdentityCell
            bookId={request.bookId}
            title={vm.identity.title}
            author={vm.identity.author}
            coverUrl={vm.identity.coverUrl}
            coverColor={vm.identity.coverColor}
            genre={vm.identity.genre}
            rating={vm.identity.rating}
            className="items-start gap-2"
          />

          <div className="space-y-1">
            <p className={FIELD_LABEL_ROW}>
              <CircleDot className="size-3.5 shrink-0" aria-hidden />
              Status
            </p>
            <p
              className={cn(
                "text-sm font-medium",
                vm.status.isActive ? "text-emerald-700" : "text-rose-700",
              )}
            >
              {vm.status.label}
            </p>
          </div>

          <div>
            <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-gray-500">
              Library Database
            </p>
            <dl className="space-y-2">
              {vm.libraryDb.map((field) => (
                <FieldRow
                  key={field.key}
                  label={field.label}
                  value={field.value}
                  icon={Calendar}
                />
              ))}
            </dl>
          </div>

          <div>
            <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-gray-500">
              Borrow Statistics
            </p>
            <dl className="space-y-2">
              {vm.borrowStats.map((field) => (
                <FieldRow
                  key={field.key}
                  label={field.label}
                  value={field.value}
                  icon={Layers}
                  valueClassName={
                    field.key === "availability"
                      ? AVAIL_TONE[vm.availability.tone]
                      : undefined
                  }
                />
              ))}
            </dl>
          </div>

          {vm.inactiveWarning ? (
            <p className="text-sm font-medium text-rose-600">
              This book is currently unavailable
            </p>
          ) : null}
        </div>
      </div>
    </AdminSurfacePanel>
  );
}
