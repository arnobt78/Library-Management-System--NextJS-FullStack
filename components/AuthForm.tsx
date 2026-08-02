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
import { useState } from "react";

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
import { setPendingAuthToast } from "@/lib/auth/authToast";

type AuthFields = FieldValues & { email: string; password: string };

interface Props<TInput extends AuthFields, TOutput extends AuthFields> {
  schema: ZodType<TOutput, TInput>;
  defaultValues: DefaultValues<TInput>;
  onSubmit: (
    data: TOutput,
  ) => Promise<
    { success: true } | { success: false; error?: string; fieldError?: string }
  >;
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
    defaultValues,
  });

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

      // Defer welcome toast until homepage mounts (avoids toast on auth page)
      setPendingAuthToast(isSignIn ? "welcome" : "signup", displayName);
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

  return (
    <div className="flex flex-col gap-3 sm:gap-4">
      <h1 className="text-xl font-semibold text-white sm:text-xl">
        {isSignIn ? "Welcome back to BookWise" : "Create your library account"}
      </h1>
      <p className="text-sm text-light-100 sm:text-base">
        {isSignIn
          ? "Access the vast collection of resources, and stay updated"
          : "Please complete all fields and upload a valid university ID to gain access to the library"}
      </p>
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
                    <div className="flex min-w-0 flex-1 items-center gap-2.5 text-left">
                      <UserAvatar
                        universityCard={selectedAccount.image}
                        fullName={selectedAccount.fullName}
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
                      <div className="flex items-center gap-2.5">
                        <UserAvatar
                          universityCard={account.image}
                          fullName={account.fullName}
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
                  <FormLabel className="text-sm capitalize sm:text-base">
                    {FIELD_NAMES[field.name as keyof typeof FIELD_NAMES]}
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

          <Button type="submit" className="form-btn" disabled={isSubmitting}>
            {isSubmitting ? (
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
          className="font-semibold text-primary"
        >
          {isSignIn ? "Create an account" : "Sign in"}
        </Link>
      </p>
    </div>
  );
};
export default AuthForm;
