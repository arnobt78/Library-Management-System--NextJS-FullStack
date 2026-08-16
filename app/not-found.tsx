/**
 * Root branded 404 — light shell (`app/layout` only; no dark root-container).
 * Copy uses dark CSS tokens; secondary CTA uses shared sky link (admin light).
 * Parent: delete-detail 404 flash + branded not-found
 */

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { SKY_LINK_LIGHT } from "@/lib/ui/skyLinkStyles";
import { cn } from "@/lib/utils";

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
        <Button asChild variant="link" className={cn("mt-3", SKY_LINK_LIGHT)}>
          <Link href="/all-books">Browse all books</Link>
        </Button>
      </div>
    </main>
  );
}
