"use client";

import AuthForm from "@/components/AuthForm";
import { signUpSchema } from "@/lib/validations";
import { signUp } from "@/lib/actions/auth";

const Page = () => (
  <AuthForm
    type="SIGN_UP"
    // @ts-expect-error - signUpSchema uses z.preprocess which creates a ZodEffects type
    // with input type 'unknown', but AuthCredentials expects 'number'. The schema
    // correctly validates and transforms the input to number at runtime.
    schema={signUpSchema}
    defaultValues={{
      email: "",
      password: "",
      fullName: "",
      // @ts-expect-error - undefined is used to show placeholder, but type expects number.
      // The form component handles this and the schema validates it correctly.
      universityId: undefined,
      universityCard: "",
    }}
    onSubmit={signUp}
  />
);

export default Page;
