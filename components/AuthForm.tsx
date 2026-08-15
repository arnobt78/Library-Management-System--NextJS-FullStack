"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  DefaultValues,
  FieldValues,
  Path,
  SubmitHandler,
  useForm,
} from "react-hook-form";
import { ZodType } from "zod";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import Link from "next/link";
import {
  FIELD_NAMES,
  FIELD_TYPES,
  FIELD_PLACEHOLDERS,
  TEST_ACCOUNTS,
} from "@/constants";
import FileUpload from "@/components/FileUpload";
import { showToast } from "@/lib/toast";
import { useRouter } from "next/navigation";
import UserAvatar from "@/components/UserAvatar";
import { Users, XIcon, Sparkles, Zap, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  setPendingAuthToast,
  type AccountStatusClaim,
} from "@/lib/auth/authToast";

type AuthFields = FieldValues & { email: string; password: string };

type AuthSubmitResult =
  | { success: true; accountStatus?: AccountStatusClaim }
  | { success: false; error?: string; fieldError?: string };

interface Props<TInput extends AuthFields, TOutput extends AuthFields> {
  schema: ZodType<TOutput, TInput>;
  defaultValues: DefaultValues<TInput>;
  onSubmit: (data: TOutput) => Promise<AuthSubmitResult>;
  type: "SIGN_IN" | "SIGN_UP";
}

const AuthForm = <TInput extends AuthFields, TOutput extends AuthFields>({
  type,
  schema,
  defaultValues,
  onSubmit,
}: Props<TInput, TOutput>) => {
  const router = useRouter();

  const isSignIn = type === "SIGN_IN";
  const [selectedRole, setSelectedRole] = useState<string>("");
  // Keep spinner visible through navigation so the button does not flash idle
  const [isNavigating, setIsNavigating] = useState(false);

  const form = useForm<TInput, unknown, TOutput>({
    resolver: zodResolver(schema),
    mode: "onChange",
    defaultValues,
  });

  // Signup: validate defaults so Sign Up stays disabled until fields pass Zod.
  useEffect(() => {
    if (!isSignIn) void form.trigger();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount-only for signup gate
  }, [isSignIn]);

  const { isValid } = form.formState;
  // Shared TEST_ACCOUNTS (constants) — fills email/password; name/image are display-only
  const selectedAccount = TEST_ACCOUNTS.find((a) => a.id === selectedRole);

  const handleRoleSelect = (value: string) => {
    if (value === "clear") {
      setSelectedRole("");
      form.setValue("email" as Path<TInput>, "" as TInput[Path<TInput>]);
      form.setValue("password" as Path<TInput>, "" as TInput[Path<TInput>]);
    } else {
      setSelectedRole(value);
      const account = TEST_ACCOUNTS.find((a) => a.id === value);
      if (account) {
        form.setValue(
          "email" as Path<TInput>,
          account.email as TInput[Path<TInput>],
        );
        form.setValue(
          "password" as Path<TInput>,
          account.password as TInput[Path<TInput>],
        );
      }
    }
  };

  const handleSubmit: SubmitHandler<TOutput> = async (data) => {
    const result = await onSubmit(data);

    if (result.success) {
      // Resolve a friendly display name for the deferred welcome toast
      const dataRecord = data as Record<string, unknown>;
      const signupName =
        typeof dataRecord.fullName === "string"
          ? dataRecord.fullName
          : undefined;
      const displayName =
        signupName?.trim() ||
        selectedAccount?.fullName ||
        TEST_ACCOUNTS.find((a) => a.email === data.email)?.fullName ||
        data.email.split("@")[0];

      // Defer welcome/signup (+ pending companion) until homepage mounts
      const accountStatus: AccountStatusClaim | undefined =
        result.accountStatus ?? (isSignIn ? undefined : "PENDING");
      setPendingAuthToast(
        isSignIn ? "welcome" : "signup",
        displayName,
        accountStatus,
      );
      setIsNavigating(true);
      router.push("/");
    } else {
      setIsNavigating(false);
      // Handle field-specific errors
      if (result.error && result.fieldError) {
        const fieldName = result.error as Path<TInput>;
        const errorMessage = result.fieldError;

        // Set field-specific error
        form.setError(fieldName, {
          type: "server",
          message: errorMessage,
        });

        // Also show toast for visibility
        showToast.error("Validation Error", errorMessage);
      } else {
        // Generic error
        showToast.error(
          "Authentication Error",
          result.error ?? "An unexpected error occurred. Please try again.",
        );
      }
    }
  };

  const isSubmitting = form.formState.isSubmitting || isNavigating;
  const signupSubmitDisabled = !isSignIn && (!isValid || isSubmitting);
  const submitDisabled = isSignIn ? isSubmitting : signupSubmitDisabled;

  return (
    <div className="flex flex-col gap-3 sm:gap-4">
      {/* Tight title/sub stack (GlassSectionHeader pattern); gap only before form */}
      <div className="min-w-0">
        <h1 className="text-xl font-medium leading-tight text-light-100 sm:text-xl">
          {isSignIn
            ? "Welcome back to BookWise"
            : "Create your library account"}
        </h1>
        <p className="text-sm leading-snug text-light-200 sm:text-base">
          {isSignIn
            ? "Use the Test Accounts dropdown for demo access. Browse & borrow as test@user.com; approve sign-ups and manage roles as test@admin.com (Admin → Sign-up Requests / All Users)."
            : "After you create an account you can browse the library. Borrowing and reservations require admin approval under Sign-up Requests (demo: sign in as test@admin.com). Include a valid university ID below."}
        </p>
      </div>

      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(handleSubmit)}
          className="w-full space-y-4 sm:space-y-6"
        >
          {/* Role Based Test Account Selector - Only for Sign In */}
          {isSignIn && (
            <div className="space-y-1.5 font-sans sm:space-y-2">
              <FormLabel className="text-sm text-white sm:text-base">
                Test Accounts To Login With
              </FormLabel>
              <Select
                key={`select-${selectedRole || "empty"}`}
                value={selectedRole || undefined}
                onValueChange={handleRoleSelect}
              >
                <SelectTrigger className="form-input h-auto min-h-14 border-gray-600 bg-transparent py-2 font-sans text-white">
                  {selectedAccount ? (
                    <div className="flex min-w-0 flex-1 items-center gap-2 text-left">
                      <UserAvatar
                        universityCard={selectedAccount.image}
                        fullName={selectedAccount.fullName}
                        email={selectedAccount.email}
                        size={36}
                        className="border border-gray-600"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-white">
                          {selectedAccount.fullName}
                        </p>
                        <p className="truncate text-xs text-light-200/70">
                          {selectedAccount.email}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center font-normal">
                      <Users className="mr-2 inline size-4" />
                      <SelectValue placeholder="Select Role Based Test Account" />
                    </div>
                  )}
                </SelectTrigger>
                <SelectContent className="border-gray-600 bg-gray-800 font-sans">
                  {TEST_ACCOUNTS.map((account) => (
                    <SelectItem
                      key={account.id}
                      value={account.id}
                      className="cursor-pointer py-2.5 text-white focus:bg-gray-700 focus:text-white"
                    >
                      <div className="flex items-center gap-2">
                        <UserAvatar
                          universityCard={account.image}
                          fullName={account.fullName}
                          email={account.email}
                          size={36}
                          className="border border-gray-600"
                        />
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-white">
                            {account.fullName}
                          </p>
                          <p className="truncate text-xs text-light-200/70">
                            {account.email}
                          </p>
                        </div>
                      </div>
                    </SelectItem>
                  ))}
                  {selectedRole && (
                    <SelectItem
                      value="clear"
                      className="cursor-pointer text-white opacity-70 focus:bg-gray-700 focus:text-white"
                    >
                      <XIcon className="mr-2 inline size-4" />
                      Clear Selection
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
          )}

          {Object.keys(defaultValues).map((field) => (
            <FormField
              key={field}
              control={form.control}
              name={field as Path<TInput>}
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-1 text-sm capitalize sm:text-base">
                    <span>
                      {FIELD_NAMES[field.name as keyof typeof FIELD_NAMES]}
                    </span>
                    {!isSignIn ? (
                      <span className="text-rose-400" aria-hidden>
                        *
                      </span>
                    ) : null}
                  </FormLabel>
                  <FormControl>
                    {field.name === "universityCard" ? (
                      <FileUpload
                        type="image"
                        accept="image/*"
                        placeholder={
                          FIELD_PLACEHOLDERS[
                            field.name as keyof typeof FIELD_PLACEHOLDERS
                          ] || "Upload your ID"
                        }
                        folder="ids"
                        variant="dark"
                        onFileChange={field.onChange}
                        value={
                          typeof field.value === "string" ? field.value : ""
                        }
                      />
                    ) : (
                      <Input
                        required
                        type={
                          FIELD_TYPES[field.name as keyof typeof FIELD_TYPES]
                        }
                        placeholder={
                          FIELD_PLACEHOLDERS[
                            field.name as keyof typeof FIELD_PLACEHOLDERS
                          ] || ""
                        }
                        {...field}
                        value={
                          field.value === undefined ||
                          field.value === null ||
                          field.value === 0
                            ? ""
                            : String(field.value)
                        }
                        onChange={(e) => {
                          const value = e.target.value;
                          // For number inputs, convert empty string to undefined
                          if (field.name === "universityId") {
                            field.onChange(
                              value === "" ? undefined : Number(value),
                            );
                          } else {
                            field.onChange(value);
                          }
                        }}
                        className="form-input"
                      />
                    )}
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          ))}

          <Button
            type="submit"
            className={cn(
              "form-btn",
              submitDisabled && "pointer-events-none opacity-50",
            )}
            disabled={submitDisabled}
          >            {isSubmitting ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                {isSignIn ? "Signing in..." : "Signing up..."}
              </>
            ) : isSignIn ? (
              <>
                <Sparkles className="size-4" />
                Sign In
              </>
            ) : (
              <>
                <Zap className="size-4" />
                Sign Up
              </>
            )}
          </Button>
        </form>
      </Form>

      <p className="text-center text-sm font-medium sm:text-base">
        {isSignIn ? "New to BookWise? " : "Already have an account? "}

        <Link
          href={isSignIn ? "/sign-up" : "/sign-in"}
          className="font-medium text-primary"
        >
          {isSignIn ? "Create an account" : "Sign in"}
        </Link>
      </p>
    </div>
  );
};
export default AuthForm;
