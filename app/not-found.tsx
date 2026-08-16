/**
 * Root branded 404 — public dark shell (`root-container` + `bg-pattern`).
 * Lives under `app/layout` only (not `(root)` — that layout forces sign-in).
 * Parent: delete-detail 404 flash + branded not-found
 */

import Link from "next/link";
import { BookOpen, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SKY_LINK_DARK } from "@/lib/ui/skyLinkStyles";
import { cn } from "@/lib/utils";

export default function NotFound() {
  return (
    <main className="root-container items-center justify-center px-4 py-16">
      <div id="not-found">
        <h4>404 — Page not found</h4>
        <p>
          This page does not exist or the resource was removed. Check the URL
          or return to the catalog.
        </p>
        <Button asChild className="not-found-btn">
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2"
          >
            <Home className="size-5 shrink-0" aria-hidden />
            Go home
          </Link>
        </Button>
        <Button asChild variant="link" className={cn("mt-3", SKY_LINK_DARK)}>
          <Link
            href="/all-books"
            className="inline-flex items-center justify-center gap-2"
          >
            <BookOpen className="size-4 shrink-0" aria-hidden />
            Browse all books
          </Link>
        </Button>
      </div>
    </main>
  );
}
