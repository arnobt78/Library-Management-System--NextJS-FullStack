import React from "react";

const Page = () => {
  return (
    <main className="root-container flex min-h-screen flex-col items-center justify-center px-4">
      <h1 className="font-bebas-neue text-3xl font-bold text-light-100 sm:text-5xl">
        Whoa, Slow Down There, Speedy!
      </h1>
      <p className="mt-2 max-w-xl text-center text-sm text-light-400 sm:mt-3 sm:text-base">
        Looks like you&apos;ve been a little too eager. We&apos;ve put a
        temporary pause on your excitement. 🚦 Chill for a bit, and try again
        shortly
      </p>
    </main>
  );
};
export default Page;
