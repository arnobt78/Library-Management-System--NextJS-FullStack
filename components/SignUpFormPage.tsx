"use client";

// Parent: REQ-0028
import AuthForm from "@/components/AuthForm";
import { signUp } from "@/lib/actions/auth";
import { signUpSchema } from "@/lib/validations";

export default function SignUpFormPage() {
  return <AuthForm type="SIGN_UP" schema={signUpSchema} defaultValues={{ email: "", password: "", fullName: "", universityId: undefined, universityCard: "" }} onSubmit={signUp} />;
}
