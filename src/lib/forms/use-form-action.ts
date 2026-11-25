"use client";

import { useState, type FormEvent } from "react";

import { initialActionState, type ActionState } from "@/lib/forms/action-state";

/**
 * Submits a form to a Server Action from an event handler, so a dialog can
 * close as soon as the save succeeds. The action itself revalidates the route.
 */
export function useFormAction(action: (state: ActionState, formData: FormData) => Promise<ActionState>, onSuccess?: () => void) {
  const [state, setState] = useState<ActionState>(initialActionState);
  const [pending, setPending] = useState(false);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (pending) return;
    setPending(true);
    try {
      const result = await action(state, new FormData(event.currentTarget));
      setState(result);
      if (result.status === "success") {
        onSuccess?.();
      }
    } catch {
      setState({ status: "error", message: "Não foi possível salvar. Verifique a conexão e tente novamente." });
    } finally {
      setPending(false);
    }
  };

  return { state, pending, onSubmit };
}
