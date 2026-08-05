"use client";

/**
 * Admin Book Reviews — moderation queue. KPI row + search/status filters +
 * sortable TanStack table; every book title links to the review detail page.
 * Approve/reject/delete are also available inline for fast triage.
 * Parent: CR-0003 / REQ-0034 — Book Review moderation
 */

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ColumnDef } from "@tanstack/react-table";
import {
  CheckCircle2,
  Clock,
  Loader2,
  MoreVertical,
  Star,
  Trash2,
  X,
  XCircle,
} from "lucide-react";
import { useAdminBookReviews } from "@/hooks/useQueries";
import { useDeleteReview, useModerateReview } from "@/hooks/useMutations";
import { StatCard, StatCardGrid } from "@/components/ui/StatCard";
import { DataTable } from "@/components/ui/data-table";
import { SortableHeader } from "@/components/ui/SortableHeader";
import { SearchInput } from "@/components/ui/SearchInput";
import { FilterSelect } from "@/components/ui/filter-select";
import { DismissibleFilterChips } from "@/components/ui/DismissibleFilterChips";
import { ReviewStatusBadge } from "@/lib/ui/semanticBadges";
import { REVIEW_STATUS_FILTER_OPTIONS } from "@/lib/ui/reviewOptions";
import StarRow from "@/components/ui/StarRow";
import { PersonNameEmailCell } from "@/components/ui/PersonNameEmailCell";
import { MediumDateCell } from "@/components/ui/MediumDateCell";
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
import { LIGHT_ALERT, LIGHT_MENU } from "@/lib/ui/glassActionChrome";

function ReviewRowActions({ review }: { review: AdminBookReviewItem }) {
  const [deleteOpen, setDeleteOpen] = useState(false);
  const moderateMutation = useModerateReview();
  const deleteMutation = useDeleteReview();

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
          {review.status !== "APPROVED" && (
            <DropdownMenuItem
              className={`${LIGHT_MENU.item} text-emerald-700 focus:bg-emerald-50 focus:text-emerald-700 data-[highlighted]:bg-emerald-50 data-[highlighted]:text-emerald-700`}
              onSelect={() =>
                moderateMutation.mutate({
                  reviewId: review.id,
                  status: "APPROVED",
                  bookTitle: review.bookTitle,
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
                  { reviewId: review.id, bookTitle: review.bookTitle },
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
}: {
  initialReviews: AdminBookReviewItem[];
}) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const { data: allReviews = [], isPending } = useAdminBookReviews(
    {},
    initialReviews,
  );

  const reviews = useMemo(() => {
    return allReviews.filter((review) => {
      if (statusFilter !== "all" && review.status !== statusFilter) return false;
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        return (
          review.bookTitle.toLowerCase().includes(q) ||
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

  const columns = useMemo<ColumnDef<AdminBookReviewItem>[]>(
    () => [
      {
        accessorKey: "bookTitle",
        header: ({ column }) => <SortableHeader column={column}>Book</SortableHeader>,
        cell: ({ row }) => (
          <Link
            href={`/admin/book-reviews/${row.original.id}`}
            className="line-clamp-1 max-w-56 text-sm font-medium text-primary-admin hover:underline"
            onClick={(e) => e.stopPropagation()}
          >
            {row.original.bookTitle}
          </Link>
        ),
      },
      {
        accessorKey: "userName",
        header: ({ column }) => <SortableHeader column={column}>Reviewer</SortableHeader>,
        cell: ({ row }) => (
          <PersonNameEmailCell
            name={row.original.userName}
            email={row.original.userEmail}
          />
        ),
      },
      {
        accessorKey: "rating",
        header: ({ column }) => <SortableHeader column={column}>Rating</SortableHeader>,
        cell: ({ row }) => <StarRow rating={row.original.rating} />,
      },
      {
        accessorKey: "comment",
        header: "Comment",
        cell: ({ row }) => (
          <p className="line-clamp-2 max-w-64 text-sm text-gray-600">
            {row.original.comment}
          </p>
        ),
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => <ReviewStatusBadge status={row.original.status} />,
      },
      {
        accessorKey: "createdAt",
        header: ({ column }) => <SortableHeader column={column}>Submitted</SortableHeader>,
        cell: ({ row }) => <MediumDateCell value={row.original.createdAt} />,
      },
      {
        id: "actions",
        header: "",
        cell: ({ row }) => <ReviewRowActions review={row.original} />,
      },
    ],
    [],
  );

  return (
    <section className="space-y-4 sm:space-y-6">
      <StatCardGrid>
        <StatCard title="Total Reviews" value={stats.total} icon={Star} hue="blue" />
        <StatCard title="Pending" value={stats.pending} icon={Clock} hue="amber" />
        <StatCard title="Approved" value={stats.approved} icon={CheckCircle2} hue="emerald" />
        <StatCard title="Rejected" value={stats.rejected} icon={XCircle} hue="rose" />
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
            options={REVIEW_STATUS_FILTER_OPTIONS}
            labelLayout="inline"
            className="sm:min-w-[160px]"
          />
        </AdminListToolbar>

        <DataTable
          columns={columns}
          data={reviews}
          isLoading={isPending && reviews.length === 0}
          emptyMessage="No reviews match your filters."
          onRowClick={(review) => router.push(`/admin/book-reviews/${review.id}`)}
          initialPageSize={10}
        />
      </div>
    </section>
  );
}
