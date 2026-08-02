import { ReactNode } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { db } from "@/database/drizzle";
import { users } from "@/database/schema";
import { eq } from "drizzle-orm";

const Layout = async ({ children }: { children: ReactNode }) => {
  const session = await auth();

  if (!session) redirect("/sign-in");

  // Update last activity date synchronously
  if (session?.user?.id) {
    try {
      const user = await db
        .select()
        .from(users)
        .where(eq(users.id, session.user.id))
        .limit(1);

      if (
        user.length > 0 &&
        user[0].lastActivityDate !== new Date().toISOString().slice(0, 10)
      ) {
        await db
          .update(users)
          .set({ lastActivityDate: new Date().toISOString().slice(0, 10) })
          .where(eq(users.id, session.user.id));
      }
    } catch (error) {
      // Silently handle any database errors to prevent blocking the UI
      console.warn("Failed to update last activity date:", error);
    }
  }

  // Single page-shell aligns Header, main, and Footer on the same gutters
  return (
    <main className="root-container">
      <div className="page-shell flex min-h-screen flex-col">
        <Header session={session} />
        <div className="page-shell-main flex-1">{children}</div>
        <Footer />
      </div>
    </main>
  );
};

export default Layout;
