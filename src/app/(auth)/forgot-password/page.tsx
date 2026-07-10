import Link from "next/link";

import { AuthCard } from "@/features/auth/components/auth-card";
import { ForgotPasswordForm } from "@/features/auth/components/forgot-password-form";

export default function ForgotPasswordPage() {
  return (
    <AuthCard
      title="Reset your password"
      description="Enter your email. For privacy, the result is the same whether or not an account exists."
      footer={
        <Link
          href="/login"
          className="focus-ring rounded-md font-semibold text-primary hover:underline"
        >
          Return to sign in
        </Link>
      }
    >
      <ForgotPasswordForm />
    </AuthCard>
  );
}
