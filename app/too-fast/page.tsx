import React from "react";
import Footer from "@/components/Footer";

const Page = () => {
  return (
    <main className="root-container">
      <div className="page-shell flex min-h-screen flex-col">
        <div className="page-shell-main flex flex-1 flex-col items-center justify-center">
          <h1 className="font-bebas-neue text-3xl font-semibold text-light-100 sm:text-5xl">
            Whoa, Slow Down There, Speedy!
          </h1>
          <p className="mt-2 max-w-xl text-center text-sm text-light-400 sm:mt-3 sm:text-base">
            Looks like you&apos;ve been a little too eager. We&apos;ve put a
            temporary pause on your excitement. 🚦 Chill for a bit, and try again
            shortly
          </p>
        </div>
        <Footer />
      </div>
    </main>
  );
};
export default Page;
