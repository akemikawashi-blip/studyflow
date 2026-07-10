import Link from "next/link";

import { AuthCard } from "@/features/auth/components/auth-card";
import { SignUpForm } from "@/features/auth/components/sign-up-form";

export default function SignUpPage() {
  return (
    <AuthCard
      title="Create your account"
      description="Start with a secure student workspace. You can complete your academic profile after signing in."
      footer={
        <>
          Already registered?{" "}
          <Link
            href="/login"
            className="focus-ring rounded-md font-semibold text-primary hover:underline"
          >
            Sign in
          </Link>
        </>
      }
    >
      <SignUpForm />
    </AuthCard>
  );
}
