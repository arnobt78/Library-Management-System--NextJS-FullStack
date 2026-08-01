"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";

import {
  Form,
  FormControl,
  FormDescription,
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
import { Checkbox } from "@/components/ui/checkbox";
import { useCreateBook, useUpdateBook } from "@/hooks/useMutations";
import { BOOK_FIELD_PLACEHOLDERS } from "@/constants";

interface Props extends Partial<Book> {
  type?: "create" | "update";
}

const BookForm = ({ type = "create", ...book }: Props) => {
  const router = useRouter();

  // React Query mutations
  const createBookMutation = useCreateBook();
  const updateBookMutation = useUpdateBook();

  type BookFormInput = z.input<typeof bookSchema>;
  type BookFormValues = z.output<typeof bookSchema>;

  const form = useForm<BookFormInput, unknown, BookFormValues>({
    resolver: zodResolver(bookSchema),
    defaultValues: {
      title: book.title || "",
      description: book.description || "",
      author: book.author || "",
      genre: book.genre || "",
      rating:
        type === "create"
          ? undefined
          : book.rating !== undefined
            ? book.rating
            : undefined,
      totalCopies:
        type === "create"
          ? undefined
          : book.totalCopies !== undefined
            ? book.totalCopies
            : undefined,
      coverUrl: book.coverUrl || "",
      coverColor: book.coverColor || "",
      videoUrl: book.videoUrl || "",
      summary: book.summary || "",
      // Enhanced fields
      isbn: book.isbn || undefined,
      publicationYear: book.publicationYear ?? undefined,
      publisher: book.publisher || undefined,
      language: type === "create" ? undefined : (book.language ?? undefined),
      pageCount: book.pageCount ?? undefined,
      edition: book.edition || undefined,
      isActive: book.isActive ?? true,
      isFeatured: book.isFeatured ?? false,
    },
  });

  const onSubmit = async (values: BookFormValues): Promise<void> => {
    if (type === "create") {
      // Use React Query mutation for creating book
      createBookMutation.mutate(
        values,
        {
          onSuccess: async () => {
            // Refresh RSC trees (homepage hero) then navigate — no full browser reload
            router.refresh();
            router.push(`/admin/books`);
          },
        }
      );
    } else {
      // Use React Query mutation for updating book
      updateBookMutation.mutate(
        { bookId: book.id!, ...values },
        {
          onSuccess: async () => {
            router.refresh();
            router.push(`/admin/books`);
          },
        }
      );
    }
  };

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="space-y-4 sm:space-y-8"
      >
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
                  placeholder={BOOK_FIELD_PLACEHOLDERS.title}
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
                  placeholder={BOOK_FIELD_PLACEHOLDERS.author}
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
                  placeholder={BOOK_FIELD_PLACEHOLDERS.genre}
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
                  placeholder={BOOK_FIELD_PLACEHOLDERS.rating}
                  {...field}
                  value={
                    typeof field.value === "number"
                      ? field.value
                      : ("" as const)
                  }
                  onChange={(e) => {
                    const value = e.target.value;
                    field.onChange(value === "" ? undefined : Number(value));
                  }}
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
                  placeholder={BOOK_FIELD_PLACEHOLDERS.totalCopies}
                  {...field}
                  value={
                    typeof field.value === "number"
                      ? field.value
                      : ("" as const)
                  }
                  onChange={(e) => {
                    const value = e.target.value;
                    field.onChange(value === "" ? undefined : Number(value));
                  }}
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
                  placeholder={BOOK_FIELD_PLACEHOLDERS.coverUrl}
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
                  placeholder={BOOK_FIELD_PLACEHOLDERS.description}
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
                  placeholder={BOOK_FIELD_PLACEHOLDERS.videoUrl}
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
                  placeholder={BOOK_FIELD_PLACEHOLDERS.summary}
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
        <div className="border-t border-gray-200 pt-4 sm:pt-6">
          <h3 className="mb-4 text-base font-semibold text-dark-500 sm:text-lg">
            Additional Information (Optional)
          </h3>

          <div className="grid grid-cols-1 gap-4 sm:gap-6 md:grid-cols-2">
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
                      placeholder={BOOK_FIELD_PLACEHOLDERS.isbn}
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
                      placeholder={BOOK_FIELD_PLACEHOLDERS.publicationYear}
                      {...field}
                      value={
                        typeof field.value === "number"
                          ? field.value
                          : ("" as const)
                      }
                      onChange={(e) => {
                        const value = e.target.value;
                        field.onChange(
                          value === "" ? undefined : Number(value)
                        );
                      }}
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
                      placeholder={BOOK_FIELD_PLACEHOLDERS.publisher}
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
                      placeholder={BOOK_FIELD_PLACEHOLDERS.language}
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
                      placeholder={BOOK_FIELD_PLACEHOLDERS.pageCount}
                      {...field}
                      value={
                        typeof field.value === "number"
                          ? field.value
                          : ("" as const)
                      }
                      onChange={(e) => {
                        const value = e.target.value;
                        field.onChange(
                          value === "" ? undefined : Number(value)
                        );
                      }}
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
                      placeholder={BOOK_FIELD_PLACEHOLDERS.edition}
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
              <FormItem className="mt-4 flex flex-row items-start gap-3 space-y-0">
                <FormControl>
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={(checked) =>
                      field.onChange(checked === true)
                    }
                  />
                </FormControl>
                <div className="space-y-1 leading-none">
                  <FormLabel className="text-base font-normal text-dark-500">
                    Book is active and available for borrowing
                  </FormLabel>
                  <FormMessage />
                </div>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name={"isFeatured"}
            render={({ field }) => (
              <FormItem className="mt-4 flex flex-row items-start gap-3 space-y-0">
                <FormControl>
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={(checked) =>
                      field.onChange(checked === true)
                    }
                  />
                </FormControl>
                <div className="space-y-1 leading-none">
                  <FormLabel className="text-base font-normal text-dark-500">
                    Feature on homepage
                  </FormLabel>
                  <FormDescription className="text-sm text-gray-500">
                    Checking this replaces any currently featured book as the
                    homepage hero.
                  </FormDescription>
                  <FormMessage />
                </div>
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
