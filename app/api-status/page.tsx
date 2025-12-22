/**
 * API Status Page
 *
 * Server Component that fetches service health and system metrics server-side for SSR.
 * Passes initial data to Client Component for React Query integration.
 */

import React from "react";
import Header from "@/components/Header";
import { auth } from "@/auth";
import ApiStatusClient from "@/components/ApiStatusClient";

export const runtime = "nodejs";

const ApiStatusPage = async () => {
  const session = await auth();

  if (!session) {
    return <div>Please sign in to view API status.</div>;
  }

  // Note: Service health requires multiple API calls (one per service),
  // and system metrics can be fetched client-side efficiently.
  // We'll let the client fetch everything with React Query for better UX.
  // Initial data is optional and can be added later if needed for SSR optimization.

  return (
    <main className="root-container">
      <div className="mx-auto w-full">
        <Header session={session} />

        <div className="py-0">
          <div className="min-h-screen bg-transparent py-0">
            <div className="mx-auto max-w-7xl px-4">
              <ApiStatusClient
                initialServices={undefined}
                initialMetrics={undefined}
              />
            </div>
          </div>
        </div>
      </div>
    </main>
  );
};

export default ApiStatusPage;
