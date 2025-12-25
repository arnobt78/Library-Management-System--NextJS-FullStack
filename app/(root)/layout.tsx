import { ReactNode } from "react";
import Header from "@/components/Header";
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

  return (
    <main className="root-container">
      <div className="mx-auto w-full max-w-full overflow-x-hidden">
        <Header session={session} />

        <div className="py-4 sm:py-8 w-full max-w-full overflow-x-hidden">{children}</div>
      </div>
    </main>
  );
};

export default Layout;
