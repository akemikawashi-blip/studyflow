import { z } from "zod";

const optionalText = (max: number) => z.string().trim().max(max).transform((value) => value || null);
const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Enter a valid date.");

export const transactionInputSchema = z.object({
  transactionType: z.enum(["expense", "income"]),
  category: z.string().trim().min(1, "Category is required.").max(80),
  amount: z.number().positive("Amount must be greater than zero.").max(999999999),
  currency: z.string().trim().toUpperCase().regex(/^[A-Z]{3}$/, "Use a three-letter currency code."),
  transactionDate: dateSchema,
  description: optionalText(1000),
  paymentMethod: optionalText(80),
  recurring: z.boolean(),
});

export const transactionMutationSchema = transactionInputSchema.extend({ id: z.string().uuid() });

export const budgetInputSchema = z.object({
  budgetMonth: z.string().regex(/^\d{4}-\d{2}-01$/, "Choose a valid month."),
  category: optionalText(80),
  amount: z.number().positive("Budget amount must be greater than zero.").max(999999999),
  currency: z.string().trim().toUpperCase().regex(/^[A-Z]{3}$/, "Use a three-letter currency code."),
  alertThresholdPercent: z.number().int().min(1).max(100),
});

export const budgetMutationSchema = budgetInputSchema.extend({ id: z.string().uuid() });
export const idSchema = z.string().uuid();

export function transactionFormValues(formData: FormData) {
  return {
    transactionType: String(formData.get("transactionType") ?? "expense"),
    category: String(formData.get("category") ?? ""),
    amount: Number(String(formData.get("amount") ?? "0")),
    currency: String(formData.get("currency") ?? "BDT"),
    transactionDate: String(formData.get("transactionDate") ?? ""),
    description: String(formData.get("description") ?? ""),
    paymentMethod: String(formData.get("paymentMethod") ?? ""),
    recurring: formData.get("recurring") === "on",
  };
}

export function budgetFormValues(formData: FormData) {
  const month = String(formData.get("budgetMonth") ?? "");
  return {
    budgetMonth: month ? `${month}-01` : "",
    category: String(formData.get("category") ?? ""),
    amount: Number(String(formData.get("amount") ?? "0")),
    currency: String(formData.get("currency") ?? "BDT"),
    alertThresholdPercent: Number(String(formData.get("alertThresholdPercent") ?? "80")),
  };
}
