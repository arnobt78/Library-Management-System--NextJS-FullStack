"use client";

// Parent: REQ-0028
import AuthForm from "@/components/AuthForm";
import AuthToastBridge from "@/components/AuthToastBridge";
import { signInWithCredentials } from "@/lib/actions/auth";
import { signInSchema } from "@/lib/validations";
import { useEffect } from "react";

export default function SignInFormPage() {
  useEffect(() => {
    document.cookie = "logout-in-progress=; path=/; max-age=0; SameSite=Lax";
  }, []);

  return (
    <>
      {/* Show logout toast after redirect from signOut (full navigation) */}
      <AuthToastBridge kinds={["logout"]} />
      <AuthForm
        type="SIGN_IN"
        schema={signInSchema}
        defaultValues={{ email: "", password: "" }}
        onSubmit={signInWithCredentials}
      />
    </>
  );
}
