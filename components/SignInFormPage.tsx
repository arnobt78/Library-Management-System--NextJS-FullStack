"use client";

// Parent: REQ-0028
import { useEffect } from "react";
import AuthForm from "@/components/AuthForm";
import { signInWithCredentials } from "@/lib/actions/auth";
import { signInSchema } from "@/lib/validations";

export default function SignInFormPage() {
  useEffect(() => {
    document.cookie = "logout-in-progress=; path=/; max-age=0; SameSite=Lax";
  }, []);

  return <AuthForm type="SIGN_IN" schema={signInSchema} defaultValues={{ email: "", password: "" }} onSubmit={signInWithCredentials} />;
}
