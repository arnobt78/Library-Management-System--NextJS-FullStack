"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useRouter } from "next/navigation";
import { bookSchema } from "@/lib/validations";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import FileUpload from "@/components/FileUpload";
import ColorPicker from "@/components/admin/ColorPicker";
import { useCreateBook, useUpdateBook } from "@/hooks/useMutations";
import { useSession } from "next-auth/react";

interface Props extends Partial<Book> {
  type?: "create" | "update";
}

const BookForm = ({ type = "create", ...book }: Props) => {
  const router = useRouter();
  const { data: session } = useSession();

  // React Query mutations
  const createBookMutation = useCreateBook();
  const updateBookMutation = useUpdateBook();

  type BookFormValues = z.infer<typeof bookSchema>;

  const form = useForm<BookFormValues>({
    resolver: zodResolver(bookSchema),
    defaultValues: {
      title: book.title || "",
      description: book.description || "",
      author: book.author || "",
      genre: book.genre || "",
      rating: book.rating || 1,
      totalCopies: book.totalCopies || 1,
      coverUrl: book.coverUrl || "",
      coverColor: book.coverColor || "",
      videoUrl: book.videoUrl || "",
      summary: book.summary || "",
      // Enhanced fields
      isbn: book.isbn || undefined,
      publicationYear: book.publicationYear ?? undefined,
      publisher: book.publisher || undefined,
      language: book.language || "English",
      pageCount: book.pageCount ?? undefined,
      edition: book.edition || undefined,
      isActive: book.isActive ?? true,
    },
  });

  const onSubmit = async (values: BookFormValues): Promise<void> => {
    const updatedBy = session?.user?.id || undefined;

    if (type === "create") {
      // Use React Query mutation for creating book
      createBookMutation.mutate(
        { ...values, updatedBy },
        {
          onSuccess: async () => {
            // Wait a brief moment for cache invalidation to complete
            // This ensures queries refetch before navigation
            await new Promise((resolve) => setTimeout(resolve, 100));
            // Navigate to books list after successful creation
            // Toast is already shown by the mutation hook
            router.push(`/admin/books`);
          },
        }
      );
    } else {
      // Use React Query mutation for updating book
      updateBookMutation.mutate(
        { bookId: book.id!, ...values, updatedBy },
        {
          onSuccess: async () => {
            // Wait a brief moment for cache invalidation to complete
            // This ensures queries refetch before navigation
            await new Promise((resolve) => setTimeout(resolve, 100));
            // Navigate to books list after successful update
            // Toast is already shown by the mutation hook
            router.push(`/admin/books`);
          },
        }
      );
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <FormField
          control={form.control}
          name={"title"}
          render={({ field }) => (
            <FormItem className="flex flex-col gap-1">
              <FormLabel className="text-base font-normal text-dark-500">
                Book Title
              </FormLabel>
              <FormControl>
                <Input
                  required
                  placeholder="Book title"
                  {...field}
                  className="book-form_input"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name={"author"}
          render={({ field }) => (
            <FormItem className="flex flex-col gap-1">
              <FormLabel className="text-base font-normal text-dark-500">
                Author
              </FormLabel>
              <FormControl>
                <Input
                  required
                  placeholder="Book author"
                  {...field}
                  className="book-form_input"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name={"genre"}
          render={({ field }) => (
            <FormItem className="flex flex-col gap-1">
              <FormLabel className="text-base font-normal text-dark-500">
                Genre
              </FormLabel>
              <FormControl>
                <Input
                  required
                  placeholder="Book genre"
                  {...field}
                  className="book-form_input"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name={"rating"}
          render={({ field }) => (
            <FormItem className="flex flex-col gap-1">
              <FormLabel className="text-base font-normal text-dark-500">
                Rating
              </FormLabel>
              <FormControl>
                <Input
                  type="number"
                  min={1}
                  max={5}
                  placeholder="Book rating"
                  {...field}
                  className="book-form_input"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name={"totalCopies"}
          render={({ field }) => (
            <FormItem className="flex flex-col gap-1">
              <FormLabel className="text-base font-normal text-dark-500">
                Total Copies
              </FormLabel>
              <FormControl>
                <Input
                  type="number"
                  min={1}
                  max={10000}
                  placeholder="Total copies"
                  {...field}
                  className="book-form_input"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name={"coverUrl"}
          render={({ field }) => (
            <FormItem className="flex flex-col gap-1">
              <FormLabel className="text-base font-normal text-dark-500">
                Book Image
              </FormLabel>
              <FormControl>
                <FileUpload
                  type="image"
                  accept="image/*"
                  placeholder="Upload a book cover"
                  folder="books/covers"
                  variant="light"
                  onFileChange={field.onChange}
                  value={field.value}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name={"coverColor"}
          render={({ field }) => (
            <FormItem className="flex flex-col gap-1">
              <FormLabel className="text-base font-normal text-dark-500">
                Primary Color
              </FormLabel>
              <FormControl>
                <ColorPicker
                  onPickerChange={field.onChange}
                  value={field.value}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name={"description"}
          render={({ field }) => (
            <FormItem className="flex flex-col gap-1">
              <FormLabel className="text-base font-normal text-dark-500">
                Book Description
              </FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Book description"
                  {...field}
                  rows={10}
                  className="book-form_input"
                />
              </FormControl>

              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name={"videoUrl"}
          render={({ field }) => (
            <FormItem className="flex flex-col gap-1">
              <FormLabel className="text-base font-normal text-dark-500">
                Book Trailer
              </FormLabel>
              <FormControl>
                <FileUpload
                  type="video"
                  accept="video/*"
                  placeholder="Upload a book trailer"
                  folder="books/videos"
                  variant="light"
                  onFileChange={field.onChange}
                  value={field.value}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name={"summary"}
          render={({ field }) => (
            <FormItem className="flex flex-col gap-1">
              <FormLabel className="text-base font-normal text-dark-500">
                Book Summary
              </FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Book summary"
                  {...field}
                  rows={5}
                  className="book-form_input"
                />
              </FormControl>

              <FormMessage />
            </FormItem>
          )}
        />

        {/* Enhanced Fields Section */}
        <div className="border-t border-gray-200 pt-6">
          <h3 className="mb-4 text-lg font-semibold text-dark-500">
            Additional Information (Optional)
          </h3>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <FormField
              control={form.control}
              name={"isbn"}
              render={({ field }) => (
                <FormItem className="flex flex-col gap-1">
                  <FormLabel className="text-base font-normal text-dark-500">
                    ISBN
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder="978-0-123456-78-9"
                      {...field}
                      className="book-form_input"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name={"publicationYear"}
              render={({ field }) => (
                <FormItem className="flex flex-col gap-1">
                  <FormLabel className="text-base font-normal text-dark-500">
                    Publication Year
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={1000}
                      max={new Date().getFullYear()}
                      placeholder="2023"
                      {...field}
                      className="book-form_input"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name={"publisher"}
              render={({ field }) => (
                <FormItem className="flex flex-col gap-1">
                  <FormLabel className="text-base font-normal text-dark-500">
                    Publisher
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Publisher name"
                      {...field}
                      className="book-form_input"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name={"language"}
              render={({ field }) => (
                <FormItem className="flex flex-col gap-1">
                  <FormLabel className="text-base font-normal text-dark-500">
                    Language
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder="English"
                      {...field}
                      className="book-form_input"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name={"pageCount"}
              render={({ field }) => (
                <FormItem className="flex flex-col gap-1">
                  <FormLabel className="text-base font-normal text-dark-500">
                    Page Count
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={1}
                      placeholder="300"
                      {...field}
                      className="book-form_input"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name={"edition"}
              render={({ field }) => (
                <FormItem className="flex flex-col gap-1">
                  <FormLabel className="text-base font-normal text-dark-500">
                    Edition
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder="1st Edition"
                      {...field}
                      className="book-form_input"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name={"isActive"}
            render={({ field }) => (
              <FormItem className="mt-4 flex flex-row items-center space-x-3 space-y-0">
                <FormControl>
                  <input
                    type="checkbox"
                    checked={field.value}
                    onChange={field.onChange}
                    className="size-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                </FormControl>
                <FormLabel className="text-base font-normal text-dark-500">
                  Book is active and available for borrowing
                </FormLabel>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <Button type="submit" className="book-form_btn text-white">
          {type === "create" ? "Add Book to Library" : "Update Book"}
        </Button>
      </form>
    </Form>
  );
};
export default BookForm;
