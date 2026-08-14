/**
 * Admin Book Catalog detail — SSR-seeds book + borrow stats + FIFO-25 Activity.
 * Parent: Admin Book Detail FIFO-25 Activity
 */

import { notFound } from "next/navigation";
import { getBookById } from "@/lib/admin/actions/book";
import { getBookAuditEvents } from "@/lib/admin/bookAudit";
import { loadBookBorrowStats } from "@/lib/services/loadBookBorrowStats";
import AdminBookCatalogDetailContent from "@/components/admin/AdminBookCatalogDetailContent";

export const runtime = "nodejs";

const Page = async ({ params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;

  const [result, initialBookStats, auditEvents] = await Promise.all([
    getBookById(id),
    loadBookBorrowStats(id),
    getBookAuditEvents(id),
  ]);

  if (!result.success || !result.data) notFound();

  const seeded: Book = {
    ...result.data,
    auditEvents,
  };

  return (
    <AdminBookCatalogDetailContent
      initialBook={JSON.parse(JSON.stringify(seeded))}
      initialBookStats={JSON.parse(JSON.stringify(initialBookStats))}
    />
  );
};

export default Page;
