import Link from "next/link";

import { AuthCard } from "@/features/auth/components/auth-card";
import { SignInForm } from "@/features/auth/components/sign-in-form";
import { getSafeRedirectPath } from "@/lib/auth/safe-redirect";

type LoginPageProps = {
  searchParams: Promise<{
    next?: string;
    message?: string;
    error?: string;
  }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const nextPath = getSafeRedirectPath(params.next, "/app/dashboard");
  const initialMessage =
    params.message === "password-updated"
      ? "Password updated successfully. Sign in with your new password."
      : params.error
        ? "The authentication link was invalid or expired."
        : undefined;

  return (
    <AuthCard
      title="Welcome back"
      description="Sign in to continue managing your academic life."
      footer={
        <>
          New to StudyFlow?{" "}
          <Link
            href="/signup"
            className="focus-ring rounded-md font-semibold text-primary hover:underline"
          >
            Create an account
          </Link>
        </>
      }
    >
      <SignInForm nextPath={nextPath} initialMessage={initialMessage} />
    </AuthCard>
  );
}
