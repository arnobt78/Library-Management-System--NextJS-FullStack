/**
 * Admin create book — AdminDetailToolbar + two-column BookForm panel.
 * Parent: admin books catalog polish
 */

import BookForm from "@/components/admin/forms/BookForm";
import { AdminBookFormShell } from "@/components/admin/AdminBookFormShell";

export const runtime = "nodejs";

const Page = () => {
  return (
    <AdminBookFormShell mode="create">
      <BookForm type="create" />
    </AdminBookFormShell>
  );
};

export default Page;
