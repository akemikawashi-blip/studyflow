import Link from "next/link";

import { AuthCard } from "@/features/auth/components/auth-card";
import { ResetPasswordForm } from "@/features/auth/components/reset-password-form";

export default function ResetPasswordPage() {
  return (
    <AuthCard
      title="Choose a new password"
      description="Use at least eight characters. The reset link must be opened in this browser first."
      footer={
        <Link
          href="/forgot-password"
          className="focus-ring rounded-md font-semibold text-primary hover:underline"
        >
          Request another link
        </Link>
      }
    >
      <ResetPasswordForm />
    </AuthCard>
  );
}
