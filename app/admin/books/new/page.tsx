import React from "react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import BookForm from "@/components/admin/forms/BookForm";

const Page = () => {
  return (
    <div className="p-3 sm:p-6">
      <Button asChild className="back-btn mb-6 sm:mb-10">
        <Link href="/admin/books">Go Back</Link>
      </Button>

      <section className="mx-auto w-full max-w-2xl">
        <BookForm />
      </section>
    </div>
  );
};
export default Page;
