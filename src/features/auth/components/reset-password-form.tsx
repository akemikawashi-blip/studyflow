"use client";

import { useActionState } from "react";

import { resetPasswordAction } from "@/features/auth/actions/auth";
import { initialAuthActionState } from "@/features/auth/schemas/auth";
import {
  AuthField,
  AuthMessage,
  AuthSubmitButton,
} from "@/features/auth/components/auth-form-parts";

export function ResetPasswordForm() {
  const [state, action] = useActionState(
    resetPasswordAction,
    initialAuthActionState,
  );

  return (
    <form action={action} className="space-y-5" noValidate>
      <AuthMessage state={state} />

      <AuthField
        label="New password"
        name="password"
        type="password"
        autoComplete="new-password"
        placeholder="At least 8 characters"
        error={state.fieldErrors?.password?.[0]}
        required
      />

      <AuthField
        label="Confirm new password"
        name="confirmPassword"
        type="password"
        autoComplete="new-password"
        placeholder="Repeat the password"
        error={state.fieldErrors?.confirmPassword?.[0]}
        required
      />

      <AuthSubmitButton>Update password</AuthSubmitButton>
    </form>
  );
}
