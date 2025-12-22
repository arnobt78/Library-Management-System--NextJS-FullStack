"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  DefaultValues,
  FieldValues,
  Path,
  SubmitHandler,
  useForm,
  UseFormReturn,
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
import { FIELD_NAMES, FIELD_TYPES } from "@/constants";
import FileUpload from "@/components/FileUpload";
import { showToast } from "@/lib/toast";
import { useRouter } from "next/navigation";

interface Props<T extends FieldValues> {
  schema: ZodType<T>;
  defaultValues: T;
  onSubmit: (data: T) => Promise<{ success: boolean; error?: string }>;
  type: "SIGN_IN" | "SIGN_UP";
}

const AuthForm = <T extends FieldValues>({
  type,
  schema,
  defaultValues,
  onSubmit,
}: Props<T>) => {
  const router = useRouter();

  const isSignIn = type === "SIGN_IN";
  const [selectedRole, setSelectedRole] = useState<string>("");

  const form: UseFormReturn<T> = useForm({
    resolver: zodResolver(schema),
    defaultValues: defaultValues as DefaultValues<T>,
  });

  // Test account credentials
  const testAccounts = {
    "guest-user": {
      email: "test@user.com",
      password: "12345678",
    },
    "guest-admin": {
      email: "test@admin.com",
      password: "12345678",
    },
  };

  const handleRoleSelect = (value: string) => {
    if (value === "clear") {
      setSelectedRole("");
      form.setValue("email" as Path<T>, "" as T[Path<T>]);
      form.setValue("password" as Path<T>, "" as T[Path<T>]);
    } else {
      setSelectedRole(value);
      const account = testAccounts[value as keyof typeof testAccounts];
      if (account) {
        form.setValue("email" as Path<T>, account.email as T[Path<T>]);
        form.setValue("password" as Path<T>, account.password as T[Path<T>]);
      }
    }
  };

  const handleSubmit: SubmitHandler<T> = async (data) => {
    const result = await onSubmit(data);

    if (result.success) {
      if (isSignIn) {
        showToast.auth.signInSuccess();
      } else {
        showToast.auth.signUpSuccess();
      }
      router.push("/");
    } else {
      showToast.error(
        "Authentication Error",
        result.error ?? "An unexpected error occurred. Please try again."
      );
    }
  };

  // Get form submission state for loading indicator
  const isSubmitting = form.formState.isSubmitting;

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold text-white">
        {isSignIn ? "Welcome back to BookWise" : "Create your library account"}
      </h1>
      <p className="text-light-100">
        {isSignIn
          ? "Access the vast collection of resources, and stay updated"
          : "Please complete all fields and upload a valid university ID to gain access to the library"}
      </p>
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(handleSubmit)}
          className="w-full space-y-6"
        >
          {/* Role Based Test Account Selector - Only for Sign In */}
          {isSignIn && (
            <div className="space-y-2">
              <FormLabel className="text-white">Select Test Account</FormLabel>
              <Select
                key={`select-${selectedRole || "empty"}`}
                value={selectedRole || undefined}
                onValueChange={handleRoleSelect}
              >
                <SelectTrigger className="form-input border-gray-600 bg-transparent text-white">
                  <SelectValue placeholder="Select Role Based Test Account" />
                </SelectTrigger>
                <SelectContent className="border-gray-600 bg-gray-800">
                  <SelectItem
                    value="guest-user"
                    className="cursor-pointer text-white focus:bg-gray-700 focus:text-white"
                  >
                    Guest User
                  </SelectItem>
                  <SelectItem
                    value="guest-admin"
                    className="cursor-pointer text-white focus:bg-gray-700 focus:text-white"
                  >
                    Guest Admin
                  </SelectItem>
                  {selectedRole && (
                    <SelectItem
                      value="clear"
                      className="cursor-pointer text-gray-400 opacity-60 focus:bg-gray-700 focus:text-gray-400"
                    >
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
              name={field as Path<T>}
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="capitalize">
                    {FIELD_NAMES[field.name as keyof typeof FIELD_NAMES]}
                  </FormLabel>
                  <FormControl>
                    {field.name === "universityCard" ? (
                      <FileUpload
                        type="image"
                        accept="image/*"
                        placeholder="Upload your ID"
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
                        {...field}
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
            {isSubmitting
              ? isSignIn
                ? "Signing in..."
                : "Signing up..."
              : isSignIn
                ? "Sign In"
                : "Sign Up"}
          </Button>
        </form>
      </Form>

      <p className="text-center text-base font-medium">
        {isSignIn ? "New to BookWise? " : "Already have an account? "}

        <Link
          href={isSignIn ? "/sign-up" : "/sign-in"}
          className="font-bold text-primary"
        >
          {isSignIn ? "Create an account" : "Sign in"}
        </Link>
      </p>
    </div>
  );
};
export default AuthForm;
