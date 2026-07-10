"use server";

import { revalidatePath } from "next/cache";

import { budgetFormValues, budgetInputSchema, budgetMutationSchema, idSchema, transactionFormValues, transactionInputSchema, transactionMutationSchema } from "@/features/finance/schemas/finance";
import { requireUser } from "@/lib/auth/current-user";
import type { ActionState } from "@/lib/forms/action-state";
import { createClient } from "@/lib/supabase/server";

function errorState(message: string, fieldErrors?: Record<string, string[] | undefined>): ActionState {
  return { status: "error", message, fieldErrors };
}

function refreshFinance() {
  revalidatePath("/app/finance");
  revalidatePath("/app/dashboard");
  revalidatePath("/app/search");
}

export async function createTransactionAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const parsed = transactionInputSchema.safeParse(transactionFormValues(formData));
  if (!parsed.success) return errorState("Please correct the transaction form.", parsed.error.flatten().fieldErrors);
  const supabase = await createClient();
  const { error } = await supabase.from("transactions").insert({
    user_id: user.id,
    transaction_type: parsed.data.transactionType,
    category: parsed.data.category,
    amount: parsed.data.amount,
    currency: parsed.data.currency,
    transaction_date: parsed.data.transactionDate,
    description: parsed.data.description,
    payment_method: parsed.data.paymentMethod,
    recurring: parsed.data.recurring,
  });
  if (error) return errorState("The transaction could not be saved.");
  refreshFinance();
  return { status: "success", message: "Transaction recorded." };
}

export async function updateTransactionAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const parsed = transactionMutationSchema.safeParse({ id: formData.get("id"), ...transactionFormValues(formData) });
  if (!parsed.success) return errorState("Please correct the transaction form.", parsed.error.flatten().fieldErrors);
  const supabase = await createClient();
  const { error, count } = await supabase.from("transactions").update({
    transaction_type: parsed.data.transactionType,
    category: parsed.data.category,
    amount: parsed.data.amount,
    currency: parsed.data.currency,
    transaction_date: parsed.data.transactionDate,
    description: parsed.data.description,
    payment_method: parsed.data.paymentMethod,
    recurring: parsed.data.recurring,
  }, { count: "exact" }).eq("id", parsed.data.id).eq("user_id", user.id);
  if (error || count !== 1) return errorState("The transaction could not be updated.");
  refreshFinance();
  return { status: "success", message: "Transaction updated." };
}

export async function deleteTransactionAction(formData: FormData) {
  const user = await requireUser();
  const id = idSchema.safeParse(formData.get("id"));
  if (!id.success) return;
  const supabase = await createClient();
  await supabase.from("transactions").delete().eq("id", id.data).eq("user_id", user.id);
  refreshFinance();
}

export async function createBudgetAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const parsed = budgetInputSchema.safeParse(budgetFormValues(formData));
  if (!parsed.success) return errorState("Please correct the budget form.", parsed.error.flatten().fieldErrors);
  const supabase = await createClient();
  const { error } = await supabase.from("budgets").insert({
    user_id: user.id,
    budget_month: parsed.data.budgetMonth,
    category: parsed.data.category,
    amount: parsed.data.amount,
    currency: parsed.data.currency,
    alert_threshold_percent: parsed.data.alertThresholdPercent,
  });
  if (error) return errorState(error.code === "23505" ? "A budget already exists for this month and category." : "The budget could not be saved.");
  refreshFinance();
  return { status: "success", message: "Budget added." };
}

export async function updateBudgetAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const parsed = budgetMutationSchema.safeParse({ id: formData.get("id"), ...budgetFormValues(formData) });
  if (!parsed.success) return errorState("Please correct the budget form.", parsed.error.flatten().fieldErrors);
  const supabase = await createClient();
  const { error, count } = await supabase.from("budgets").update({
    budget_month: parsed.data.budgetMonth,
    category: parsed.data.category,
    amount: parsed.data.amount,
    currency: parsed.data.currency,
    alert_threshold_percent: parsed.data.alertThresholdPercent,
  }, { count: "exact" }).eq("id", parsed.data.id).eq("user_id", user.id);
  if (error || count !== 1) return errorState(error?.code === "23505" ? "A budget already exists for this month and category." : "The budget could not be updated.");
  refreshFinance();
  return { status: "success", message: "Budget updated." };
}

export async function deleteBudgetAction(formData: FormData) {
  const user = await requireUser();
  const id = idSchema.safeParse(formData.get("id"));
  if (!id.success) return;
  const supabase = await createClient();
  await supabase.from("budgets").delete().eq("id", id.data).eq("user_id", user.id);
  refreshFinance();
}
