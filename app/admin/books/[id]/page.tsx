/**
 * Admin Book Catalog detail — SSR-seeds book + borrow stats + FIFO-25 Activity.
 * Parent: Admin Book Detail FIFO-25 Activity
 *
 * Missing book → redirect to catalog (same as edit), not notFound().
 * After hard-delete the Server Action remounts this route; redirect avoids
 * the default black Next/Vercel 404 flash before client soft-nav to list.
 */

import { redirect } from "next/navigation";
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

  if (!result.success || !result.data) {
    redirect("/admin/books");
  }

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
