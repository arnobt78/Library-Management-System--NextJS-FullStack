import React from "react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { getBookById } from "@/lib/admin/actions/book";
import { redirect } from "next/navigation";
import BookForm from "@/components/admin/forms/BookForm";

const Page = async ({ params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  const result = await getBookById(id);

  if (!result.success) {
    redirect("/admin/books");
  }

  const book = result.data;

  return (
    <div className="p-3 sm:p-6">
      <Button asChild className="back-btn mb-6 sm:mb-10">
        <Link href="/admin/books">Go Back</Link>
      </Button>

      <section className="mx-auto w-full max-w-2xl">
        <BookForm type="update" {...book} />
      </section>
    </div>
  );
};

export default Page;
