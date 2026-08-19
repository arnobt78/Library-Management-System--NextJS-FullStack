/**
 * Secondary admin context links under book identity cells.
 * Mirrors User 360 Reviews "View review detail" pattern.
 */

import PrefetchLink from "@/components/PrefetchLink";
import {
  adminBookDetailHref,
  adminBookReviewDetailHref,
  adminBorrowRequestHref,
} from "@/lib/admin/adminRoutes";
import { SKY_LINK_LIGHT } from "@/lib/ui/skyLinkStyles";
import { cn } from "@/lib/utils";

export type AdminBookContextLinksProps = {
  bookId: string;
  /** When set, shows "View borrow detail". */
  borrowRecordId?: string | null;
  /** When set, shows "View review detail". */
  reviewId?: string | null;
  /** When false, skips "View book detail" (title already links to catalog). */
  showBookDetail?: boolean;
  className?: string;
};

export function AdminBookContextLinks({
  bookId,
  borrowRecordId,
  reviewId,
  showBookDetail = true,
  className,
}: AdminBookContextLinksProps) {
  const links: Array<{
    key: string;
    href: string;
    label: string;
    prefetchKind?: "admin-book-catalog-detail" | "borrow-request-detail";
  }> = [];

  if (showBookDetail) {
    links.push({
      key: "book",
      href: adminBookDetailHref(bookId),
      label: "View book detail",
      prefetchKind: "admin-book-catalog-detail",
    });
  }

  if (borrowRecordId) {
    links.push({
      key: "borrow",
      href: adminBorrowRequestHref(borrowRecordId),
      label: "View borrow detail",
      prefetchKind: "borrow-request-detail",
    });
  }

  if (reviewId) {
    links.push({
      key: "review",
      href: adminBookReviewDetailHref(reviewId),
      label: "View review detail",
    });
  }

  if (links.length === 0) return null;

  return (
    <div
      className={cn(
        "mt-1 flex min-w-0 flex-col gap-0.5 leading-none",
        className,
      )}
    >
      {links.map((link) => (
        <PrefetchLink
          key={link.key}
          href={link.href}
          prefetch={false}
          prefetchKind={link.prefetchKind}
          className={cn("block truncate text-xs", SKY_LINK_LIGHT)}
        >
          {link.label}
        </PrefetchLink>
      ))}
    </div>
  );
}
