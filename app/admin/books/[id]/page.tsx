/**
 * Admin Book Catalog detail — SSR-seeds book + borrow stats.
 * Parent: admin books catalog polish
 */

import { notFound } from "next/navigation";
import { getBookById } from "@/lib/admin/actions/book";
import { loadBookBorrowStats } from "@/lib/services/loadBookBorrowStats";
import AdminBookCatalogDetailContent from "@/components/admin/AdminBookCatalogDetailContent";

export const runtime = "nodejs";

const Page = async ({ params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;

  const resultPromise = getBookById(id);
  const statsPromise = loadBookBorrowStats(id);

  const [result, initialBookStats] = await Promise.all([
    resultPromise,
    statsPromise,
  ]);

  if (!result.success || !result.data) notFound();

  return (
    <AdminBookCatalogDetailContent
      initialBook={JSON.parse(JSON.stringify(result.data))}
      initialBookStats={JSON.parse(JSON.stringify(initialBookStats))}
    />
  );
};

export default Page;
