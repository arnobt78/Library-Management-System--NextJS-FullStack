/**
 * Admin edit book — AdminDetailToolbar + two-column BookForm panel.
 * Parent: admin books catalog polish
 */

import { getBookById } from "@/lib/admin/actions/book";
import { redirect } from "next/navigation";
import BookForm from "@/components/admin/forms/BookForm";
import DeleteBookDialog from "@/components/admin/DeleteBookDialog";
import { AdminBookFormShell } from "@/components/admin/AdminBookFormShell";

export const runtime = "nodejs";

const Page = async ({ params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  const result = await getBookById(id);

  if (!result.success || !result.data) {
    redirect("/admin/books");
  }

  const book = result.data;

  return (
    <AdminBookFormShell
      mode="edit"
      bookId={book.id}
      bookTitle={book.title}
      deleteAction={
        book.id && book.title ? (
          <DeleteBookDialog
            bookId={book.id}
            bookTitle={book.title}
            author={book.author}
            coverUrl={book.coverUrl}
            coverColor={book.coverColor}
            genre={book.genre}
            rating={book.rating}
            redirectTo="/admin/books"
          />
        ) : null
      }
    >
      <BookForm type="update" {...book} />
    </AdminBookFormShell>
  );
};

export default Page;
