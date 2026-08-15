/**
 * Admin-segment 404 — keeps Header + Sidebar (admin layout wraps this).
 * Light empty copy matches AdminDetailEmptyState; CTAs soft-nav to known surfaces.
 * Parent: delete-detail 404 flash + branded not-found
 */

import Link from "next/link";
import { AdminDetailEmptyState } from "@/components/admin/AdminDetailEmptyState";
import { Button } from "@/components/ui/button";
import { LIGHT_GLASS_CTA } from "@/lib/ui/glassActionChrome";
import { cn } from "@/lib/utils";

export default function AdminNotFound() {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 py-12">
      <AdminDetailEmptyState
        className="min-h-0"
        message="404 — This admin page could not be found. The record may have been deleted or the URL is invalid."
      />
      <div className="flex flex-wrap items-center justify-center gap-2">
        <Button asChild className={cn(LIGHT_GLASS_CTA.host, LIGHT_GLASS_CTA.edit)}>
          <Link href="/admin">Library Overview</Link>
        </Button>
        <Button asChild variant="outline" className="h-9">
          <Link href="/admin/books">Book Catalog</Link>
        </Button>
      </div>
    </div>
  );
}
