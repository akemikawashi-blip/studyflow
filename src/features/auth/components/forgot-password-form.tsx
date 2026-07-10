"use client";

import { useActionState } from "react";

import { forgotPasswordAction } from "@/features/auth/actions/auth";
import { initialAuthActionState } from "@/features/auth/schemas/auth";
import {
  AuthField,
  AuthMessage,
  AuthSubmitButton,
} from "@/features/auth/components/auth-form-parts";

export function ForgotPasswordForm() {
  const [state, action] = useActionState(
    forgotPasswordAction,
    initialAuthActionState,
  );

  return (
    <form action={action} className="space-y-5" noValidate>
      <AuthMessage state={state} />

      <AuthField
        label="Email address"
        name="email"
        type="email"
        autoComplete="email"
        placeholder="student@example.com"
        error={state.fieldErrors?.email?.[0]}
        required
      />

      <AuthSubmitButton>Send reset link</AuthSubmitButton>
    </form>
  );
}
