/**
 * Admin book create/update form — icon labels, media trio dropzone, confirm+settle densify.
 * Footer CTAs use LIGHT_GLASS_CTA (detail DNA); Active/Featured 2-col + Info tooltip.
 * Mutations via book.write gateway; soft-nav after densify (no router.refresh flash).
 * Submit CTAs disabled until Zod-valid; gate syncs shell toolbar (outside FormProvider).
 * Parent: REQ-0033 book form UI polish
 */
"use client";

import { useEffect, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import {
  BookImage,
  BookKey,
  BookMarked,
  BookOpenCheck,
  BookOpenText,
  BookText,
  BookType,
  BookUser,
  CalendarCheck2,
  FileVideoCamera,
  Form as FormIcon,
  Info,
  Languages,
  Layers,
  Library,
  Loader2,
  Palette,
  Plus,
  ReceiptText,
  Save,
  Star,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import FileUpload from "@/components/FileUpload";
import ColorPicker from "@/components/admin/ColorPicker";
import {
  BookFormConfirmDialog,
  type BookFormConfirmPreview,
} from "@/components/admin/BookFormConfirmDialog";
import { BookFormFieldLabel } from "@/components/admin/forms/BookFormFieldLabel";
import { BOOK_ADMIN_FORM_ID } from "@/components/admin/AdminBookFormShell";
import { useBookAdminFormGate } from "@/components/admin/BookAdminFormGate";
import { bookSchema } from "@/lib/validations";
import { useCreateBook, useUpdateBook } from "@/hooks/useMutations";
import { useBackWithRefresh } from "@/hooks/useBackWithRefresh";
import { BOOK_FIELD_PLACEHOLDERS } from "@/constants";
import { TicketSectionHeader } from "@/components/support-tickets/TicketSectionHeader";
import { LIGHT_GLASS_CTA } from "@/lib/ui/glassActionChrome";
import { cn } from "@/lib/utils";

interface Props extends Partial<Book> {
  type?: "create" | "update";
}

/** Equal-height media cards for Cover | Color | Trailer on lg (CARD_PAD rhythm). */
const mediaCardClass =
  "flex h-full flex-col gap-1 rounded-lg border border-gray-200 bg-gray-50/50 p-2 sm:p-4";

type BookFormInput = z.input<typeof bookSchema>;
type BookFormValues = z.output<typeof bookSchema>;

const BookForm = ({ type = "create", ...book }: Props) => {
  const router = useRouter();
  const isCreate = type === "create";
  const cancelHref =
    type === "update" && book.id ? `/admin/books/${book.id}` : "/admin/books";
  const goCancel = useBackWithRefresh("book.write", cancelHref);

  const createBookMutation = useCreateBook();
  const updateBookMutation = useUpdateBook();
  const isPending =
    createBookMutation.isPending || updateBookMutation.isPending;
  const { setGate } = useBookAdminFormGate();

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingValues, setPendingValues] = useState<BookFormValues | null>(
    null,
  );

  const form = useForm<BookFormInput, unknown, BookFormValues>({
    resolver: zodResolver(bookSchema),
    mode: "onChange",
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

  const { isValid } = form.formState;

  // Edit with full defaults: enable CTAs immediately; create stays disabled until filled.
  useEffect(() => {
    void form.trigger();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount-only validate against defaults
  }, []);

  // Keep shell toolbar submit in sync (outside FormProvider).
  useEffect(() => {
    setGate({ canSubmit: isValid, isPending });
  }, [isValid, isPending, setGate]);

  /** Validate then open confirm — mutate only after dialog confirm. */
  const onSubmit = (values: BookFormValues): void => {
    setPendingValues(values);
    setConfirmOpen(true);
  };

  const handleConfirm = async (): Promise<void> => {
    if (!pendingValues) return;

    try {
      if (isCreate) {
        const data = await createBookMutation.mutateAsync(pendingValues);
        setConfirmOpen(false);
        setPendingValues(null);
        const newId =
          data && typeof data === "object" && "id" in data
            ? String((data as Book).id)
            : null;
        router.push(newId ? `/admin/books/${newId}` : "/admin/books");
      } else {
        await updateBookMutation.mutateAsync({
          bookId: book.id!,
          ...pendingValues,
        });
        setConfirmOpen(false);
        setPendingValues(null);
        router.push(`/admin/books/${book.id}`);
      }
    } catch {
      // Toast from useCreateBook / useUpdateBook; keep dialog open.
    }
  };

  const confirmPreview: BookFormConfirmPreview = pendingValues
    ? {
        title: pendingValues.title,
        author: pendingValues.author,
        genre: pendingValues.genre,
        rating: pendingValues.rating,
        coverUrl: pendingValues.coverUrl,
        coverColor: pendingValues.coverColor,
      }
    : {
        title: form.getValues("title") || "",
        author: form.getValues("author") || "",
        genre: form.getValues("genre") || "",
        rating: Number(form.getValues("rating")) || 0,
        coverUrl: form.getValues("coverUrl") || "",
        coverColor: form.getValues("coverColor") || "",
      };

  const fieldClass = "flex flex-col gap-1";

  return (
    <>
      <Form {...form}>
        <form
          id={BOOK_ADMIN_FORM_ID}
          onSubmit={form.handleSubmit(onSubmit)}
          className="space-y-6"
        >
          {/* Identity + inventory — two columns on lg */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-6">
            <FormField
              control={form.control}
              name={"title"}
              render={({ field }) => (
                <FormItem className={fieldClass}>
                  <BookFormFieldLabel icon={BookType} required>
                    Book Title
                  </BookFormFieldLabel>
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
                <FormItem className={fieldClass}>
                  <BookFormFieldLabel icon={BookUser} required>
                    Author
                  </BookFormFieldLabel>
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
                <FormItem className={fieldClass}>
                  <BookFormFieldLabel icon={Library} required>
                    Genre
                  </BookFormFieldLabel>
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
                <FormItem className={fieldClass}>
                  <BookFormFieldLabel icon={Star} required>
                    Rating
                  </BookFormFieldLabel>
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
                        field.onChange(
                          value === "" ? undefined : Number(value),
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
              name={"totalCopies"}
              render={({ field }) => (
                <FormItem className={fieldClass}>
                  <BookFormFieldLabel icon={Layers} required>
                    Total Copies
                  </BookFormFieldLabel>
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
                        field.onChange(
                          value === "" ? undefined : Number(value),
                        );
                      }}
                      className="book-form_input"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Media trio: Cover | Cover Color | Trailer — dropzone + fill color + Clear */}
          <div className="grid grid-cols-1 items-stretch gap-4 md:grid-cols-2 lg:grid-cols-3 lg:gap-6">
            <FormField
              control={form.control}
              name={"coverUrl"}
              render={({ field }) => (
                <FormItem className={cn(fieldClass, mediaCardClass)}>
                  <div className="flex items-center justify-between gap-2">
                    <BookFormFieldLabel icon={BookImage} required>
                      Book Image
                    </BookFormFieldLabel>
                    {field.value ? (
                      <button
                        type="button"
                        className="shrink-0 text-xs font-medium text-rose-600 hover:text-rose-700"
                        onClick={() => field.onChange("")}
                      >
                        Clear
                      </button>
                    ) : null}
                  </div>
                  <FormControl>
                    <div className="flex min-h-0 flex-1 flex-col">
                      <FileUpload
                        type="image"
                        accept="image/*"
                        placeholder={BOOK_FIELD_PLACEHOLDERS.coverUrl}
                        folder="books/covers"
                        variant="light"
                        layout="dropzone"
                        onFileChange={field.onChange}
                        value={field.value}
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name={"coverColor"}
              render={({ field }) => (
                <FormItem
                  className={cn(
                    fieldClass,
                    mediaCardClass,
                    "items-stretch",
                  )}
                >
                  <BookFormFieldLabel icon={Palette} required>
                    Book Cover Color
                  </BookFormFieldLabel>
                  <FormControl>
                    <div className="flex min-h-40 flex-1 flex-col items-stretch justify-center py-1">
                      <ColorPicker
                        fill
                        onPickerChange={field.onChange}
                        value={field.value}
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name={"videoUrl"}
              render={({ field }) => (
                <FormItem
                  className={cn(
                    fieldClass,
                    mediaCardClass,
                    "md:col-span-2 lg:col-span-1",
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <BookFormFieldLabel icon={FileVideoCamera} required>
                      Book Trailer
                    </BookFormFieldLabel>
                    {field.value ? (
                      <button
                        type="button"
                        className="shrink-0 text-xs font-medium text-rose-600 hover:text-rose-700"
                        onClick={() => field.onChange("")}
                      >
                        Clear
                      </button>
                    ) : null}
                  </div>
                  <FormControl>
                    <div className="flex min-h-0 flex-1 flex-col">
                      <FileUpload
                        type="video"
                        accept="video/*"
                        placeholder={BOOK_FIELD_PLACEHOLDERS.videoUrl}
                        folder="books/videos"
                        variant="light"
                        layout="dropzone"
                        onFileChange={field.onChange}
                        value={field.value}
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Description | Summary — two columns responsive */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-6">
            <FormField
              control={form.control}
              name={"description"}
              render={({ field }) => (
                <FormItem className={fieldClass}>
                  <BookFormFieldLabel icon={BookText} required>
                    Book Description
                  </BookFormFieldLabel>
                  <FormControl>
                    <Textarea
                      placeholder={BOOK_FIELD_PLACEHOLDERS.description}
                      {...field}
                      rows={8}
                      className="book-form_input min-h-40"
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
                <FormItem className={fieldClass}>
                  <BookFormFieldLabel icon={BookOpenText} required>
                    Book Summary
                  </BookFormFieldLabel>
                  <FormControl>
                    <Textarea
                      placeholder={BOOK_FIELD_PLACEHOLDERS.summary}
                      {...field}
                      rows={8}
                      className="book-form_input min-h-40"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="border-t border-gray-200 pt-4 sm:pt-6">
            <TicketSectionHeader
              icon={<BookMarked className="size-4" aria-hidden />}
              title="Additional Information (Optional)"
              subtitle="ISBN, publisher, and catalog metadata"
              className="mb-4"
            />

            <div className="grid grid-cols-1 gap-4 sm:gap-6 md:grid-cols-2">
              <FormField
                control={form.control}
                name={"isbn"}
                render={({ field }) => (
                  <FormItem className={fieldClass}>
                    <BookFormFieldLabel icon={BookKey}>ISBN</BookFormFieldLabel>
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
                  <FormItem className={fieldClass}>
                    <BookFormFieldLabel icon={CalendarCheck2}>
                      Publication Year
                    </BookFormFieldLabel>
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
                            value === "" ? undefined : Number(value),
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
                  <FormItem className={fieldClass}>
                    <BookFormFieldLabel icon={BookOpenCheck}>
                      Publisher
                    </BookFormFieldLabel>
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
                  <FormItem className={fieldClass}>
                    <BookFormFieldLabel icon={Languages}>
                      Language
                    </BookFormFieldLabel>
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
                  <FormItem className={fieldClass}>
                    <BookFormFieldLabel icon={FormIcon}>
                      Page Count
                    </BookFormFieldLabel>
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
                            value === "" ? undefined : Number(value),
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
                  <FormItem className={fieldClass}>
                    <BookFormFieldLabel icon={ReceiptText}>
                      Edition
                    </BookFormFieldLabel>
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

            {/* Active + Featured — 2-col; plain labels; featured helper via Info tooltip */}
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6">
              <FormField
                control={form.control}
                name={"isActive"}
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center gap-2.5 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={(checked) =>
                          field.onChange(checked === true)
                        }
                      />
                    </FormControl>
                    <FormLabel className="cursor-pointer text-sm font-normal leading-none text-dark-500 sm:text-base">
                      Book is active and available for borrowing
                    </FormLabel>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name={"isFeatured"}
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center gap-2.5 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={(checked) =>
                          field.onChange(checked === true)
                        }
                      />
                    </FormControl>
                    <div className="inline-flex items-center gap-1.5 leading-none">
                      <FormLabel className="cursor-pointer text-sm font-normal leading-none text-dark-500 sm:text-base">
                        Feature on homepage
                      </FormLabel>
                      <TooltipProvider delayDuration={200}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              type="button"
                              className="inline-flex size-3.5 shrink-0 items-center justify-center p-0 text-gray-400 hover:text-gray-600"
                              aria-label="Featured book help"
                            >
                              <Info className="size-3.5" aria-hidden />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent
                            side="top"
                            className="max-w-xs text-xs"
                          >
                            Checking this replaces any currently featured book
                            as the homepage hero.
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>

          {/* Footer: detail-page LIGHT_GLASS_CTA DNA (same size as toolbar / catalog Edit) */}
          <div className="flex flex-wrap items-center justify-end gap-2 border-t border-gray-200 pt-4">
            <button
              type="button"
              disabled={isPending}
              onClick={goCancel}
              className={cn(
                LIGHT_GLASS_CTA.host,
                "border-gray-200 bg-white text-dark-400 hover:bg-gray-50",
              )}
            >
              <X className="size-3.5" aria-hidden />
              Cancel
            </button>
            <button
              type="submit"
              disabled={!isValid || isPending}
              aria-disabled={!isValid || isPending}
              className={cn(
                LIGHT_GLASS_CTA.host,
                LIGHT_GLASS_CTA.edit,
                (!isValid || isPending) && "pointer-events-none opacity-50",
              )}
            >
              {isPending ? (
                <Loader2 className="size-3.5 animate-spin" aria-hidden />
              ) : isCreate ? (
                <Plus className="size-3.5" aria-hidden />
              ) : (
                <Save className="size-3.5" aria-hidden />
              )}
              {isPending
                ? isCreate
                  ? "Adding book…"
                  : "Updating book…"
                : isCreate
                  ? "Add Book to Library"
                  : "Update Book"}
            </button>
          </div>
        </form>
      </Form>

      <BookFormConfirmDialog
        open={confirmOpen}
        onOpenChange={(open) => {
          if (!isPending) {
            setConfirmOpen(open);
            if (!open) setPendingValues(null);
          }
        }}
        mode={isCreate ? "create" : "update"}
        preview={confirmPreview}
        isPending={isPending}
        onConfirm={() => {
          void handleConfirm();
        }}
      />
    </>
  );
};

export default BookForm;
