"use client";

import { useActionState, useMemo, useState } from "react";
import { ArrowDownRight, ArrowUpRight, CircleDollarSign, Pencil, Plus, Trash2, WalletCards } from "lucide-react";

import { ActionMessage, FieldError, FormLabel, inputClass } from "@/components/forms/form-parts";
import { StatCard } from "@/components/shared/stat-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  createBudgetAction,
  createTransactionAction,
  deleteBudgetAction,
  deleteTransactionAction,
  updateBudgetAction,
  updateTransactionAction,
} from "@/features/finance/actions/finance-actions";
import { formatDate, formatMoney } from "@/lib/display";
import { initialActionState, type ActionState } from "@/lib/forms/action-state";
import { cn } from "@/lib/utils";
import type { Database } from "@/types/database.generated";

type Transaction = Database["public"]["Tables"]["transactions"]["Row"];
type Budget = Database["public"]["Tables"]["budgets"]["Row"];
type Section = "transactions" | "budgets";

function todayKey() {
  const date = new Date();
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60_000).toISOString().slice(0, 10);
}

function TransactionFields({ state, transaction, defaultCurrency }: { state: ActionState; transaction?: Transaction; defaultCurrency: string }) {
  const suffix = transaction?.id ?? "new";
  return (
    <div className="grid gap-4">
      <div className="grid gap-4 sm:grid-cols-4">
        <div>
          <FormLabel htmlFor={`transaction-type-${suffix}`}>Type</FormLabel>
          <select id={`transaction-type-${suffix}`} name="transactionType" defaultValue={transaction?.transaction_type ?? "expense"} className={inputClass}>
            <option value="expense">Expense</option><option value="income">Income</option>
          </select>
        </div>
        <div>
          <FormLabel htmlFor={`transaction-category-${suffix}`}>Category</FormLabel>
          <input id={`transaction-category-${suffix}`} name="category" defaultValue={transaction?.category ?? ""} className={inputClass} placeholder="Food, transport…" required />
          <FieldError state={state} field="category" />
        </div>
        <div>
          <FormLabel htmlFor={`transaction-amount-${suffix}`}>Amount</FormLabel>
          <input id={`transaction-amount-${suffix}`} name="amount" type="number" min="0.01" step="0.01" defaultValue={transaction?.amount ?? ""} className={inputClass} required />
          <FieldError state={state} field="amount" />
        </div>
        <div>
          <FormLabel htmlFor={`transaction-currency-${suffix}`}>Currency</FormLabel>
          <input id={`transaction-currency-${suffix}`} name="currency" defaultValue={transaction?.currency ?? defaultCurrency} maxLength={3} className={inputClass} required />
          <FieldError state={state} field="currency" />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <FormLabel htmlFor={`transaction-date-${suffix}`}>Date</FormLabel>
          <input id={`transaction-date-${suffix}`} name="transactionDate" type="date" defaultValue={transaction?.transaction_date ?? todayKey()} className={inputClass} required />
          <FieldError state={state} field="transactionDate" />
        </div>
        <div>
          <FormLabel htmlFor={`transaction-payment-${suffix}`}>Payment method</FormLabel>
          <input id={`transaction-payment-${suffix}`} name="paymentMethod" defaultValue={transaction?.payment_method ?? ""} className={inputClass} placeholder="Cash, bKash, card…" />
        </div>
        <label className="flex min-h-11 items-center gap-2 self-end text-sm font-medium"><input name="recurring" type="checkbox" defaultChecked={transaction?.recurring ?? false} className="size-4" />Recurring transaction</label>
      </div>
      <div>
        <FormLabel htmlFor={`transaction-description-${suffix}`}>Description</FormLabel>
        <textarea id={`transaction-description-${suffix}`} name="description" defaultValue={transaction?.description ?? ""} className={`${inputClass} min-h-20 py-3`} />
      </div>
    </div>
  );
}

function BudgetFields({ state, budget, defaultCurrency }: { state: ActionState; budget?: Budget; defaultCurrency: string }) {
  const suffix = budget?.id ?? "new";
  return (
    <div className="grid gap-4 sm:grid-cols-5">
      <div>
        <FormLabel htmlFor={`budget-month-${suffix}`}>Month</FormLabel>
        <input id={`budget-month-${suffix}`} name="budgetMonth" type="month" defaultValue={budget?.budget_month.slice(0, 7) ?? todayKey().slice(0, 7)} className={inputClass} required />
        <FieldError state={state} field="budgetMonth" />
      </div>
      <div>
        <FormLabel htmlFor={`budget-category-${suffix}`}>Category</FormLabel>
        <input id={`budget-category-${suffix}`} name="category" defaultValue={budget?.category ?? ""} className={inputClass} placeholder="Blank = overall" />
      </div>
      <div>
        <FormLabel htmlFor={`budget-amount-${suffix}`}>Amount</FormLabel>
        <input id={`budget-amount-${suffix}`} name="amount" type="number" min="0.01" step="0.01" defaultValue={budget?.amount ?? ""} className={inputClass} required />
        <FieldError state={state} field="amount" />
      </div>
      <div>
        <FormLabel htmlFor={`budget-currency-${suffix}`}>Currency</FormLabel>
        <input id={`budget-currency-${suffix}`} name="currency" defaultValue={budget?.currency ?? defaultCurrency} maxLength={3} className={inputClass} required />
      </div>
      <div>
        <FormLabel htmlFor={`budget-threshold-${suffix}`}>Alert at %</FormLabel>
        <input id={`budget-threshold-${suffix}`} name="alertThresholdPercent" type="number" min="1" max="100" defaultValue={budget?.alert_threshold_percent ?? 80} className={inputClass} required />
      </div>
    </div>
  );
}

function AddTransaction({ defaultCurrency }: { defaultCurrency: string }) {
  const [state, action, pending] = useActionState(createTransactionAction, initialActionState);
  return <details className="surface-panel rounded-card p-5" open><summary className="focus-ring flex min-h-11 cursor-pointer list-none items-center gap-2 rounded-xl font-semibold"><Plus className="size-5 text-primary" />Record transaction</summary><form action={action} className="mt-5 space-y-5"><ActionMessage state={state} /><TransactionFields state={state} defaultCurrency={defaultCurrency} /><Button type="submit" disabled={pending}>{pending ? "Saving…" : "Save transaction"}</Button></form></details>;
}

function EditTransaction({ transaction, defaultCurrency }: { transaction: Transaction; defaultCurrency: string }) {
  const [state, action, pending] = useActionState(updateTransactionAction, initialActionState);
  return <details className="mt-4 rounded-2xl border border-outline-variant/55 bg-background p-4"><summary className="focus-ring flex cursor-pointer list-none items-center gap-2 text-sm font-semibold text-primary"><Pencil className="size-4" />Edit</summary><form action={action} className="mt-4 space-y-4"><input type="hidden" name="id" value={transaction.id} /><ActionMessage state={state} /><TransactionFields state={state} transaction={transaction} defaultCurrency={defaultCurrency} /><Button type="submit" size="sm" disabled={pending}>{pending ? "Saving…" : "Save changes"}</Button></form></details>;
}

function AddBudget({ defaultCurrency }: { defaultCurrency: string }) {
  const [state, action, pending] = useActionState(createBudgetAction, initialActionState);
  return <details className="surface-panel rounded-card p-5" open><summary className="focus-ring flex min-h-11 cursor-pointer list-none items-center gap-2 rounded-xl font-semibold"><Plus className="size-5 text-primary" />Add budget</summary><form action={action} className="mt-5 space-y-5"><ActionMessage state={state} /><BudgetFields state={state} defaultCurrency={defaultCurrency} /><Button type="submit" disabled={pending}>{pending ? "Saving…" : "Save budget"}</Button></form></details>;
}

function EditBudget({ budget, defaultCurrency }: { budget: Budget; defaultCurrency: string }) {
  const [state, action, pending] = useActionState(updateBudgetAction, initialActionState);
  return <details className="mt-4 rounded-2xl border border-outline-variant/55 bg-background p-4"><summary className="focus-ring flex cursor-pointer list-none items-center gap-2 text-sm font-semibold text-primary"><Pencil className="size-4" />Edit</summary><form action={action} className="mt-4 space-y-4"><input type="hidden" name="id" value={budget.id} /><ActionMessage state={state} /><BudgetFields state={state} budget={budget} defaultCurrency={defaultCurrency} /><Button type="submit" size="sm" disabled={pending}>{pending ? "Saving…" : "Save changes"}</Button></form></details>;
}

export function FinanceManager({ transactions, budgets, defaultCurrency }: { transactions: Transaction[]; budgets: Budget[]; defaultCurrency: string }) {
  const [section, setSection] = useState<Section>("transactions");
  const monthKey = todayKey().slice(0, 7);
  const stats = useMemo(() => {
    const income = transactions.filter((item) => item.transaction_type === "income").reduce((sum, item) => sum + Number(item.amount), 0);
    const expense = transactions.filter((item) => item.transaction_type === "expense").reduce((sum, item) => sum + Number(item.amount), 0);
    const monthItems = transactions.filter((item) => item.transaction_date.startsWith(monthKey));
    const monthIncome = monthItems.filter((item) => item.transaction_type === "income").reduce((sum, item) => sum + Number(item.amount), 0);
    const monthExpense = monthItems.filter((item) => item.transaction_type === "expense").reduce((sum, item) => sum + Number(item.amount), 0);
    return { balance: income - expense, monthIncome, monthExpense };
  }, [transactions, monthKey]);
  const currentOverallBudget = budgets.find((budget) => budget.budget_month.startsWith(monthKey) && !budget.category);
  const budgetPercent = currentOverallBudget ? Math.min(100, Math.round((stats.monthExpense / Number(currentOverallBudget.amount)) * 100)) : 0;
  const monthlyExpenses = transactions.filter((item) => item.transaction_type === "expense" && item.transaction_date.startsWith(monthKey));
  const weeklyTotals = [0, 0, 0, 0, 0];
  monthlyExpenses.forEach((item) => { const day = Number(item.transaction_date.slice(8, 10)); weeklyTotals[Math.min(4, Math.floor((day - 1) / 7))] += Number(item.amount); });
  const maxWeek = Math.max(1, ...weeklyTotals);

  return (
    <div>
      <div className="grid gap-5 md:grid-cols-3">
        <StatCard label="Current balance" value={formatMoney(stats.balance, defaultCurrency)} note="All recorded income minus expenses" icon={WalletCards} />
        <StatCard label="Income this month" value={formatMoney(stats.monthIncome, defaultCurrency)} note="Current calendar month" icon={ArrowUpRight} tone="secondary" />
        <StatCard label="Expenses this month" value={formatMoney(stats.monthExpense, defaultCurrency)} note={currentOverallBudget ? `${budgetPercent}% of overall budget` : "No overall budget set"} icon={ArrowDownRight} tone="tertiary" />
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
        <Card>
          <CardHeader><div className="flex items-center justify-between gap-4"><CardTitle>Monthly spending</CardTitle><Badge>{new Intl.DateTimeFormat("en-US", { month: "long" }).format(new Date())}</Badge></div></CardHeader>
          <CardContent>
            <div className="flex h-64 items-end gap-4 border-b border-outline-variant/55 px-2">
              {weeklyTotals.map((amount, index) => <div key={index} className="flex h-full flex-1 flex-col justify-end gap-3"><div className="min-h-1 rounded-t-2xl bg-primary" style={{ height: `${Math.max(2, (amount / maxWeek) * 100)}%` }} title={formatMoney(amount, defaultCurrency)} /><span className="pb-3 text-center text-xs text-muted-foreground">W{index + 1}</span></div>)}
            </div>
          </CardContent>
        </Card>
        <Card className="p-5 sm:p-6">
          <h2 className="text-xl font-semibold">Budget status</h2>
          {currentOverallBudget ? <><p className="mt-2 text-sm text-muted-foreground">{formatMoney(stats.monthExpense, defaultCurrency)} spent of {formatMoney(Number(currentOverallBudget.amount), currentOverallBudget.currency)}</p><div className="mt-5 h-3 overflow-hidden rounded-full bg-surface-container-high"><div className={cn("h-full rounded-full", budgetPercent >= currentOverallBudget.alert_threshold_percent ? "bg-destructive" : "bg-secondary")} style={{ width: `${budgetPercent}%` }} /></div><p className="mt-2 text-right text-sm font-medium">{budgetPercent}%</p></> : <p className="mt-3 text-sm leading-6 text-muted-foreground">Add an overall monthly budget to track spending pressure here.</p>}
        </Card>
      </div>

      <div className="mt-6 flex gap-2" role="tablist">
        <button type="button" onClick={() => setSection("transactions")} className={cn("focus-ring min-h-11 rounded-full border px-5 text-sm font-semibold", section === "transactions" ? "border-primary bg-primary text-primary-foreground" : "border-outline-variant bg-background")}>Transactions</button>
        <button type="button" onClick={() => setSection("budgets")} className={cn("focus-ring min-h-11 rounded-full border px-5 text-sm font-semibold", section === "budgets" ? "border-primary bg-primary text-primary-foreground" : "border-outline-variant bg-background")}>Budgets</button>
      </div>

      {section === "transactions" ? <div className="mt-5 space-y-5"><AddTransaction defaultCurrency={defaultCurrency} />{transactions.length === 0 ? <div className="rounded-card border border-dashed border-outline-variant p-10 text-center text-sm text-muted-foreground">No transactions yet.</div> : transactions.map((item) => <Card key={item.id} className="p-5"><div className="flex items-start gap-4"><span className={cn("grid size-11 shrink-0 place-items-center rounded-2xl", item.transaction_type === "income" ? "bg-secondary-container text-on-secondary-container" : "bg-surface-container-high text-primary")}><CircleDollarSign className="size-5" /></span><div className="min-w-0 flex-1"><div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="font-semibold">{item.description || item.category}</h3><p className="mt-1 text-sm text-muted-foreground">{item.category} · {formatDate(item.transaction_date)}{item.payment_method ? ` · ${item.payment_method}` : ""}</p></div><div className="flex items-center gap-2"><span className={cn("font-semibold", item.transaction_type === "income" && "text-secondary")}>{item.transaction_type === "income" ? "+" : "−"}{formatMoney(Number(item.amount), item.currency)}</span><form action={deleteTransactionAction} onSubmit={(event) => { if (!window.confirm("Delete this transaction?")) event.preventDefault(); }}><input type="hidden" name="id" value={item.id} /><Button type="submit" variant="ghost" size="icon" className="text-destructive" aria-label="Delete transaction"><Trash2 className="size-4" /></Button></form></div></div>{item.recurring ? <Badge className="mt-3">Recurring</Badge> : null}<EditTransaction transaction={item} defaultCurrency={defaultCurrency} /></div></div></Card>)}</div> : null}

      {section === "budgets" ? <div className="mt-5 space-y-5"><AddBudget defaultCurrency={defaultCurrency} />{budgets.length === 0 ? <div className="rounded-card border border-dashed border-outline-variant p-10 text-center text-sm text-muted-foreground">No budgets yet.</div> : budgets.map((budget) => { const spent = transactions.filter((item) => item.transaction_type === "expense" && item.transaction_date.startsWith(budget.budget_month.slice(0, 7)) && (!budget.category || item.category.toLowerCase() === budget.category.toLowerCase())).reduce((sum, item) => sum + Number(item.amount), 0); const percent = Math.min(100, Math.round((spent / Number(budget.amount)) * 100)); return <Card key={budget.id} className="p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="font-semibold">{budget.category || "Overall budget"}</h3><p className="mt-1 text-sm text-muted-foreground">{formatDate(budget.budget_month, { month: "long", year: "numeric" })} · Alert at {budget.alert_threshold_percent}%</p></div><form action={deleteBudgetAction} onSubmit={(event) => { if (!window.confirm("Delete this budget?")) event.preventDefault(); }}><input type="hidden" name="id" value={budget.id} /><Button type="submit" variant="ghost" size="icon" className="text-destructive" aria-label="Delete budget"><Trash2 className="size-4" /></Button></form></div><p className="mt-4 text-sm">{formatMoney(spent, budget.currency)} of {formatMoney(Number(budget.amount), budget.currency)}</p><div className="mt-2 h-2 overflow-hidden rounded-full bg-surface-container-high"><div className={cn("h-full rounded-full", percent >= budget.alert_threshold_percent ? "bg-destructive" : "bg-primary")} style={{ width: `${percent}%` }} /></div><EditBudget budget={budget} defaultCurrency={defaultCurrency} /></Card>; })}</div> : null}
    </div>
  );
}
