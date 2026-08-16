/**
 * After hard-delete, SA remounts /admin/books/[id] with a missing row.
 * Redirect() painted a blank catalog shell before densify — instead soft-nav
 * immediately and paint AdminBooksList from warm RQ (universe densify).
 * Parent: never-paint 404 / white flash fix
 */
"use client";


import { useLayoutEffect } from "react";
import { useRouter } from "next/navigation";
import AdminBooksList from "@/components/AdminBooksList";

export default function DeletedBookCatalogFallback() {
  const router = useRouter();

  useLayoutEffect(() => {
    router.replace("/admin/books");
  }, [router]);

  // Paint densified universe immediately (no SSR seed) while replace settles.
  return <AdminBooksList />;
}
