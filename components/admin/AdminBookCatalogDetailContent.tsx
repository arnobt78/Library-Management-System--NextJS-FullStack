/**
 * Admin Book Catalog detail — borrow/review DNA:
 * Toolbar → Book DNA → KPIs → Catalog | Media → Description/Summary → IDs & stamps.
 * Densify via book.write (books.detail + createdByActor/updatedByActor preserve).
 * Parent: admin book catalog detail polish
 */
"use client";

import {
  ArrowLeft,
  BookA,
  BookImage,
  BookMarked,
  BookOpen,
  Calendar,
  CircleDot,
  ClipboardList,
  FileText,
  Hash,
  Languages,
  Layers,
  Library,
  Package,
  Palette,
  Pencil,
  Star,
  Undo2,
  Video,
} from "lucide-react";
import PrefetchLink from "@/components/PrefetchLink";
import BookCover from "@/components/BookCover";
import PersonAttribution from "@/components/PersonAttribution";
import ReviewBookIdentity from "@/components/reviews/ReviewBookIdentity";
import { AdminDetailIdChip } from "@/components/admin/AdminDetailIdChip";
import { AdminDetailToolbar } from "@/components/admin/AdminDetailToolbar";
import { DetailKpiShell } from "@/components/admin/DetailKpiShell";
import DeleteBookDialog from "@/components/admin/DeleteBookDialog";
import { TicketDateMeta } from "@/components/support-tickets/TicketDateMeta";
import { TicketSectionHeader } from "@/components/support-tickets/TicketSectionHeader";
import CopyableText from "@/components/ui/CopyableText";
import { useBackWithRefresh } from "@/hooks/useBackWithRefresh";
import { useBook, useBookBorrowStats } from "@/hooks/useQueries";
import { getBookAvailabilityStatus } from "@/lib/books/bookDetailsViewModel";
import {
  CatalogActiveBadge,
  CatalogFeaturedBadge,
} from "@/lib/ui/catalogFlagBadges";
import { FIELD_LABEL_ROW, FIELD_LABEL_TEXT } from "@/lib/ui/fieldLabelStyles";
import { LIGHT_GLASS_CTA } from "@/lib/ui/glassActionChrome";
import { reviewRatingTone } from "@/lib/ui/reviewOptions";
import type { BookBorrowStats } from "@/lib/services/books";
import { cn } from "@/lib/utils";

const AVAIL_TONE: Record<"emerald" | "amber" | "rose", string> = {
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
  /** Semantic tone for numeric / status values (Catalog Context copies). */
  valueClassName?: string;
}) {
  return (
    <div className="space-y-1">
      <dt className={FIELD_LABEL_ROW}>
        <Icon className="size-3.5 shrink-0" aria-hidden />
        {label}
      </dt>
      <dd>
        {copyable && value !== "—" ? (
          <CopyableText
            value={value}
            label={label}
            className={cn("text-sm", valueClassName ?? "text-gray-900")}
          />
        ) : (
          <span className={cn("text-sm", valueClassName ?? "text-gray-700")}>
            {value}
          </span>
        )}
      </dd>
    </div>
  );
}

function displayOrDash(value: string | number | null | undefined): string {
  if (value == null || value === "") return "—";
  return String(value);
}

export default function AdminBookCatalogDetailContent({
  initialBook,
  initialBookStats,
}: {
  initialBook: Book;
  initialBookStats: BookBorrowStats;
}) {
  const goBack = useBackWithRefresh("book.write", "/admin/books");
  const { data: book = initialBook } = useBook(initialBook.id, initialBook);
  const { data: stats = initialBookStats } = useBookBorrowStats(
    initialBook.id,
    initialBookStats,
  );

  const availability = getBookAvailabilityStatus(
    book.availableCopies,
    book.totalCopies,
  );
  const hasTrailer = Boolean(book.videoUrl?.trim());
  const coverHex = book.coverColor?.trim() || "";

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
              Back to Book Catalog
            </span>
          </button>
        }
        idChip={
          <AdminDetailIdChip
            label="Book ID"
            value={book.id}
            icon={BookMarked}
          />
        }
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <PrefetchLink
              href={`/admin/books/${book.id}/edit`}
              className={cn(LIGHT_GLASS_CTA.host, LIGHT_GLASS_CTA.edit)}
            >
              <Pencil className="size-3.5" aria-hidden />
              Edit Book
            </PrefetchLink>
            <DeleteBookDialog
              bookId={book.id}
              bookTitle={book.title}
              redirectTo="/admin/books"
              triggerClassName={cn(
                LIGHT_GLASS_CTA.host,
                LIGHT_GLASS_CTA.delete,
              )}
            />
          </div>
        }
      />

      <div className="admin-panel w-full space-y-2">
        <ReviewBookIdentity
          variant="light"
          title={book.title}
          author={book.author}
          coverUrl={book.coverUrl}
          coverColor={book.coverColor}
          bookId={book.id}
          genre={book.genre}
          bookRating={book.rating}
          showMeta
          catalogRatingMode="number"
        />
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <CatalogActiveBadge isActive={book.isActive} />
          <CatalogFeaturedBadge isFeatured={book.isFeatured} />
          {coverHex ? (
            <span className="inline-flex min-w-0 flex-wrap items-center gap-1.5 text-gray-600">
              <Palette
                className="size-3.5 shrink-0 text-gray-500"
                aria-hidden
              />
              <span className="font-medium text-gray-500">
                Book Cover Color
              </span>
              <span
                className="inline-block size-3.5 shrink-0 rounded-full border border-gray-200"
                style={{ backgroundColor: coverHex }}
                aria-hidden
              />
              <CopyableText
                value={coverHex}
                label="Book Cover Color"
                className="font-mono text-xs text-gray-700"
              />
            </span>
          ) : null}
        </div>
      </div>

      {/* Inventory · Availability · Rating · Catalog Flags */}
      <div className="grid w-full grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <DetailKpiShell
          variant="light"
          icon={<Package className="size-4" />}
          label="Inventory"
          hint="Catalog stock levels"
        >
          <div className="space-y-1 leading-none">
            <p className="text-sm text-gray-600">
              Total Copies{" "}
              <span className="font-medium tabular-nums text-dark-200">
                {book.totalCopies}
              </span>
            </p>
            <p className="text-sm text-gray-600">
              Available Copies{" "}
              <span
                className={cn(
                  "font-medium tabular-nums",
                  AVAIL_TONE[availability.tone],
                )}
              >
                {book.availableCopies}
              </span>
            </p>
          </div>
        </DetailKpiShell>
        <DetailKpiShell
          variant="light"
          icon={<CircleDot className="size-4" />}
          label="Availability"
          hint="Stock health cue"
        >
          <p
            className={cn("text-lg font-medium", AVAIL_TONE[availability.tone])}
          >
            {availability.label}
          </p>
        </DetailKpiShell>
        <DetailKpiShell
          variant="light"
          icon={<Star className="size-4" />}
          label="Rating"
          hint="Catalog star rating"
        >
          <p
            className={cn(
              "text-lg font-medium tabular-nums",
              reviewRatingTone(book.rating),
            )}
          >
            {book.rating}/5
          </p>
        </DetailKpiShell>
        <DetailKpiShell
          variant="light"
          icon={<BookMarked className="size-4" />}
          label="Catalog Flags"
          hint="Active lending · homepage feature"
        >
          <div className="space-y-1 text-sm leading-none">
            <p
              className={cn(
                "font-medium",
                book.isActive ? "text-emerald-700" : "text-rose-700",
              )}
            >
              {book.isActive
                ? "Active for borrowing"
                : "Inactive for borrowing"}
            </p>
            <p
              className={cn(
                "font-medium",
                book.isFeatured ? "text-sky-700" : "text-slate-500",
              )}
            >
              {book.isFeatured ? "Featured on homepage" : "Not featured"}
            </p>
          </div>
        </DetailKpiShell>
      </div>

      <div className="grid w-full grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <DetailKpiShell
          variant="light"
          icon={<BookOpen className="size-4" />}
          label="Total Times Borrowed"
          hint="Lifetime borrow count"
        >
          <p className="text-lg font-medium tabular-nums text-dark-200">
            {stats.totalBorrows}
          </p>
        </DetailKpiShell>
        <DetailKpiShell
          variant="light"
          icon={<Layers className="size-4" />}
          label="Currently Borrowed"
          hint="Active loans for this title"
        >
          <p className="text-lg font-medium tabular-nums text-dark-200">
            {stats.activeBorrows}
          </p>
        </DetailKpiShell>
        <DetailKpiShell
          variant="light"
          icon={<Undo2 className="size-4" />}
          label="Successfully Returned"
          hint="Completed returns"
        >
          <p className="text-lg font-medium tabular-nums text-dark-200">
            {stats.returnedBorrows}
          </p>
        </DetailKpiShell>
        <DetailKpiShell
          variant="light"
          icon={<Video className="size-4" />}
          label="Trailer"
          hint="Book video media"
        >
          <p
            className={cn(
              "text-lg font-medium",
              hasTrailer ? "text-emerald-700" : "text-slate-500",
            )}
          >
            {hasTrailer ? "Uploaded" : "None"}
          </p>
        </DetailKpiShell>
      </div>

      <div className="grid w-full grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="admin-panel space-y-4">
          <TicketSectionHeader
            icon={<Library className="size-4" />}
            title="Catalog Context"
            subtitle="Identity, publishing metadata, and inventory"
            className="mb-0"
          />
          <dl className="grid gap-3 sm:grid-cols-2">
            <FieldRow
              label="Title"
              value={displayOrDash(book.title)}
              icon={BookOpen}
            />
            <FieldRow
              label="Author"
              value={displayOrDash(book.author)}
              icon={FileText}
            />
            <FieldRow
              label="Genre"
              value={displayOrDash(book.genre)}
              icon={Hash}
            />
            <FieldRow
              label="Rating"
              value={`${book.rating}/5`}
              icon={Star}
              valueClassName={cn(
                "font-medium tabular-nums",
                reviewRatingTone(book.rating),
              )}
            />
            <FieldRow
              label="ISBN"
              value={displayOrDash(book.isbn)}
              copyable={Boolean(book.isbn)}
              icon={Hash}
            />
            <FieldRow
              label="Publication Year"
              value={displayOrDash(book.publicationYear)}
              icon={Calendar}
            />
            <FieldRow
              label="Publisher"
              value={displayOrDash(book.publisher)}
              icon={Library}
            />
            <FieldRow
              label="Language"
              value={displayOrDash(book.language)}
              icon={Languages}
            />
            <FieldRow
              label="Pages"
              value={displayOrDash(book.pageCount)}
              icon={FileText}
            />
            <FieldRow
              label="Edition"
              value={displayOrDash(book.edition)}
              icon={Layers}
            />
            <FieldRow
              label="Total Copies"
              value={String(book.totalCopies)}
              icon={Package}
              valueClassName="font-medium tabular-nums text-dark-200"
            />
            <FieldRow
              label="Available Copies"
              value={String(book.availableCopies)}
              icon={Package}
              valueClassName={cn(
                "font-medium tabular-nums",
                AVAIL_TONE[availability.tone],
              )}
            />
          </dl>
        </div>

        <div className="admin-panel space-y-4">
          <TicketSectionHeader
            icon={<Palette className="size-4" />}
            title="Media & Flags"
            subtitle="Cover, color, trailer, and catalog flags"
            className="mb-0"
          />
          <div className="flex flex-wrap items-start gap-4">
            <BookCover
              coverColor={book.coverColor}
              coverImage={book.coverUrl}
              className="h-28 w-20"
            />
            <dl className="grid min-w-0 flex-1 gap-3">
              <FieldRow
                label="Cover Color"
                value={displayOrDash(book.coverColor)}
                copyable
                icon={Palette}
              />
              <FieldRow
                label="Cover URL"
                value={displayOrDash(book.coverUrl)}
                copyable={Boolean(book.coverUrl)}
                icon={BookImage}
              />
              <FieldRow
                label="Trailer URL"
                value={hasTrailer ? book.videoUrl : "—"}
                copyable={hasTrailer}
                icon={Video}
              />
              <div className="space-y-1">
                <p className={FIELD_LABEL_ROW}>
                  <BookA className="size-3.5 shrink-0" aria-hidden />
                  Flags
                </p>
                <p className="text-sm">
                  <span
                    className={cn(
                      "font-medium",
                      book.isActive ? "text-emerald-700" : "text-rose-700",
                    )}
                  >
                    {book.isActive ? "Active" : "Inactive"}
                  </span>
                  <span className="text-gray-400"> · </span>
                  <span
                    className={cn(
                      "font-medium",
                      book.isFeatured ? "text-sky-700" : "text-slate-500",
                    )}
                  >
                    {book.isFeatured ? "Featured" : "Not featured"}
                  </span>
                </p>
              </div>
            </dl>
          </div>
        </div>
      </div>

      <div className="admin-panel space-y-3">
        <TicketSectionHeader
          icon={<FileText className="size-4" />}
          title="Description"
          subtitle="Full catalog description"
          className="mb-0"
        />
        <p className="whitespace-pre-wrap text-sm text-gray-700">
          {book.description?.trim() ? book.description : "—"}
        </p>
      </div>

      <div className="admin-panel space-y-3">
        <TicketSectionHeader
          icon={<ClipboardList className="size-4" />}
          title="Summary"
          subtitle="Short summary for readers"
          className="mb-0"
        />
        <p className="whitespace-pre-wrap text-sm text-gray-700">
          {book.summary?.trim() ? book.summary : "—"}
        </p>
      </div>

      <div className="admin-panel space-y-4">
        <TicketSectionHeader
          icon={<Hash className="size-4" />}
          title="IDs & Library Stamps"
          subtitle="Who added the book and who last updated it"
          className="mb-0"
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="min-w-0 space-y-1">
            <p className={FIELD_LABEL_TEXT}>Added By</p>
            {book.createdByActor?.email ? (
              <>
                <PersonAttribution
                  person={book.createdByActor}
                  href={
                    book.createdByActor.id
                      ? `/admin/users/${book.createdByActor.id}`
                      : undefined
                  }
                />
                <TicketDateMeta
                  createdAt={book.createdAt}
                  createdLabel="Added"
                  hideUpdated
                  layout="stack"
                  className="mt-1"
                />
              </>
            ) : (
              <>
                <p className="text-sm text-gray-500">—</p>
                <TicketDateMeta
                  createdAt={book.createdAt}
                  createdLabel="Added"
                  hideUpdated
                  layout="stack"
                  className="mt-1"
                />
              </>
            )}
          </div>
          <div className="min-w-0 space-y-1">
            <p className={FIELD_LABEL_TEXT}>Updated By</p>
            {book.updatedByActor?.email ? (
              <>
                <PersonAttribution
                  person={book.updatedByActor}
                  href={
                    book.updatedByActor.id
                      ? `/admin/users/${book.updatedByActor.id}`
                      : undefined
                  }
                />
                <TicketDateMeta
                  updatedAt={book.updatedAt}
                  hideCreated
                  updatedLabel="Updated"
                  layout="stack"
                  className="mt-1"
                />
              </>
            ) : (
              <>
                <p className="text-sm text-gray-500">—</p>
                {book.updatedAt ? (
                  <TicketDateMeta
                    updatedAt={book.updatedAt}
                    hideCreated
                    updatedLabel="Updated"
                    layout="stack"
                    className="mt-1"
                  />
                ) : null}
              </>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
