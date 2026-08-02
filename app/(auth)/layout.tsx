import { ReactNode } from "react";
import { auth } from "@/auth";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Footer from "@/components/Footer";

const Layout = async ({ children }: { children: ReactNode }) => {
  const session = await auth();

  // During logout, session cookie can briefly still exist while we land on /sign-in.
  // Honor logout-in-progress so we do not bounce back home before the goodbye toast.
  const cookieStore = await cookies();
  const logoutInProgress =
    cookieStore.get("logout-in-progress")?.value === "true";

  if (session && !logoutInProgress) {
    redirect("/");
  }

  return (
    <main className="auth-container">
      {/* Left pane: form + auth footer (illustration stays right) */}
      <section className="auth-form">
        <div className="auth-box">
          <div className="flex flex-row gap-2 sm:gap-3">
            <img
              src="/icons/logo.svg"
              alt="logo"
              width={37}
              height={37}
              className="size-7 sm:size-[37px]"
            />
            <h1 className="text-xl font-semibold text-white sm:text-xl">
              BookWise
            </h1>
          </div>

          <div>{children}</div>
        </div>
        <Footer variant="auth" />
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
