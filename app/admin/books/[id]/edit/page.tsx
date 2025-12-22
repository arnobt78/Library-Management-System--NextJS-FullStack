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
    <>
      <Button asChild className="back-btn">
        <Link href="/admin/books">Go Back</Link>
      </Button>

      <section className="w-full max-w-2xl">
        <BookForm type="update" {...book} />
      </section>
    </>
  );
};

export default Page;
