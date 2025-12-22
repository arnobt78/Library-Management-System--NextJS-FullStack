import { ReactNode } from "react";
// import Image from "next/image";
import { auth } from "@/auth";
import { redirect } from "next/navigation";

const Layout = async ({ children }: { children: ReactNode }) => {
  const session = await auth();

  // CRITICAL: Redirect authenticated users to home
  // NextAuth's signOut already clears the session before redirecting here
  // So if we reach this point with a session, user should be redirected to home
  if (session) {
    redirect("/");
  }

  return (
    <main className="auth-container">
      <section className="auth-form">
        <div className="auth-box">
          <div className="flex flex-row gap-3">
            <img src="/icons/logo.svg" alt="logo" width={37} height={37} />
            <h1 className="text-2xl font-semibold text-white">BookWise</h1>
          </div>

          <div>{children}</div>
        </div>
      </section>

      <section className="auth-illustration">
        <img
          src="/images/auth-illustration.png"
          alt="auth illustration"
          height={1000}
          width={1000}
          className="size-full object-cover"
        />
      </section>
    </main>
  );
};

export default Layout;
