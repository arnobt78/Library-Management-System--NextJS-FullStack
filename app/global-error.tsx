/**
 * Root App Router error boundary — reports to Sentry then shows a minimal shell.
 * Must define its own <html>/<body> (replaces root layout on fatal errors).
 */

"use client";

import * as Sentry from "@sentry/nextjs";
import Link from "next/link";
import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="en">
      <body className="min-h-dvh bg-dark-100 text-light-100 antialiased">
        <main className="mx-auto flex min-h-dvh max-w-lg flex-col items-center justify-center gap-4 px-6 text-center">
          <h1 className="text-2xl font-medium">Something went wrong</h1>
          <p className="text-sm text-light-100/70">
            An unexpected error occurred. You can try again, or return home.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => reset()}
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-dark-100"
            >
              Try again
            </button>
            <Link
              href="/"
              className="rounded-md border border-light-100/20 px-4 py-2 text-sm font-medium text-light-100"
            >
              Go home
            </Link>
          </div>
        </main>
      </body>
    </html>
  );
}
