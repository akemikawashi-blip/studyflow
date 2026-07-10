"use client";

import { useActionState } from "react";

import { signUpAction } from "@/features/auth/actions/auth";
import { initialAuthActionState } from "@/features/auth/schemas/auth";
import {
  AuthField,
  AuthMessage,
  AuthSubmitButton,
} from "@/features/auth/components/auth-form-parts";

export function SignUpForm() {
  const [state, action] = useActionState(
    signUpAction,
    initialAuthActionState,
  );

  return (
    <form action={action} className="space-y-5" noValidate>
      <AuthMessage state={state} />

      <AuthField
        label="Full name"
        name="fullName"
        type="text"
        autoComplete="name"
        placeholder="Your full name"
        error={state.fieldErrors?.fullName?.[0]}
        required
      />

      <AuthField
        label="Email address"
        name="email"
        type="email"
        autoComplete="email"
        placeholder="student@example.com"
        error={state.fieldErrors?.email?.[0]}
        required
      />

      <AuthField
        label="Password"
        name="password"
        type="password"
        autoComplete="new-password"
        placeholder="At least 8 characters"
        error={state.fieldErrors?.password?.[0]}
        required
      />

      <AuthField
        label="Confirm password"
        name="confirmPassword"
        type="password"
        autoComplete="new-password"
        placeholder="Repeat your password"
        error={state.fieldErrors?.confirmPassword?.[0]}
        required
      />

      <AuthSubmitButton>Create account</AuthSubmitButton>
    </form>
  );
}
