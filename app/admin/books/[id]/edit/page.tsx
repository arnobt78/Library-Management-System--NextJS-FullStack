import React from "react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { getBookById } from "@/lib/admin/actions/book";
import { redirect } from "next/navigation";
import BookForm from "@/components/admin/forms/BookForm";
import DeleteBookDialog from "@/components/admin/DeleteBookDialog";

const Page = async ({ params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  const result = await getBookById(id);

  if (!result.success) {
    redirect("/admin/books");
  }

  const book = result.data;

  return (
    <div className="p-2 sm:p-4">
      <div className="mb-6 flex flex-wrap items-center gap-3 sm:mb-10">
        <Button asChild className="back-btn">
          <Link href="/admin/books">Go Back</Link>
        </Button>
        {book?.id && book?.title ? (
          <DeleteBookDialog
            bookId={book.id}
            bookTitle={book.title}
            redirectTo="/admin/books"
          />
        ) : null}
      </div>

      <section className="mx-auto w-full max-w-2xl">
        <BookForm type="update" {...book} />
      </section>
    </div>
  );
};

export default Page;
