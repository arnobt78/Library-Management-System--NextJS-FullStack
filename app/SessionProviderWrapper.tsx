"use client";
import { SessionProvider } from "next-auth/react";
import { ReactNode } from "react";

/**
 * Client SessionProvider seeded from SSR `auth()`.
 * refetchOnWindowFocus: after 1-day JWT idle expiry, focusing the tab
 * refreshes useSession without requiring a full navigation first.
 */
const SessionProviderWrapper = ({
  session,
  children,
}: {
  session: import("next-auth").Session | null;
  children: ReactNode;
}) => {
  return (
    <SessionProvider session={session} refetchOnWindowFocus>
      {children}
    </SessionProvider>
  );
};

export default SessionProviderWrapper;
