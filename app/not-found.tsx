/**
 * Root branded 404 — uses existing `#not-found` / `.not-found-btn` tokens.
 * Wrapped by `app/layout.tsx` only (no admin chrome).
 * Parent: delete-detail 404 flash + branded not-found
 */

import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="flex min-h-[70vh] w-full items-center justify-center px-4 py-16">
      <div id="not-found">
        <h4>404 — Page not found</h4>
        <p>
          This page does not exist or the resource was removed. Check the URL
          or return to the catalog.
        </p>
        <Button asChild className="not-found-btn">
          <Link href="/">Go home</Link>
        </Button>
        <Button asChild variant="link" className="mt-3 text-light-100">
          <Link href="/all-books">Browse all books</Link>
        </Button>
      </div>
    </main>
  );
}
