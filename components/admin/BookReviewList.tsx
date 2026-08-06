"use client";

/**
 * Admin Book Reviews — moderation queue. KPI row + search/status filters +
 * sortable TanStack table matching Support Tickets densify patterns:
 * sky links (title/comment), PersonAttribution stacks, Approver column,
 * no whole-row click (Actions → View Details).
 * Parent: CR-0003 / REQ-0035 polish
 */

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ColumnDef } from "@tanstack/react-table";
import {
  CalendarPlus,
  CheckCircle2,
  Clock,
  Eye,
  Library,
  Loader2,
  MoreVertical,
  ShieldCheck,
  Star,
  Trash2,
  X,
  XCircle,
} from "lucide-react";
import { useAdminBookReviews } from "@/hooks/useQueries";
import { useDeleteReview, useModerateReview } from "@/hooks/useMutations";
import PrefetchLink from "@/components/PrefetchLink";
import { TABLE_CELL_TITLE } from "@/lib/ui/tableCellStyles";
import { StatCard, StatCardGrid } from "@/components/ui/StatCard";
import { DataTable } from "@/components/ui/data-table";
import { SortableHeader } from "@/components/ui/SortableHeader";
import { SearchInput } from "@/components/ui/SearchInput";
import { FilterSelect } from "@/components/ui/filter-select";
import { DismissibleFilterChips } from "@/components/ui/DismissibleFilterChips";
import { Badge } from "@/components/ui/badge";
import { ReviewStatusBadge } from "@/lib/ui/semanticBadges";
import {
  reviewRatingTone,
  reviewStatusFilterOptions,
} from "@/lib/ui/reviewOptions";
import StarRow from "@/components/ui/StarRow";
import PersonAttribution from "@/components/PersonAttribution";
import CircleBookCover from "@/components/reviews/CircleBookCover";
import { AdminListToolbar } from "@/components/admin/AdminListToolbar";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useSession } from "next-auth/react";
import { LIGHT_ALERT, LIGHT_MENU } from "@/lib/ui/glassActionChrome";
import { SKY_LINK_LIGHT } from "@/lib/ui/skyLinkStyles";
import { formatMediumDateTime } from "@/lib/ui/formatMediumDate";
import { cn } from "@/lib/utils";
import type { AdminRequestReviewer } from "@/lib/admin/adminRequestTypes";

function ReviewRowActions({
  review,
  currentAdmin,
}: {
  review: AdminBookReviewItem;
  /** SSR DB actor — preferred over useSession (card + name when session null). */
  currentAdmin?: AdminRequestReviewer | null;
}) {
  const router = useRouter();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const moderateMutation = useModerateReview();
  const deleteMutation = useDeleteReview();
  const { data: session } = useSession();
  // Prefer SSR currentAdmin (full card); session fallback never invents "an admin"
  // into densify — mutation resolver prefers post-invalidate join instead.
  const decisionActor: AdminRequestReviewer | undefined = currentAdmin
    ? {
        id: currentAdmin.id,
        fullName: currentAdmin.fullName,
        email: currentAdmin.email,
        universityCard: currentAdmin.universityCard,
      }
    : session?.user
      ? {
          id: session.user.id,
          fullName: session.user.name || "",
          email: session.user.email || "",
          universityCard:
            (session.user as { universityCard?: string | null })
              .universityCard ?? null,
        }
      : undefined;

  const detailHref = `/admin/book-reviews/${review.id}`;

  return (
    <>
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            aria-label="Review actions"
            className={LIGHT_MENU.trigger}
            onClick={(e) => e.stopPropagation()}
          >
            <MoreVertical className="size-4" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          className={LIGHT_MENU.content}
          onClick={(e) => e.stopPropagation()}
        >
          <DropdownMenuItem
            className={LIGHT_MENU.item}
            onSelect={() => router.push(detailHref)}
          >
            <Eye className="size-3.5" />
            View Details
          </DropdownMenuItem>
          <DropdownMenuSeparator className={LIGHT_MENU.separator} />
          {review.status !== "APPROVED" && (
            <DropdownMenuItem
              className={`${LIGHT_MENU.item} text-emerald-700 focus:bg-emerald-50 focus:text-emerald-700 data-[highlighted]:bg-emerald-50 data-[highlighted]:text-emerald-700`}
              onSelect={() =>
                moderateMutation.mutate({
                  reviewId: review.id,
                  status: "APPROVED",
                  bookTitle: review.bookTitle,
                  decisionActor,
                })
              }
              disabled={moderateMutation.isPending}
            >
              <CheckCircle2 className="size-3.5" />
              Approve
            </DropdownMenuItem>
          )}
          {review.status !== "REJECTED" && (
            <DropdownMenuItem
              className={`${LIGHT_MENU.item} text-amber-700 focus:bg-amber-50 focus:text-amber-700 data-[highlighted]:bg-amber-50 data-[highlighted]:text-amber-700`}
              onSelect={() =>
                moderateMutation.mutate({
                  reviewId: review.id,
                  status: "REJECTED",
                  bookTitle: review.bookTitle,
                  decisionActor,
                })
              }
              disabled={moderateMutation.isPending}
            >
              <XCircle className="size-3.5" />
              Reject
            </DropdownMenuItem>
          )}
          <DropdownMenuItem
            className={LIGHT_MENU.itemDestructive}
            onSelect={() => setDeleteOpen(true)}
          >
            <Trash2 className="size-3.5" />
            Delete
          </DropdownMenuItem>
          <DropdownMenuSeparator className={LIGHT_MENU.separator} />
          <DropdownMenuItem className={LIGHT_MENU.item}>
            <X className="size-3.5" />
            Cancel
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent className={LIGHT_ALERT.content}>
          <AlertDialogHeader>
            <AlertDialogTitle className={LIGHT_ALERT.title}>
              Delete review for &ldquo;{review.bookTitle}&rdquo;?
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className={`space-y-2 ${LIGHT_ALERT.description}`}>
                <p>
                  This permanently removes the review by {review.userName}. This
                  action cannot be undone.
                </p>
                <div className={LIGHT_ALERT.preview}>
                  <StarRow
                    rating={review.rating}
                    starClassName="size-4"
                    filledClassName="fill-yellow-400 text-yellow-400"
                    emptyClassName="fill-gray-300 text-gray-300"
                  />
                  <p className="mt-1.5 line-clamp-3 text-sm">{review.comment}</p>
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className={LIGHT_ALERT.footer}>
            <AlertDialogCancel
              disabled={deleteMutation.isPending}
              className={LIGHT_ALERT.cancel}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className={LIGHT_ALERT.destructive}
              disabled={deleteMutation.isPending}
              onClick={(e) => {
                e.preventDefault();
                deleteMutation.mutate(
                  {
                    reviewId: review.id,
                    bookId: review.bookId,
                    bookTitle: review.bookTitle,
                    userId: review.userId,
                  },
                  { onSuccess: () => setDeleteOpen(false) },
                );
              }}
            >
              {deleteMutation.isPending ? (
                <Loader2 className="size-3.5 animate-spin sm:size-4" />
              ) : (
                <Trash2 className="size-3.5 sm:size-4" />
              )}
              {deleteMutation.isPending ? "Deleting…" : "Delete review"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export default function BookReviewList({
  initialReviews,
  currentAdmin = null,
}: {
  initialReviews: AdminBookReviewItem[];
  /** SSR-signed-in admin for Approver densify (name/email/card). */
  currentAdmin?: AdminRequestReviewer | null;
}) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const {
    data: allReviews = [],
    isPending,
    isFetching,
  } = useAdminBookReviews({}, initialReviews);

  const reviews = useMemo(() => {
    return allReviews.filter((review) => {
      if (statusFilter !== "all" && review.status !== statusFilter) return false;
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        return (
          review.bookTitle.toLowerCase().includes(q) ||
          review.bookAuthor.toLowerCase().includes(q) ||
          review.userName.toLowerCase().includes(q) ||
          review.userEmail.toLowerCase().includes(q) ||
          review.comment.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [allReviews, statusFilter, search]);

  const stats = useMemo(() => {
    let pending = 0;
    let approved = 0;
    let rejected = 0;
    let ratingSum = 0;
    for (const review of allReviews) {
      if (review.status === "PENDING") pending += 1;
      else if (review.status === "APPROVED") approved += 1;
      else if (review.status === "REJECTED") rejected += 1;
      ratingSum += review.rating;
    }
    const avgRating = allReviews.length > 0 ? ratingSum / allReviews.length : 0;
    return { total: allReviews.length, pending, approved, rejected, avgRating };
  }, [allReviews]);

  const filterChipGroups = useMemo(() => {
    if (statusFilter === "all") return [];
    return [
      {
        label: "Status",
        values: [statusFilter],
        onClear: () => setStatusFilter("all"),
        renderBadge: (value: string) => (
          <ReviewStatusBadge status={value as AdminBookReviewItem["status"]} />
        ),
      },
    ];
  }, [statusFilter]);

  const handleResetFilters = () => {
    setSearch("");
    setStatusFilter("all");
  };

  const statusFilterOptions = useMemo(
    () => reviewStatusFilterOptions("light"),
    [],
  );

  const columns = useMemo<ColumnDef<AdminBookReviewItem>[]>(
    () => [
      {
        accessorKey: "bookTitle",
        size: 240,
        minSize: 180,
        header: ({ column }) => (
          <SortableHeader column={column}>Book</SortableHeader>
        ),
        cell: ({ row }) => {
          const r = row.original;
          // Title → public book detail (PrefetchLink warms detail + reviews).
          // Comment column keeps the admin review-detail link.
          const bookHref = `/books/${r.bookId}`;
          return (
            <div className="flex min-w-0 items-center gap-2">
              <CircleBookCover
                coverUrl={r.bookCoverUrl}
                coverColor={r.bookCoverColor}
                title={r.bookTitle}
                size={36}
                className="size-9 border border-gray-200 sm:size-9"
              />
              {/* Kebab stack — no mt / space-y / gap between title→author→meta */}
              <div className="flex min-w-0 flex-1 flex-col leading-none">
                <PrefetchLink
                  href={bookHref}
                  prefetch={false}
                  className={cn(TABLE_CELL_TITLE, "truncate", SKY_LINK_LIGHT)}
                >
                  {r.bookTitle}
                </PrefetchLink>
                {r.bookAuthor ? (
                  <span className="truncate text-xs text-muted-foreground">
                    {r.bookAuthor}
                  </span>
                ) : null}
                <div className="mt-0.5 flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
                  {r.bookGenre ? (
                    <Badge
                      variant="outline"
                      className="gap-0.5 px-1.5 py-0 text-[10px] font-normal text-violet-700"
                    >
                      <Library className="size-2.5" aria-hidden />
                      {r.bookGenre}
                    </Badge>
                  ) : null}
                  {r.bookRating > 0 ? (
                    <span className="inline-flex items-center gap-0.5 text-[10px] tabular-nums text-amber-600">
                      <Star
                        className="size-2.5 fill-amber-400 text-amber-400"
                        aria-hidden
                      />
                      {r.bookRating}
                    </span>
                  ) : null}
                </div>
              </div>
            </div>
          );
        },
      },
      {
        accessorKey: "userName",
        size: 180,
        minSize: 150,
        header: ({ column }) => (
          <SortableHeader column={column}>Reviewer</SortableHeader>
        ),
        cell: ({ row }) => {
          const r = row.original;
          return (
            <div
              className="flex min-w-0 flex-col leading-none"
              onClick={(e) => e.stopPropagation()}
            >
              <PersonAttribution
                layout="stack"
                size={32}
                href={`/admin/users/${r.userId}`}
                person={{
                  id: r.userId,
                  fullName: r.userName,
                  email: r.userEmail,
                  universityCard: r.userUniversityCard,
                }}
              />
              <p className="mt-0.5 inline-flex items-center gap-1 text-[10px] text-emerald-700">
                <CalendarPlus className="size-3 shrink-0 opacity-80" aria-hidden />
                <span className="opacity-70">Submitted</span>{" "}
                {formatMediumDateTime(r.createdAt)}
              </p>
            </div>
          );
        },
      },
      {
        accessorKey: "rating",
        size: 72,
        minSize: 64,
        header: ({ column }) => (
          <SortableHeader column={column}>Rating</SortableHeader>
        ),
        cell: ({ row }) => {
          const rating = row.original.rating;
          const tone = reviewRatingTone(rating);
          return (
            <span
              className={cn(
                "inline-flex items-center gap-0.5 text-sm font-normal tabular-nums",
                tone,
              )}
            >
              <Star className={cn("size-3.5 fill-current", tone)} aria-hidden />
              {rating}/5
            </span>
          );
        },
      },
      {
        accessorKey: "comment",
        size: 200,
        minSize: 140,
        header: "Comment",
        cell: ({ row }) => (
          <Link
            href={`/admin/book-reviews/${row.original.id}`}
            prefetch={false}
            className={cn(TABLE_CELL_TITLE, "line-clamp-2", SKY_LINK_LIGHT)}
          >
            {row.original.comment}
          </Link>
        ),
      },
      {
        accessorKey: "status",
        size: 118,
        minSize: 110,
        header: "Status",
        cell: ({ row }) => (
          <div className="inline-flex">
            <ReviewStatusBadge status={row.original.status} />
          </div>
        ),
      },
      {
        id: "approver",
        size: 180,
        minSize: 150,
        header: "Approver",
        enableSorting: false,
        cell: ({ row }) => {
          const r = row.original;
          const hasApprover =
            r.status !== "PENDING" &&
            Boolean(r.reviewedByName || r.reviewedByEmail);
          if (!hasApprover) {
            return <span className="text-sm text-muted-foreground">—</span>;
          }
          return (
            <div
              className="flex min-w-0 flex-col leading-none"
              onClick={(e) => e.stopPropagation()}
            >
              <PersonAttribution
                layout="stack"
                size={32}
                href={r.reviewedBy ? `/admin/users/${r.reviewedBy}` : null}
                person={{
                  id: r.reviewedBy ?? "",
                  fullName: r.reviewedByName || "an admin",
                  email: r.reviewedByEmail || "",
                  universityCard: r.reviewedByUniversityCard,
                }}
              />
              {r.reviewedAt ? (
                <p
                  className={cn(
                    "mt-0.5 inline-flex items-center gap-1 text-[10px]",
                    r.status === "REJECTED"
                      ? "text-rose-700"
                      : "text-emerald-700",
                  )}
                >
                  <ShieldCheck
                    className="size-3 shrink-0 opacity-80"
                    aria-hidden
                  />
                  <span className="opacity-70">
                    {r.status === "REJECTED" ? "Rejected" : "Approved"}
                  </span>{" "}
                  {formatMediumDateTime(r.reviewedAt)}
                </p>
              ) : null}
            </div>
          );
        },
      },
      {
        id: "actions",
        size: 64,
        minSize: 56,
        header: "Actions",
        enableSorting: false,
        cell: ({ row }) => <ReviewRowActions review={row.original} currentAdmin={currentAdmin} />,
      },
    ],
    [currentAdmin],
  );

  return (
    <section className="space-y-4 sm:space-y-6">
      <StatCardGrid>
        <StatCard title="Total Reviews" value={stats.total} icon={Star} hue="blue" />
        <StatCard title="Pending" value={stats.pending} icon={Clock} hue="amber" />
        <StatCard
          title="Approved"
          value={stats.approved}
          icon={CheckCircle2}
          hue="emerald"
        />
        <StatCard
          title="Rejected"
          value={stats.rejected}
          icon={XCircle}
          hue="rose"
        />
        <StatCard
          title="Avg Rating"
          value={stats.avgRating.toFixed(1)}
          icon={Star}
          hue="violet"
        />
      </StatCardGrid>

      <div className="admin-panel">
        <AdminListToolbar
          title="Book Reviews"
          count={reviews.length}
          chips={
            <DismissibleFilterChips
              variant="light"
              groups={filterChipGroups}
              onReset={handleResetFilters}
            />
          }
        >
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Search book, reviewer, comment…"
            className="sm:min-w-[240px]"
          />
          <FilterSelect
            label="Status"
            value={statusFilter}
            onValueChange={setStatusFilter}
            options={statusFilterOptions}
            labelLayout="inline"
            className="sm:min-w-[160px]"
          />
        </AdminListToolbar>

        <DataTable
          columns={columns}
          data={reviews}
          isLoading={(isPending || isFetching) && reviews.length === 0}
          emptyMessage="No reviews match your filters."
          initialPageSize={10}
        />
      </div>
    </section>
  );
}
