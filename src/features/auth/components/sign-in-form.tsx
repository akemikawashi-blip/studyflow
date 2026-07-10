"use client";

import Link from "next/link";
import { useActionState } from "react";

import { signInAction } from "@/features/auth/actions/auth";
import {
  initialAuthActionState,
  type AuthActionState,
} from "@/features/auth/schemas/auth";
import {
  AuthField,
  AuthMessage,
  AuthSubmitButton,
} from "@/features/auth/components/auth-form-parts";

type SignInFormProps = {
  nextPath?: string;
  initialMessage?: string;
};

export function SignInForm({
  nextPath,
  initialMessage,
}: SignInFormProps) {
  const initialState: AuthActionState = initialMessage
    ? { status: "success", message: initialMessage }
    : initialAuthActionState;
  const [state, action] = useActionState(signInAction, initialState);

  return (
    <form action={action} className="space-y-5" noValidate>
      <input type="hidden" name="next" value={nextPath ?? ""} />

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

      <div>
        <AuthField
          label="Password"
          name="password"
          type="password"
          autoComplete="current-password"
          placeholder="Enter your password"
          error={state.fieldErrors?.password?.[0]}
          required
        />
        <div className="mt-2 text-right">
          <Link
            href="/forgot-password"
            className="focus-ring rounded-md text-sm font-medium text-primary hover:underline"
          >
            Forgot password?
          </Link>
        </div>
      </div>

      <AuthSubmitButton>Sign in</AuthSubmitButton>
    </form>
  );
}
